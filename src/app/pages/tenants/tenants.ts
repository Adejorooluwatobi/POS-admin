import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../services/tenant.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenants.html'
})
export class TenantsComponent implements OnInit {
  public tenants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public showCreateModal = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public statusFilter = signal<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  public totalTenants = computed(() => this.tenants().length);
  public activeTenants = computed(() => this.tenants().filter(t => t.isActive !== false).length);
  public suspendedTenants = computed(() => this.tenants().filter(t => t.isActive === false).length);
  public totalStoresQuotas = computed(() => this.tenants().reduce((sum, t) => sum + (t.maxStores || t.storesCount || 1), 0));

  public filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    let list = this.tenants();

    if (filter === 'ACTIVE') {
      list = list.filter(t => t.isActive !== false);
    } else if (filter === 'SUSPENDED') {
      list = list.filter(t => t.isActive === false);
    }

    if (!q) return list;

    return list.filter(t =>
      (t.businessName && t.businessName.toLowerCase().includes(q)) ||
      (t.slug && t.slug.toLowerCase().includes(q)) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(q)) ||
      (t.contactEmail && t.contactEmail.toLowerCase().includes(q))
    );
  });

  public newTenant = {
    businessName: '',
    slug: '',
    contactEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    maxStores: 1,
    maxStaff: 5,
    maxTerminals: 2
  };

  constructor(
    private tenantService: TenantService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  async loadTenants() {
    this.isLoading.set(true);
    try {
      const data = await this.tenantService.getTenants(1, 100);
      const items = data.items || data;
      this.tenants.set(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load tenants', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'SUSPENDED') {
    this.statusFilter.set(filter);
  }

  async createTenant() {
    if (!this.newTenant.businessName || !this.newTenant.slug) {
      alert('Business name and slug are required.');
      return;
    }

    this.isCreating.set(true);
    try {
      await this.tenantService.createTenant(this.newTenant);
      this.showCreateModal.set(false);
      this.loadTenants();
      this.resetNewTenant();
    } catch (error: any) {
      console.error('Failed to create tenant', error);
      alert(error?.error?.message || 'Error creating tenant. Please ensure slug is unique.');
    } finally {
      this.isCreating.set(false);
    }
  }

  resetNewTenant() {
    this.newTenant = {
      businessName: '',
      slug: '',
      contactEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
      maxStores: 1,
      maxStaff: 5,
      maxTerminals: 2
    };
  }

  async toggleStatus(tenant: any) {
    const newStatus = !tenant.isActive;
    const action = newStatus ? 'activate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} tenant "${tenant.businessName}"? This will affect all their stores and staff.`)) {
      return;
    }

    try {
      await this.tenantService.setTenantStatus(tenant.id, newStatus);
      this.loadTenants();
    } catch (error) {
      console.error('Failed to update tenant status', error);
      alert('Error updating status. Please check your permissions.');
    }
  }

  viewStores(tenant: any) {
    this.router.navigate(['/app/stores'], { queryParams: { tenantId: tenant.id } });
  }
}
