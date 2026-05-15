import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './stores.html'
})
export class StoresComponent implements OnInit {
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isSuperAdmin = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public tenants = signal<any[]>([]);
  public selectedTenantId = signal<string | null>(null);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public errorMessage = signal<string | null>(null);
  public selectedStore = signal<Partial<Store>>({
    name: '',
    code: '',
    address: '',
    city: '',
    active: true,
    country: 'Nigeria',
    timezone: 'Africa/Lagos'
  });

  constructor(
    private storeService: StoreService, 
    private authService: AuthService,
    private tenantService: TenantService,
    private route: ActivatedRoute
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN');
    this.isSuperAdmin.set(user?.role === 'SUPER_ADMIN');
  }

  async deleteStore(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this store? All historical data for this store will be affected.')) return;

    try {
      await this.storeService.deleteStore(id);
      this.loadStores();
    } catch (error: any) {
      console.error('Failed to delete store', error);
      alert(`Error deleting store: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tenantId']) {
        this.selectedTenantId.set(params['tenantId']);
      }
      this.loadStores();
    });

    if (this.isSuperAdmin()) {
      this.loadTenants();
    }
  }

  async loadTenants() {
    try {
      const data = await this.tenantService.getTenants();
      this.tenants.set(data.items || data);
    } catch (error) {
      console.error('Failed to load tenants', error);
    }
  }

  async loadStores() {
    this.isLoading.set(true);
    try {
      const data = await this.storeService.getStores(1, 50, this.selectedTenantId() || undefined);
      this.stores.set((data.items || data).map((s: any) => ({
        ...s,
        active: s.isActive !== undefined ? s.isActive : s.active
      }))); 
    } catch (error) {
      console.error('Failed to load stores', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.errorMessage.set(null);
    this.selectedStore.set({
      name: '',
      code: '',
      address: '',
      city: '',
      active: true,
      country: 'Nigeria',
      timezone: 'Africa/Lagos'
    });
    this.isModalOpen.set(true);
  }

  async openEditModal(store: Store) {
    this.modalMode.set('edit');
    this.errorMessage.set(null);
    this.selectedStore.set({ ...store });
    this.isModalOpen.set(true);
  }

  openViewModal(store: Store) {
    this.modalMode.set('view');
    this.selectedStore.set({ ...store });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveStore() {
    const storeData = this.selectedStore();
    const dto = {
      ...storeData,
      isActive: storeData.active
    };
    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      if (this.modalMode() === 'create') {
        await this.storeService.createStore(dto);
      } else if (this.modalMode() === 'edit' && storeData.id) {
        await this.storeService.updateStore(storeData.id, dto);
      }
      this.closeModal();
      this.loadStores();
    } catch (error: any) {
      // Extract the message from the API error response body
      const msg = error?.error?.message || error?.message || 'An unexpected error occurred. Please try again.';
      this.errorMessage.set(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleStoreStatus(store: Store) {
    if (!store.id) return;
    try {
      await this.storeService.updateStore(store.id, { ...store, isActive: !store.active });
      this.loadStores();
    } catch (error) {
      console.error('Failed to toggle store status', error);
    }
  }
}
