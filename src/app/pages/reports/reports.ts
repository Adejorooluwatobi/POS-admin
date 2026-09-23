import { Component, signal, computed, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService, TopSellingProduct, BusiestHour, ProfitMarginReport } from '../../services/analytics.service';
import { TillService } from '../../services/till.service';
import { StoreService } from '../../services/store.service';
import { TransactionService } from '../../services/transaction.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports.html'
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('velocityChart') velocityChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance?: Chart;

  // Active Tab: 'analytics' | 'z-reports' | 'margin'
  public activeTab = signal<'analytics' | 'z-reports' | 'margin'>('analytics');

  // Filter States
  public selectedStoreId = signal<string>('');
  public selectedRange = signal<string>('month'); // 'today' | 'week' | 'month' | 'year'
  public stores = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  // Live Data Signals
  public topProducts = signal<TopSellingProduct[]>([]);
  public busiestHours = signal<BusiestHour[]>([]);
  public profitMargin = signal<ProfitMarginReport | null>(null);
  public tillSessions = signal<any[]>([]);
  public transactions = signal<any[]>([]);

  // Fiscal Z-Report Inspection Modal
  public isZReportOpen = signal<boolean>(false);
  public selectedSession = signal<any | null>(null);

  // Computed KPIs
  public grossRevenue = computed(() => {
    const margin = this.profitMargin();
    if (margin && margin.totalRevenue > 0) return margin.totalRevenue;
    const txs = this.transactions();
    if (txs.length > 0) {
      return txs.reduce((sum, tx) => sum + (tx.amount || tx.totalAmount || 0), 0);
    }
    return 0;
  });

  public cogsTotal = computed(() => {
    return this.profitMargin()?.totalCostOfGoodsSold || 0;
  });

  public grossProfit = computed(() => {
    const margin = this.profitMargin();
    if (margin) return margin.grossProfit;
    return this.grossRevenue() - this.cogsTotal();
  });

  public marginPercentage = computed(() => {
    const margin = this.profitMargin();
    if (margin && margin.profitMarginPercentage) return margin.profitMarginPercentage;
    const rev = this.grossRevenue();
    if (rev > 0) {
      return ((this.grossProfit() / rev) * 100);
    }
    return 0;
  });

  public peakHour = computed(() => {
    const hours = this.busiestHours();
    if (!hours || hours.length === 0) return null;
    const sorted = [...hours].sort((a, b) => (b.totalRevenue || b.transactionCount) - (a.totalRevenue || a.transactionCount));
    const top = sorted[0];
    const h = top.hourOfDay;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return {
      label: `${displayHour}:00 ${ampm}`,
      count: top.transactionCount,
      revenue: top.totalRevenue
    };
  });

  constructor(
    private analyticsService: AnalyticsService,
    private tillService: TillService,
    private storeService: StoreService,
    private transactionService: TransactionService
  ) {}

  async ngOnInit() {
    await this.loadStores();
    await this.loadAllReportData();
  }

  ngAfterViewInit() {
    this.renderVelocityChart();
  }

  ngOnDestroy() {
    this.chartInstance?.destroy();
  }

  async loadStores() {
    try {
      const res = await this.storeService.getStores(1, 100);
      const items = res.items || res;
      this.stores.set(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error('Failed to load stores for report filtering', e);
    }
  }

  async loadAllReportData() {
    this.isLoading.set(true);
    const storeId = this.selectedStoreId() || undefined;

    // Date range calculations
    const now = new Date();
    let startDate: string | undefined;
    const endDate = now.toISOString();

    if (this.selectedRange() === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = todayStart.toISOString();
    } else if (this.selectedRange() === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekStart.toISOString();
    } else if (this.selectedRange() === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = monthStart.toISOString();
    } else if (this.selectedRange() === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      startDate = yearStart.toISOString();
    }

    try {
      // Fetch in parallel using firstValueFrom or observables
      const [topProdRes, busiestRes, marginRes, tillRes, txRes] = await Promise.allSettled([
        this.analyticsService.getTopSellingProducts(storeId, startDate, endDate, 10).toPromise(),
        this.analyticsService.getBusiestHours(storeId, startDate, endDate).toPromise(),
        this.analyticsService.getProfitMarginReport(storeId, startDate, endDate).toPromise(),
        this.tillService.getTillSessions(1, 50),
        this.transactionService.getTransactions(1, 100)
      ]);

      if (topProdRes.status === 'fulfilled' && topProdRes.value) {
        this.topProducts.set(topProdRes.value);
      }
      if (busiestRes.status === 'fulfilled' && busiestRes.value) {
        this.busiestHours.set(busiestRes.value);
      }
      if (marginRes.status === 'fulfilled' && marginRes.value) {
        this.profitMargin.set(marginRes.value);
      }
      if (tillRes.status === 'fulfilled' && tillRes.value) {
        const items = tillRes.value.items || tillRes.value;
        this.tillSessions.set(Array.isArray(items) ? items : []);
      }
      if (txRes.status === 'fulfilled' && txRes.value) {
        const items = txRes.value.items || txRes.value;
        this.transactions.set(Array.isArray(items) ? items : []);
      }

      // Re-render chart with live data
      setTimeout(() => this.renderVelocityChart(), 50);
    } catch (e) {
      console.error('Error fetching analytics reports', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFilterChange() {
    this.loadAllReportData();
  }

  renderVelocityChart() {
    if (!this.velocityChartCanvas) return;
    this.chartInstance?.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    const hours = this.busiestHours();
    let labels: string[] = [];
    let dataPoints: number[] = [];

    if (hours && hours.length > 0) {
      // Sort by hour 0 to 23
      const sorted = [...hours].sort((a, b) => a.hourOfDay - b.hourOfDay);
      labels = sorted.map(h => {
        const hr = h.hourOfDay;
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const displayHr = hr % 12 === 0 ? 12 : hr % 12;
        return `${displayHr}${ampm}`;
      });
      dataPoints = sorted.map(h => h.totalRevenue || 0);
    } else {
      // Fallback labels for hours of operational day (8 AM to 9 PM)
      labels = ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'];
      dataPoints = [0, 0, 0, 0, 0, 0, 0];
    }

    this.chartInstance = new Chart(this.velocityChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (₦)',
          data: dataPoints,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Revenue: ₦${Number(context.raw).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tickColor, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              font: { family: 'Inter', size: 11 },
              callback: (v) => {
                const val = Number(v);
                if (val >= 1e6) return '₦' + (val / 1e6).toFixed(1) + 'M';
                if (val >= 1e3) return '₦' + (val / 1e3).toFixed(0) + 'k';
                return '₦' + val;
              }
            }
          }
        }
      }
    });
  }

  // Fiscal Z-Report
  openZReport(session: any) {
    this.selectedSession.set(session);
    this.isZReportOpen.set(true);
  }

  closeZReport() {
    this.isZReportOpen.set(false);
    this.selectedSession.set(null);
  }

  printZReport() {
    window.print();
  }

  getStoreName(storeId: string): string {
    const s = this.stores().find(x => x.id === storeId);
    return s ? (s.name || s.code) : 'Main Flagship Store';
  }
}
