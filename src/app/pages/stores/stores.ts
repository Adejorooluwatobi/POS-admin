import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './stores.html'
})
export class StoresComponent implements OnInit {
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isSuperAdmin = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public tenants = signal<any[]>([]);
  public selectedTenantId = signal<string | null>(null);

  public searchQuery = signal<string>('');
  public statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  public totalStores = computed(() => this.stores().length);
  public activeStores = computed(() => this.stores().filter(s => s.active !== false).length);
  public totalRevenue = computed(() => this.stores().reduce((sum, s) => sum + (s.todayRevenue || 0), 0));
  public totalStaff = computed(() => this.stores().reduce((sum, s) => sum + (s.staff || 0), 0));

  public filteredStores = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    let list = this.stores();

    if (filter === 'ACTIVE') {
      list = list.filter(s => s.active !== false);
    } else if (filter === 'INACTIVE') {
      list = list.filter(s => s.active === false);
    }

    if (!q) return list;

    return list.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    );
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

  async ngOnInit() {
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
      const raw = data.items || data;
      this.tenants.set(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Failed to load tenants', error);
    }
  }

  async loadStores() {
    this.isLoading.set(true);
    try {
      const data = await this.storeService.getStores(1, 100, this.selectedTenantId() || undefined);
      const items = data.items || data;
      const rawList = Array.isArray(items) ? items : [];
      this.stores.set(rawList.map((s: any) => ({
        ...s,
        active: s.isActive !== undefined ? s.isActive : (s.active !== undefined ? s.active : true)
      }))); 
    } catch (error) {
      console.error('Failed to load stores', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE') {
    this.statusFilter.set(filter);
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

  async deleteStore(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this store branch? All terminals, till shifts, and local inventory records will be affected.')) return;

    try {
      await this.storeService.deleteStore(id);
      this.loadStores();
    } catch (error: any) {
      console.error('Failed to delete store', error);
      alert(`Error deleting store: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
