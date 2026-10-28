import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../../services/tenant.service';
import { StaffService } from '../../../services/staff.service';
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

  // Credential generation modal for Tenant Admin
  public generatedCredentials = signal<{
    businessName: string;
    fullName: string;
    email: string;
    password: string;
  } | null>(null);
  public isGeneratingPassword = signal<boolean>(false);
  public copiedNotice = signal<boolean>(false);

  // Permanent Purge Confirmation Modal
  public showPurgeModal = signal<boolean>(false);
  public purgeInputSlug = signal<string>('');
  public isPurging = signal<boolean>(false);

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
    private staffService: StaffService,
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

  async generateOwnerPassword() {
    const t = this.tenant();
    if (!t || !t.ownerStaffId) {
      alert('No tenant administrator account found to reset.');
      return;
    }

    if (!confirm(`Generate a new temporary password for ${t.ownerName || t.ownerEmail}?\n\nThey will be required to change this password on their next login.`)) {
      return;
    }

    this.isGeneratingPassword.set(true);
    try {
      const res = await this.staffService.generatePassword(t.ownerStaffId);
      this.generatedCredentials.set({
        businessName: t.businessName,
        fullName: res.fullName || t.ownerName || 'Tenant Administrator',
        email: res.email || t.ownerEmail,
        password: res.generatedPassword
      });
    } catch (error: any) {
      console.error('Failed to generate password', error);
      alert(error?.error?.message || 'Failed to generate temporary password.');
    } finally {
      this.isGeneratingPassword.set(false);
    }
  }

  copyGeneratedCredentials() {
    const creds = this.generatedCredentials();
    if (!creds) return;
    const text = `RetailOS Tenant Admin Credentials\n` +
      `Business: ${creds.businessName}\n` +
      `Name: ${creds.fullName}\n` +
      `Email: ${creds.email}\n` +
      `Temporary Password: ${creds.password}\n\n` +
      `* Note: You will be required to change your password immediately upon your first login.`;
    navigator.clipboard.writeText(text);
    this.copiedNotice.set(true);
    setTimeout(() => this.copiedNotice.set(false), 3000);
  }

  closeCredentialsModal() {
    this.generatedCredentials.set(null);
  }

  async moveToBin() {
    const t = this.tenant();
    if (!t) return;

    if (!confirm(`Move "${t.businessName}" to the Recycle Bin?\n\nThis will deactivate the tenant organization and prevent staff from logging in. You can restore this tenant or permanently delete it later from the Bin.`)) {
      return;
    }

    try {
      await this.tenantService.deleteTenant(t.id);
      await this.contextService.loadTenants();
      this.router.navigate(['/app/tenants']);
    } catch (error: any) {
      console.error('Failed to move tenant to bin', error);
      alert(error?.error?.message || 'Failed to move tenant to bin.');
    }
  }

  async restoreTenant() {
    const t = this.tenant();
    if (!t) return;

    if (!confirm(`Restore "${t.businessName}" from the Recycle Bin?\n\nThe organization will be restored to active status.`)) {
      return;
    }

    try {
      await this.tenantService.restoreTenant(t.id);
      await this.loadDetails();
      await this.contextService.loadTenants();
    } catch (error: any) {
      console.error('Failed to restore tenant', error);
      alert(error?.error?.message || 'Failed to restore tenant.');
    }
  }

  async exportTenantCsv() {
    const t = this.tenant();
    if (!t) return;

    try {
      await this.tenantService.exportTenantCsv(t.id, t.slug);
    } catch (error: any) {
      console.error('Failed to export tenant CSV', error);
      alert('Failed to download tenant data export.');
    }
  }

  openPurgeModal() {
    this.purgeInputSlug.set('');
    this.showPurgeModal.set(true);
  }

  closePurgeModal() {
    this.purgeInputSlug.set('');
    this.showPurgeModal.set(false);
  }

  async confirmPurge() {
    const t = this.tenant();
    if (!t) return;

    if (this.purgeInputSlug().trim().toLowerCase() !== t.slug.toLowerCase()) {
      alert(`Slug does not match. Please type "${t.slug}" to confirm.`);
      return;
    }

    this.isPurging.set(true);
    try {
      await this.tenantService.purgeTenant(t.id);
      this.closePurgeModal();
      await this.contextService.loadTenants();
      alert(`Tenant "${t.businessName}" has been permanently purged.`);
      this.router.navigate(['/app/tenants']);
    } catch (error: any) {
      console.error('Failed to purge tenant', error);
      alert(error?.error?.message || 'Failed to permanently delete tenant.');
    } finally {
      this.isPurging.set(false);
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

  extendSubscription(days: number) {
    const base = this.subEdit.currentPeriodEnd ? new Date(this.subEdit.currentPeriodEnd) : new Date();
    const effectiveBase = isNaN(base.getTime()) || base.getTime() < Date.now() ? new Date() : base;
    effectiveBase.setDate(effectiveBase.getDate() + days);
    this.subEdit.currentPeriodEnd = effectiveBase.toISOString().split('T')[0];
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
