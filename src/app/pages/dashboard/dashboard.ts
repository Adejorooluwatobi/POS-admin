import { Component, AfterViewInit, signal, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { Store } from '../../models/pos.models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revChart') revChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mixChart') mixChartCanvas!: ElementRef<HTMLCanvasElement>;

  private revChart?: Chart;
  private mixChart?: Chart;

  public totalRevenue = signal<number>(0);
  public totalTx = signal<number>(0);
  public activeStoresCount = signal<number>(0);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);

  constructor(
    private storeService: StoreService,
    private transactionService: TransactionService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser();
      const role = user?.role;

      const storesData = await this.storeService.getStores();
      const storesList = storesData.items || storesData;
      this.stores.set(storesList);
      
      if (role === 'CASHIER' || role === 'SUPERVISOR') {
        // PERSONAL VIEW: Only see own sales
        const txData = await this.transactionService.getTransactions(1, 1000);
        const txList = txData.items || txData;
        
        // Filter by name or ID
        const myTx = txList.filter((t: any) => t.cashier === user?.name || t.cashierId === user?.sub);
        
        this.totalTx.set(myTx.length);
        this.totalRevenue.set(myTx.reduce((acc: number, t: any) => acc + (t.grandTotal || t.totalAmount || 0), 0));
        this.activeStoresCount.set(1);
      } else {
        // ADMIN/MANAGER VIEW: See store/tenant totals
        this.activeStoresCount.set(storesList.filter((s: any) => s.active || s.isActive).length);
        this.totalRevenue.set(storesList.reduce((acc: number, s: any) => acc + (s.todayRevenue || 0), 0));
        this.totalTx.set(storesList.reduce((acc: number, s: any) => acc + (s.txCount || 0), 0));
        
        if (this.totalTx() === 0) {
          const txData = await this.transactionService.getTransactions(1, 100);
          const txList = txData.items || txData;
          this.totalTx.set(txList.length);
          this.totalRevenue.set(txList.reduce((acc: number, t: any) => acc + (t.grandTotal || t.totalAmount || 0), 0));
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      this.isLoading.set(false);
      this.renderCharts();
    }
  }

  formatNum(n: number): string {
    return n.toLocaleString('en-NG');
  }

  ngAfterViewInit() {
    // Charts are rendered after data is loaded in loadData()
  }

  renderCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const accentColor = isDark ? '#00c2ff' : '#0284c7';
    const gridColor = isDark ? '#1e2d40' : '#e8edf3';
    const tickColor = isDark ? '#3d5870' : '#94a3b8';

    if (this.revChart) this.revChart.destroy();
    if (this.mixChart) this.mixChart.destroy();

    if (this.revChartCanvas?.nativeElement) {
      this.revChart = new Chart(this.revChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            data: [620000, 580000, 710000, 650000, 820000, 980000, this.totalRevenue()],
            backgroundColor: accentColor + 'cc',
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 }, callback: v => '₦' + (Number(v) / 1000) + 'k' } }
          }
        }
      });
    }

    if (this.mixChartCanvas?.nativeElement) {
      this.mixChart = new Chart(this.mixChartCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Cash', 'Card', 'Mobile', 'Gift'],
          datasets: [{
            data: [42, 35, 18, 5],
            backgroundColor: ['#0284c7', '#059669', '#f5a623', '#7c3aed'],
            borderWidth: 0,
            hoverOffset: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: tickColor, font: { size: 10 }, boxWidth: 9, padding: 10 } } },
          cutout: '65%'
        }
      });
    }
  }

  ngOnDestroy() {
    this.revChart?.destroy();
    this.mixChart?.destroy();
  }
}
