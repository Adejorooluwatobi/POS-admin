import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../services/store.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-store-details',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './store-details.html'
})
export class StoreDetailsComponent implements OnInit {
  public store = signal<any>(null);
  public isLoading = signal<boolean>(false);

  // Filtering
  public selectedYear = signal<number>(new Date().getFullYear());
  public selectedMonth = signal<number | null>(null);
  public years = [2024, 2025, 2026];
  public months = [
    { v: 1, n: 'January' }, { v: 2, n: 'February' }, { v: 3, n: 'March' },
    { v: 4, n: 'April' }, { v: 5, n: 'May' }, { v: 6, n: 'June' },
    { v: 7, n: 'July' }, { v: 8, n: 'August' }, { v: 9, n: 'September' },
    { v: 10, n: 'October' }, { v: 11, n: 'November' }, { v: 12, n: 'December' }
  ];

  constructor(
    private storeService: StoreService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadDetails();
  }

  async loadDetails() {
    const id = this.route.snapshot.params['id'];
    if (!id) return;

    this.isLoading.set(true);
    try {
      const data = await this.storeService.getStoreDetails(
        id,
        this.selectedYear(),
        this.selectedMonth() || undefined
      );
      this.store.set(data);
    } catch (error) {
      console.error('Failed to load store details', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(val: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
  }
}
