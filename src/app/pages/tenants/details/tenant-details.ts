import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../../services/tenant.service';
import { AuthService } from '../../../services/auth.service';
import { ContextService } from '../../../services/context.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tenant-details',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterModule],
  templateUrl: './tenant-details.html'
})
export class TenantDetailsComponent implements OnInit {
  public tenant = signal<any>(null);
  public isLoading = signal<boolean>(false);
  public isUpdatingSub = signal<boolean>(false);
  public showSubModal = signal<boolean>(false);

  // Tenant Editing
  public showEditTenantModal = signal<boolean>(false);
  public isUpdatingTenant = signal<boolean>(false);
  public tenantEdit = {
    businessName: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    country: 'Nigeria',
    isActive: true,
    logoUrl: ''
  };

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

  public subEdit = {
    plan: 0,
    status: 1,
    maxStores: 0,
    maxStaff: 0,
    maxTerminals: 0,
    monthlyPrice: 0,
    currentPeriodEnd: ''
  };

  constructor(
    private tenantService: TenantService,
    public contextService: ContextService,
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService
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
      
      if (data.subscription) {
        this.subEdit = {
          plan: data.subscription.plan ?? 0,
          status: data.subscription.status ?? 1,
          maxStores: data.subscription.maxStores ?? 1,
          maxStaff: data.subscription.maxStaff ?? 5,
          maxTerminals: data.subscription.maxTerminals ?? 2,
          monthlyPrice: data.subscription.monthlyPrice ?? 0,
          currentPeriodEnd: data.subscription.currentPeriodEnd
            ? data.subscription.currentPeriodEnd.split('T')[0]
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      } else {
        // No subscription yet — pre-fill with defaults so the modal is ready to create one
        this.subEdit = {
          plan: 0,
          status: 1,
          maxStores: 1,
          maxStaff: 5,
          maxTerminals: 2,
          monthlyPrice: 0,
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      }
    } catch (error) {
      console.error('Failed to load tenant details', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateSubscription() {
    this.isUpdatingSub.set(true);
    try {
      await this.tenantService.updateSubscription(this.tenant().id, this.subEdit);
      this.showSubModal.set(false);
      this.loadDetails();
    } catch (error) {
      console.error('Failed to update subscription', error);
      alert('Error updating subscription settings.');
    } finally {
      this.isUpdatingSub.set(false);
    }
  }

  openEditTenantModal() {
    const t = this.tenant();
    if (!t) return;
    this.tenantEdit = {
      businessName: t.businessName || '',
      slug: t.slug || '',
      contactEmail: t.contactEmail || '',
      contactPhone: t.contactPhone || '',
      country: t.country || 'Nigeria',
      isActive: t.isActive !== false,
      logoUrl: t.logoUrl || ''
    };
    this.showEditTenantModal.set(true);
  }

  async updateTenantInfo() {
    const t = this.tenant();
    if (!t) return;

    if (!this.tenantEdit.businessName?.trim()) {
      alert('Business name is required.');
      return;
    }

    if (!this.tenantEdit.slug?.trim()) {
      alert('Slug identifier is required.');
      return;
    }

    if (!this.tenantEdit.contactEmail?.trim()) {
      alert('Contact email is required.');
      return;
    }

    this.isUpdatingTenant.set(true);
    try {
      await this.tenantService.updateTenant(t.id, this.tenantEdit);
      this.showEditTenantModal.set(false);
      await this.loadDetails();
      // Refresh global context so header/sidebar update immediately if this tenant is active
      await this.contextService.loadTenants();
    } catch (error: any) {
      console.error('Failed to update tenant info', error);
      alert(error?.error?.message || 'Error updating tenant details. Ensure slug and email are unique.');
    } finally {
      this.isUpdatingTenant.set(false);
    }
  }

  viewStore(storeId: string) {
    this.router.navigate(['/app/stores', storeId]);
  }

  formatCurrency(val: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
  }
}
