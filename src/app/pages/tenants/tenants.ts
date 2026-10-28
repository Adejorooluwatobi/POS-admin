import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../services/tenant.service';
import { ContextService } from '../../services/context.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenants.html'
})
export class TenantsComponent implements OnInit {
  public tenants = signal<any[]>([]);
  public binTenants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public showCreateModal = signal<boolean>(false);

  // Auto-generated credentials modal
  public generatedCredentials = signal<{
    businessName: string;
    slug: string;
    email: string;
    password: string;
  } | null>(null);
  public copiedNotice = signal<boolean>(false);

  // Edit Tenant
  public showEditModal = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);
  public editingTenantId: string | null = null;
  public editTenant = {
    businessName: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    country: 'Nigeria',
    isActive: true,
    logoUrl: ''
  };

  // Permanent Purge Confirmation Modal
  public showPurgeModal = signal<boolean>(false);
  public tenantToPurge = signal<any | null>(null);
  public purgeInputSlug = signal<string>('');
  public isPurging = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public statusFilter = signal<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BIN'>('ALL');

  public totalTenants = computed(() => this.tenants().length);
  public activeTenants = computed(() => this.tenants().filter(t => t.isActive !== false).length);
  public suspendedTenants = computed(() => this.tenants().filter(t => t.isActive === false).length);
  public binCount = computed(() => this.binTenants().length);
  public totalStoresQuotas = computed(() => this.tenants().reduce((sum, t) => sum + (t.maxStores || t.storesCount || 1), 0));

  public filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    
    let list: any[];
    if (filter === 'BIN') {
      list = this.binTenants();
    } else {
      list = this.tenants();
      if (filter === 'ACTIVE') {
        list = list.filter(t => t.isActive !== false);
      } else if (filter === 'SUSPENDED') {
        list = list.filter(t => t.isActive === false);
      }
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
    maxStores: 1,
    maxStaff: 5,
    maxTerminals: 2,
    plan: 0, // 0 = Starter, 1 = Pro, 2 = Enterprise
    durationType: '30_DAYS', // 14_DAYS, 30_DAYS, 60_DAYS, 90_DAYS, 1_YEAR, CUSTOM
    customExpiryDate: '',
    isTrial: true
  };

  constructor(
    private tenantService: TenantService,
    public contextService: ContextService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  async loadTenants() {
    this.isLoading.set(true);
    try {
      const [tenantsData, binData] = await Promise.all([
        this.tenantService.getTenants(1, 100),
        this.tenantService.getTenantsBin(1, 100)
      ]);
      const items = tenantsData.items || tenantsData;
      this.tenants.set(Array.isArray(items) ? items : []);

      const binItems = binData.items || binData;
      this.binTenants.set(Array.isArray(binItems) ? binItems : []);
    } catch (error) {
      console.error('Failed to load tenants', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BIN') {
    this.statusFilter.set(filter);
  }

  async createTenant() {
    if (!this.newTenant.businessName || !this.newTenant.slug) {
      alert('Business name and slug are required.');
      return;
    }

    this.isCreating.set(true);
    try {
      const res = await this.tenantService.createTenant(this.newTenant);
      this.showCreateModal.set(false);
      this.loadTenants();

      // Show auto-generated credentials modal
      if (res && res.generatedPassword) {
        this.generatedCredentials.set({
          businessName: res.businessName || this.newTenant.businessName,
          slug: res.slug || this.newTenant.slug,
          email: res.ownerEmail || this.newTenant.adminEmail,
          password: res.generatedPassword
        });
      }

      this.resetNewTenant();
    } catch (error: any) {
      console.error('Failed to create tenant', error);
      alert(error?.error?.message || 'Error creating tenant. Please ensure slug is unique.');
    } finally {
      this.isCreating.set(false);
    }
  }

  copyCredentials() {
    const creds = this.generatedCredentials();
    if (!creds) return;
    const text = `RetailOS Tenant Credentials\n` +
      `Business: ${creds.businessName}\n` +
      `Slug: ${creds.slug}\n` +
      `Admin Email: ${creds.email}\n` +
      `Temporary Password: ${creds.password}\n\n` +
      `* Note: You will be required to change your password immediately upon your first login.`;
    navigator.clipboard.writeText(text);
    this.copiedNotice.set(true);
    setTimeout(() => this.copiedNotice.set(false), 3000);
  }

  closeCredentialsModal() {
    this.generatedCredentials.set(null);
  }

  resetNewTenant() {
    this.newTenant = {
      businessName: '',
      slug: '',
      contactEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      maxStores: 1,
      maxStaff: 5,
      maxTerminals: 2,
      plan: 0,
      durationType: '30_DAYS',
      customExpiryDate: '',
      isTrial: true
    };
  }

  getSubscriptionInfo(tenant: any): { text: string; badgeClass: string; isExpired: boolean } {
    if (!tenant.subscription) {
      return { text: 'Active Plan', badgeClass: 'badge-green', isExpired: false };
    }

    const sub = tenant.subscription;
    const isCancelledOrSuspended = sub.status === 'Cancelled' || sub.status === 'Suspended' || sub.status === 3 || sub.status === 4;

    if (isCancelledOrSuspended) {
      return { text: 'Suspended', badgeClass: 'badge-red', isExpired: true };
    }

    if (sub.currentPeriodEnd) {
      const diffMs = new Date(sub.currentPeriodEnd).getTime() - Date.now();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (days <= 0) {
        return { text: 'Subscription Expired', badgeClass: 'badge-red', isExpired: true };
      } else if (days <= 7) {
        return { text: `Expiring: ${days}d left`, badgeClass: 'badge-amber', isExpired: false };
      } else {
        const isTrial = sub.status === 'Trial' || sub.status === 0;
        return { text: `${isTrial ? 'Trial: ' : ''}${days}d remaining`, badgeClass: 'badge-green', isExpired: false };
      }
    }

    return { text: 'Active Plan', badgeClass: 'badge-green', isExpired: false };
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

  async moveToBin(tenant: any) {
    if (!confirm(`Move "${tenant.businessName}" to the Recycle Bin?\n\nThis will deactivate the tenant organization and prevent staff from logging in. You can restore this tenant or permanently delete it later from the Bin.`)) {
      return;
    }

    try {
      await this.tenantService.deleteTenant(tenant.id);
      await this.loadTenants();
      await this.contextService.loadTenants();
    } catch (error: any) {
      console.error('Failed to move tenant to bin', error);
      alert(error?.error?.message || 'Failed to move tenant to bin.');
    }
  }

  async restoreTenant(tenant: any) {
    if (!confirm(`Restore "${tenant.businessName}" from the Recycle Bin?\n\nThe organization will be restored to active status.`)) {
      return;
    }

    try {
      await this.tenantService.restoreTenant(tenant.id);
      await this.loadTenants();
      await this.contextService.loadTenants();
    } catch (error: any) {
      console.error('Failed to restore tenant', error);
      alert(error?.error?.message || 'Failed to restore tenant.');
    }
  }

  async exportTenantCsv(tenant: any) {
    try {
      await this.tenantService.exportTenantCsv(tenant.id, tenant.slug);
    } catch (error: any) {
      console.error('Failed to export tenant CSV', error);
      alert('Failed to download tenant data export.');
    }
  }

  openPurgeModal(tenant: any) {
    this.tenantToPurge.set(tenant);
    this.purgeInputSlug.set('');
    this.showPurgeModal.set(true);
  }

  closePurgeModal() {
    this.tenantToPurge.set(null);
    this.purgeInputSlug.set('');
    this.showPurgeModal.set(false);
  }

  async confirmPurge() {
    const t = this.tenantToPurge();
    if (!t) return;

    if (this.purgeInputSlug().trim().toLowerCase() !== t.slug.toLowerCase()) {
      alert(`Slug does not match. Please type "${t.slug}" to confirm.`);
      return;
    }

    this.isPurging.set(true);
    try {
      await this.tenantService.purgeTenant(t.id);
      this.closePurgeModal();
      await this.loadTenants();
      await this.contextService.loadTenants();
      alert(`Tenant "${t.businessName}" and all associated data have been permanently purged.`);
    } catch (error: any) {
      console.error('Failed to purge tenant', error);
      alert(error?.error?.message || 'Failed to permanently delete tenant.');
    } finally {
      this.isPurging.set(false);
    }
  }

  openEditModal(tenant: any) {
    this.editingTenantId = tenant.id;
    this.editTenant = {
      businessName: tenant.businessName || '',
      slug: tenant.slug || '',
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      country: tenant.country || 'Nigeria',
      isActive: tenant.isActive !== false,
      logoUrl: tenant.logoUrl || ''
    };
    this.showEditModal.set(true);
  }

  async updateTenant() {
    if (!this.editingTenantId) return;

    if (!this.editTenant.businessName?.trim()) {
      alert('Business name is required.');
      return;
    }

    if (!this.editTenant.slug?.trim()) {
      alert('Slug identifier is required.');
      return;
    }

    if (!this.editTenant.contactEmail?.trim()) {
      alert('Contact email is required.');
      return;
    }

    this.isUpdating.set(true);
    try {
      await this.tenantService.updateTenant(this.editingTenantId, this.editTenant);
      this.showEditModal.set(false);
      this.editingTenantId = null;
      await this.loadTenants();
      await this.contextService.loadTenants();
    } catch (error: any) {
      console.error('Failed to update tenant', error);
      alert(error?.error?.message || 'Error updating tenant. Ensure slug and email are unique.');
    } finally {
      this.isUpdating.set(false);
    }
  }

  async selectTenant(tenant: any) {
    await this.contextService.switchTenant(tenant.id);
  }

  async viewStores(tenant: any) {
    await this.contextService.switchTenant(tenant.id);
    this.router.navigate(['/app/stores'], { queryParams: { tenantId: tenant.id } });
  }
}
