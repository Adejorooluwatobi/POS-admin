import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { ProductService } from '../../services/product.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { InventoryItem, Product, Store } from '../../models/pos.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe],
  templateUrl: './inventory.html'
})
export class InventoryComponent implements OnInit {
  public inventory = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isGenerals = signal<boolean>(false);
  public products = signal<Product[]>([]);
  public stores = signal<Store[]>([]);
  public lowStockAlerts = signal<any[]>([]);

  // Search & Filters
  public searchTerm = signal<string>('');
  public selectedStoreFilter = signal<string>('ALL');
  public stockStatusFilter = signal<'ALL' | 'OPTIMAL' | 'LOW' | 'OUT'>('ALL');

  // Adjustment Modal / Drawer State
  public isModalOpen = signal<boolean>(false);
  public selectedItem = signal<any>({
    n: '',
    oh: 0,
    res: 0,
    ro: 0,
    roQty: 0,
    reason: ''
  });

  // Add Inventory to Store Modal State
  public isAddModalOpen = signal<boolean>(false);
  public newInventoryItem = {
    variantId: '',
    storeId: '',
    quantityOnHand: 0,
    reorderPoint: 5,
    reorderQty: 10
  };

  // Cross-Store Inspection Modal
  public isCrossStoreModalOpen = signal<boolean>(false);
  public crossStoreStock = signal<any[]>([]);

  // Computed Portfolio KPIs
  public totalStockOnHand = computed(() => {
    return this.inventory().reduce((sum, item) => sum + (item.oh || 0), 0);
  });

  public totalReservedUnits = computed(() => {
    return this.inventory().reduce((sum, item) => sum + (item.res || 0), 0);
  });

  public totalAvailableUnits = computed(() => {
    return this.totalStockOnHand() - this.totalReservedUnits();
  });

  public lowStockCount = computed(() => {
    return this.inventory().filter(item => item.s === 'LOW').length;
  });

  public outOfStockCount = computed(() => {
    return this.inventory().filter(item => item.s === 'OUT').length;
  });

  // Filtered Inventory Stream
  public filteredInventory = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const store = this.selectedStoreFilter();
    const status = this.stockStatusFilter();
    let list = this.inventory();

    if (store !== 'ALL') {
      list = list.filter(item => item.storeId === store || item.storeName === store);
    }

    if (status === 'LOW') {
      list = list.filter(item => item.s === 'LOW');
    } else if (status === 'OUT') {
      list = list.filter(item => item.s === 'OUT');
    } else if (status === 'OPTIMAL') {
      list = list.filter(item => item.s === 'OK');
    }

    if (!term) return list;

