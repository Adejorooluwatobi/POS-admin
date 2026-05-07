import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../../services/tenant.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-tenant-details',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './tenant-details.html'
})
export class TenantDetailsComponent implements OnInit {
  public tenant = signal<any>(null);
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
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDetails();
  }

  async loadDetails() {
    const id = this.route.snapshot.params['id'];
    if (!id) return;

    this.isLoading.set(true);
    try {
      const data = await this.tenantService.getTenantDetails(
        id, 
        this.selectedYear(), 
        this.selectedMonth() || undefined
      );
      this.tenant.set(data);
    } catch (error) {
      console.error('Failed to load tenant details', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  viewStore(storeId: string) {
    this.router.navigate(['/app/stores', storeId]);
  }

  formatCurrency(val: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
  }
}
