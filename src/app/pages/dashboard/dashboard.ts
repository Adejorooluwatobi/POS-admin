import { Component, AfterViewInit, signal, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
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
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('revChart') revChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mixChart') mixChartCanvas!: ElementRef<HTMLCanvasElement>;

  private revChart?: Chart;
  private mixChart?: Chart;

  public totalRevenue = signal<number>(0);
  public totalTx = signal<number>(0);
  public activeStores = signal<number>(0);
  public storeEntries: { key: string; value: Store }[] = [];

  constructor(
    public dataService: DataService,
    public authService: AuthService
  ) {
    this.calculateKpis();
    this.storeEntries = Object.entries(this.dataService.stores).map(([key, value]) => ({ key, value }));
  }

  calculateKpis() {
    const stores = Object.values(this.dataService.stores);
    this.totalRevenue.set(stores.reduce((acc, s) => acc + s.todayRevenue, 0));
    this.totalTx.set(stores.reduce((acc, s) => acc + s.txCount, 0));
    this.activeStores.set(stores.filter(s => s.active).length);
  }

  formatNum(n: number): string {
    return n.toLocaleString('en-NG');
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  renderCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const accentColor = isDark ? '#00c2ff' : '#0284c7';
    const gridColor = isDark ? '#1e2d40' : '#e8edf3';
    const tickColor = isDark ? '#3d5870' : '#94a3b8';

    if (this.revChartCanvas?.nativeElement) {
      this.revChart = new Chart(this.revChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            data: [620000, 580000, 710000, 650000, 820000, 980000, 842500],
            backgroundColor: accentColor + 'cc',
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
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
