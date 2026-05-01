import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './stores.html'
})
export class StoresComponent implements OnInit {
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedStore = signal<Partial<Store>>({
    name: '',
    code: '',
    address: '',
    city: '',
    active: true,
    country: 'Nigeria',
    timezone: 'Africa/Lagos'
  });

  constructor(private storeService: StoreService, private authService: AuthService) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN');
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
    this.loadStores();
  }

  async loadStores() {
    this.isLoading.set(true);
    try {
      const data = await this.storeService.getStores();
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
    try {
      if (this.modalMode() === 'create') {
        await this.storeService.createStore(dto);
      } else if (this.modalMode() === 'edit' && storeData.id) {
        await this.storeService.updateStore(storeData.id, dto);
      }
      this.closeModal();
      this.loadStores();
    } catch (error) {
      console.error('Failed to save store', error);
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
