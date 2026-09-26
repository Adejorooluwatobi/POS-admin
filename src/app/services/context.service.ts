import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';
import { StoreService } from './store.service';
import { Tenant, Store } from '../models/pos.models';

const STORAGE_KEY_TENANT = 'retail_os_selected_tenant_id';
const STORAGE_KEY_STORE = 'retail_os_selected_store_id';

@Injectable({
  providedIn: 'root'
})
export class ContextService {
  public selectedTenantId = signal<string | null>(null);
  public selectedStoreId = signal<string | null>(null);
  public tenants = signal<Tenant[]>([]);
  public stores = signal<Store[]>([]);
  public isLoadingTenants = signal<boolean>(false);
  public isLoadingStores = signal<boolean>(false);

  public isSuperAdmin = computed(() => this.authService.isSuperAdmin());
  public isTenantAdmin = computed(() => this.authService.currentUser()?.role === 'TENANT_ADMIN');

  public selectedTenant = computed(() => {
    const id = this.selectedTenantId();
    if (!id) return null;
    return this.tenants().find(t => t.id === id) || null;
  });

  public selectedStore = computed(() => {
    const id = this.selectedStoreId();
    if (!id) return null;
    return this.stores().find(s => s.id === id) || null;
  });

  public selectedTenantName = computed(() => {
    const t = this.selectedTenant();
    if (t) return t.businessName;
    if (this.isSuperAdmin()) return 'All Tenants (Global)';
    return this.authService.currentUser()?.businessName || 'My Business';
  });

  public selectedStoreName = computed(() => {
    const s = this.selectedStore();
    if (s) return s.name;
    if (this.isSuperAdmin()) {
      return this.selectedTenantId() ? 'All Stores (Tenant-wide)' : 'All Stores (Global)';
    }
    if (this.isTenantAdmin()) {
      return 'All Stores (Company-wide)';
    }
    return 'Assigned Store';
  });

  public effectiveTenantId = computed(() => {
    if (this.isSuperAdmin()) {
      return this.selectedTenantId();
    }
    return this.authService.currentUser()?.tenantId || null;
  });

  public effectiveStoreId = computed(() => {
    if (this.isSuperAdmin() || this.isTenantAdmin()) {
      return this.selectedStoreId();
    }
    return this.authService.currentUser()?.store || null;
  });

  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private storeService: StoreService,
    private router: Router
  ) {
    this.restoreFromUrlOrStorage();

    // Auto-sync context whenever user changes (e.g. login/logout)
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.init();
      } else {
        this.clear();
      }
    }, { allowSignalWrites: true });
  }

  private restoreFromUrlOrStorage() {
    // 1. Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenantId = urlParams.get('tenantId');
    const urlStoreId = urlParams.get('storeId');

    // 2. Check SessionStorage
    const storedTenantId = sessionStorage.getItem(STORAGE_KEY_TENANT);
    const storedStoreId = sessionStorage.getItem(STORAGE_KEY_STORE);

    const initialTenantId = urlTenantId || storedTenantId || null;
    const initialStoreId = urlStoreId || storedStoreId || null;

    if (initialTenantId) {
      this.selectedTenantId.set(initialTenantId);
      sessionStorage.setItem(STORAGE_KEY_TENANT, initialTenantId);
    }

    if (initialStoreId) {
      this.selectedStoreId.set(initialStoreId);
      sessionStorage.setItem(STORAGE_KEY_STORE, initialStoreId);
    }
  }

  public async init() {
    const user = this.authService.currentUser();
    if (!user) return;

    if (user.role === 'SUPER_ADMIN') {
      await this.loadTenants();
      await this.loadStoresForCurrentScope();
    } else if (user.role === 'TENANT_ADMIN') {
      // Tenant Admin cannot pick another tenant
      if (user.tenantId) {
        this.selectedTenantId.set(user.tenantId);
        sessionStorage.setItem(STORAGE_KEY_TENANT, user.tenantId);
      }
      await this.loadStoresForCurrentScope();
    } else {
      // Store staff
      if (user.tenantId) this.selectedTenantId.set(user.tenantId);
      if (user.store) this.selectedStoreId.set(user.store);
      await this.loadStoresForCurrentScope();
    }
  }

  public async loadTenants() {
    if (!this.isSuperAdmin()) return;
    this.isLoadingTenants.set(true);
    try {
      const data = await this.tenantService.getTenants(1, 100);
      const items = data.items || data;
      this.tenants.set(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('ContextService: Failed to load tenants', err);
    } finally {
      this.isLoadingTenants.set(false);
    }
  }

  public async loadStoresForCurrentScope() {
    this.isLoadingStores.set(true);
    try {
      const user = this.authService.currentUser();
      let tenantIdToQuery: string | undefined = undefined;

      if (user?.role === 'SUPER_ADMIN') {
        tenantIdToQuery = this.selectedTenantId() || undefined;
      } else if (user?.role === 'TENANT_ADMIN') {
        tenantIdToQuery = user.tenantId || undefined;
      }

      const data = await this.storeService.getStores(1, 100, tenantIdToQuery);
      const items = data.items || data;
      const list = Array.isArray(items) ? items : [];
      this.stores.set(list.map((s: any) => ({
        ...s,
        active: s.isActive !== undefined ? s.isActive : (s.active !== undefined ? s.active : true)
      })));
    } catch (err) {
      console.error('ContextService: Failed to load stores', err);
    } finally {
      this.isLoadingStores.set(false);
    }
  }

  public async switchTenant(tenantId: string | null) {
    if (!this.isSuperAdmin()) return;

    this.selectedTenantId.set(tenantId);
    this.selectedStoreId.set(null); // Reset store when tenant changes

    if (tenantId) {
      sessionStorage.setItem(STORAGE_KEY_TENANT, tenantId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_TENANT);
    }
    sessionStorage.removeItem(STORAGE_KEY_STORE);

    this.updateUrlParams({ tenantId: tenantId || null, storeId: null });
    await this.loadStoresForCurrentScope();
  }

  public switchStore(storeId: string | null) {
    this.selectedStoreId.set(storeId);

    if (storeId) {
      sessionStorage.setItem(STORAGE_KEY_STORE, storeId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_STORE);
    }

    this.updateUrlParams({ storeId: storeId || null });
  }

  private updateUrlParams(params: { tenantId?: string | null; storeId?: string | null }) {
    this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  public clear() {
    this.selectedTenantId.set(null);
    this.selectedStoreId.set(null);
    this.tenants.set([]);
    this.stores.set([]);
    sessionStorage.removeItem(STORAGE_KEY_TENANT);
    sessionStorage.removeItem(STORAGE_KEY_STORE);
  }
}
