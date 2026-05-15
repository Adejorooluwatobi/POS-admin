import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../services/tenant.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './tenants.html'
})
export class TenantsComponent implements OnInit {
  public tenants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public showCreateModal = signal<boolean>(false);

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
      const data = await this.tenantService.getTenants();
      this.tenants.set(data.items || data);
    } catch (error) {
      console.error('Failed to load tenants', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createTenant() {
    this.isCreating.set(true);
    try {
      await this.tenantService.createTenant(this.newTenant);
      this.showCreateModal.set(false);
      this.loadTenants();
      this.resetNewTenant();
    } catch (error) {
      console.error('Failed to create tenant', error);
      alert('Error creating tenant. Please ensure slug is unique.');
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
    
    if (!confirm(`Are you sure you want to ${action} this tenant? This will affect all their stores and staff.`)) {
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
