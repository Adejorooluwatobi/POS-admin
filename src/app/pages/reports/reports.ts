import { Component, signal, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html'
})
export class ReportsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('monthChart') monthChartCanvas!: ElementRef<HTMLCanvasElement>;
  private monthChart?: Chart;

  public reportCards = [
    { icon: '📋', title: 'Z-Report (EOD)', desc: 'End-of-day summary per terminal' },
    { icon: '📈', title: 'Sales Report', desc: 'Revenue, transactions, AOV by staff' },
    { icon: '📦', title: 'Inventory Report', desc: 'Stock movement & shrinkage' },
  ];

  constructor() {}

  ngAfterViewInit() {
    this.renderChart();
  }

  renderChart() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? '#3d5870' : '#94a3b8';
    const gridColor = isDark ? '#1e2d40' : '#e8edf3';

    if (this.monthChartCanvas) {
      this.monthChart = new Chart(this.monthChartCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            data: [18500000, 21000000, 19800000, 24500000, 22100000, 25400000],
            borderColor: '#0284c7',
            backgroundColor: 'rgba(0,194,255,.05)',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: tickColor } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: v => '₦' + (Number(v) / 1e6).toFixed(1) + 'M' } }
          }
        }
      });
    }
  }

  ngOnDestroy() {
    this.monthChart?.destroy();
  }
}