    return list.filter(item => {
      const nameMatch = (item.n || '').toLowerCase().includes(term);
      const skuMatch = (item.sku || '').toLowerCase().includes(term);
      const storeMatch = (item.storeName || '').toLowerCase().includes(term);
      return nameMatch || skuMatch || storeMatch;
    });
  });

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private stockService: StockMovementService,
    private productService: ProductService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkUserRole();
    this.loadAll();
  }

  checkUserRole() {
    const role = this.authService.getSystemRole();
    this.isGenerals.set(role === 'TenantAdmin' || role === 'Manager' || role === 'StoreManager' || role === 'SuperAdmin');
  }

  async loadAll() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadInventory(),
        this.loadAlerts(),
        this.loadInitialData()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadInitialData() {
    try {
      const prodData = await this.productService.getProducts(1, 100);
      const items = prodData.items || prodData || [];
      this.products.set(items.map((p: any) => ({
        ...p,
        name: p.name || p.Name || p.n,
        Name: p.name || p.Name || p.n
      })));

      const storeData = await this.storeService.getStores(1, 100);
      this.stores.set(storeData.items || storeData || []);
    } catch (error) {
      console.warn('Failed to load initial products/stores', error);
    }
  }

  async loadAlerts() {
    const storeId = this.authService.getStoreId();
    if (storeId) {
      try {
        const alerts = await this.stockService.getLowStockAlerts(storeId);
        this.lowStockAlerts.set(alerts || []);
      } catch (error) {
        this.lowStockAlerts.set([]);
      }
    }
  }

  async loadInventory() {
    try {
      const data = await this.inventoryService.getInventory(1, 100);
      const items = data.items || data || [];
      this.inventory.set(items.map((i: any) => ({
        ...i,
        n: i.variantName || i.name || 'Unknown Product',
        sku: i.sku || i.SKU || '—',
        storeName: i.storeName || 'Primary Store',
        storeId: i.storeId,
        oh: i.quantityOnHand ?? 0,
        res: i.quantityReserved ?? 0,
        ro: i.reorderPoint ?? 5,
        roQty: i.reorderQty ?? 10,
        singlesPerRoll: i.singlesPerRoll || 1,
        rollsPerPack: i.rollsPerPack || 1,
        singlesPerPack: i.singlesPerPack || 1,
        s: (i.quantityOnHand ?? 0) <= (i.reorderPoint ?? 5) ? ((i.quantityOnHand ?? 0) <= 0 ? 'OUT' : 'LOW') : 'OK',
        formatted: this.formatStock(i.quantityOnHand ?? 0, i.singlesPerRoll, i.rollsPerPack, i.singlesPerPack)
      })));
    } catch (error) {
      console.error('Failed to load inventory', error);
      this.inventory.set([]);
    }
  }

  viewDetails(item: any) {
    const id = item.variantId || item.id;
    if (id) {
      this.router.navigate(['/app/inventory', id]);
    }
  }

  async viewCrossStore(item: any) {
    if (!this.isGenerals()) return;
    try {
      const id = item.variantId || item.id;
      const data = await this.stockService.getCrossStoreStock(id);
      this.crossStoreStock.set(data || []);
      this.selectedItem.set(item);
      this.isCrossStoreModalOpen.set(true);
    } catch (error) {
      console.error('Failed to load cross-store stock', error);
    }
  }

  openAddModal() {
    this.newInventoryItem = {
      variantId: this.products().length > 0 ? (this.products()[0].id || '') : '',
      storeId: this.authService.getStoreId() || (this.stores().length > 0 ? (this.stores()[0].id || '') : ''),
      quantityOnHand: 0,
      reorderPoint: 5,
      reorderQty: 10
    };
    this.isAddModalOpen.set(true);
  }

  async saveNewInventory() {
    if (!this.newInventoryItem.variantId || !this.newInventoryItem.storeId) {
      alert('Please select both a product and store.');
      return;
    }

    try {
      await this.inventoryService.createInventory(this.newInventoryItem);
      this.isAddModalOpen.set(false);
      await this.loadInventory();
    } catch (error: any) {
      console.error('Failed to add inventory', error);
      alert(error?.error?.message || 'Failed to add product to inventory. It may already exist in this store.');
    }
  }

  openStockAdj(item: any) {
    this.selectedItem.set({ ...item, reason: 'Physical Recount / Cycle Count' });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.isAddModalOpen.set(false);
    this.isCrossStoreModalOpen.set(false);
  }

  async saveAdjustment() {
    const item = this.selectedItem();
    if (!item.id) return;

    const dto = {
      id: item.id,
      quantityOnHand: item.oh,
      quantityReserved: item.res,
      reorderPoint: item.ro,
      reorderQty: item.roQty,
      reason: item.reason || 'Inventory Adjustment'
    };

    try {
      await this.inventoryService.updateInventory(item.id, dto);
      this.closeModal();
      await this.loadInventory();
    } catch (error: any) {
      console.error('Failed to adjust stock', error);
      alert(error?.error?.message || 'Failed to save stock adjustment');
    }
  }

  formatStock(total: number, sr: number | undefined, rp: number | undefined, sp: number | undefined): string {
    const singlesPerRoll = sr && sr > 0 ? sr : 1;
    const rollsPerPack = rp && rp > 0 ? rp : 1;
    const singlesPerPack = sp && sp > 0 ? sp : (singlesPerRoll * rollsPerPack);

    if (singlesPerPack <= 1 && singlesPerRoll <= 1) return `${total} Sgl`;

    const packs = Math.floor(total / singlesPerPack);
    const remPacks = total % singlesPerPack;
    const rolls = Math.floor(remPacks / singlesPerRoll);
    const singles = remPacks % singlesPerRoll;

    const parts = [];
    if (packs > 0) parts.push(`${packs} Pks`);
    if (rolls > 0) parts.push(`${rolls} Rls`);
    if (singles > 0 || (packs === 0 && rolls === 0)) parts.push(`${singles} Sgl`);

    return parts.join(', ');
  }
}
