import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { ProductService } from '../../services/product.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { InventoryItem, Product, Store } from '../../models/pos.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './inventory.html'
})
export class InventoryComponent implements OnInit {
  public inventory = signal<InventoryItem[]>([]);
  public isLoading = signal<boolean>(false);

  // Adjustment Modal State
  public isModalOpen = signal<boolean>(false);
  public selectedItem = signal<any>({
    n: '',
    oh: 0,
    res: 0,
    ro: 0,
    roQty: 0,
    reason: ''
  });

  // Add Modal State
  public isAddModalOpen = signal<boolean>(false);
  public products = signal<Product[]>([]);
  public stores = signal<Store[]>([]);
  public newInventoryItem = {
    variantId: '',
    storeId: '',
    quantityOnHand: 0,
    reorderPoint: 5,
    reorderQty: 10
  };

  public isGenerals = signal<boolean>(false);
  public lowStockAlerts = signal<any[]>([]);
  public crossStoreStock = signal<any[]>([]);
  public isCrossStoreModalOpen = signal<boolean>(false);

  constructor(
    private inventoryService: InventoryService,
    private stockService: StockMovementService,
    private productService: ProductService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkUserRole();
    this.loadInventory();
    this.loadAlerts();
    this.loadInitialData();
  }

  async loadInitialData() {
    try {
      const prodData = await this.productService.getProducts(1, 100);
      const items = prodData.items || prodData;
      this.products.set(items.map((p: any) => ({
        ...p,
        name: p.name || p.Name || p.n,
        Name: p.name || p.Name || p.n
      })));

      if (this.isGenerals()) {
        const storeData = await this.storeService.getStores(1, 100);
        this.stores.set(storeData.items || storeData);
      }
    } catch (error) {}
  }

  checkUserRole() {
    const role = this.authService.getSystemRole();
    this.isGenerals.set(role === 'SuperAdmin' || role === 'TenantAdmin' || role === 'Manager');
  }

  async loadAlerts() {
    const storeId = this.authService.getStoreId();
    if (storeId) {
      try {
        this.lowStockAlerts.set(await this.stockService.getLowStockAlerts(storeId));
      } catch (error) {}
    }
  }

  async viewCrossStore(item: any) {
    if (!this.isGenerals()) return;
    try {
      this.crossStoreStock.set(await this.stockService.getCrossStoreStock(item.variantId));
      this.selectedItem.set(item);
      this.isCrossStoreModalOpen.set(true);
    } catch (error) {}
  }

  async loadInventory() {
    this.isLoading.set(true);
    try {
      const data = await this.inventoryService.getInventory();
      const items = data.items || data;
      this.inventory.set(items.map((i: any) => ({
        ...i,
        n: i.variantName || 'Unknown Product',
        sku: i.sku || i.SKU,
        e: '📦',
        oh: i.quantityOnHand,
        res: i.quantityReserved,
        ro: i.reorderPoint,
        roQty: i.reorderQty,
        singlesPerRoll: i.singlesPerRoll || 1,
        rollsPerPack: i.rollsPerPack || 1,
        s: i.quantityOnHand <= i.reorderPoint ? (i.quantityOnHand <= 0 ? 'OUT' : 'LOW') : 'OK',
        formatted: this.formatStock(i.quantityOnHand, i.singlesPerRoll, i.rollsPerPack)
      })));
    } catch (error) {
      console.error('Failed to load inventory', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openAddModal() {
    this.newInventoryItem = {
      variantId: '',
      storeId: this.authService.getStoreId() || '',
      quantityOnHand: 0,
      reorderPoint: 5,
      reorderQty: 10
    };
    this.isAddModalOpen.set(true);
  }

  async saveNewInventory() {
    if (!this.newInventoryItem.variantId || !this.newInventoryItem.storeId) {
      alert('Please select a product and store.');
      return;
    }

    try {
      await this.inventoryService.createInventory(this.newInventoryItem);
      this.isAddModalOpen.set(false);
      this.loadInventory();
    } catch (error) {
      console.error('Failed to add inventory', error);
      alert('Failed to add product to inventory. It might already exist.');
    }
  }

  openStockAdj(item: InventoryItem) {
    this.selectedItem.set({ ...item });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.isAddModalOpen.set(false);
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
      reason: item.reason
    };

    try {
      await this.inventoryService.updateInventory(item.id, dto);
      this.closeModal();
      this.loadInventory();
    } catch (error) {
      console.error('Failed to adjust stock', error);
    }
  }

  formatStock(total: number, sr: number | undefined, rp: number | undefined): string {
    const singlesPerRoll = sr && sr > 0 ? sr : 1;
    const rollsPerPack = rp && rp > 0 ? rp : 1;
    const singlesPerPack = singlesPerRoll * rollsPerPack;

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
