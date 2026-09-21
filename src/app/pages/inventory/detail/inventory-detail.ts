import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StockMovementService } from '../../../services/stock-movement.service';
import { InventoryService } from '../../../services/inventory.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-detail.html'
})
export class InventoryDetailComponent implements OnInit {
  public variantId = signal<string>('');
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public storesStock = signal<any[]>([]);
  public productInfo = signal<any>(null);

  public totals = signal<{
    onHand: number;
    reserved: number;
    available: number;
    reorderPoint: number;
    formatted: string;
  }>({
    onHand: 0,
    reserved: 0,
    available: 0,
    reorderPoint: 0,
    formatted: '0 Sgl'
  });

  // Adjust Modal
  public isAdjustModalOpen = signal<boolean>(false);
  public selectedStoreStock = signal<any>(null);
  public adjForm = {
    oh: 0,
    res: 0,
    ro: 0,
    roQty: 0,
    reason: ''
  };

  // Add to Store Modal
  public isAddStoreModalOpen = signal<boolean>(false);
  public allStores = signal<any[]>([]);
  public addStoreForm = {
    storeId: '',
    quantityOnHand: 0,
    reorderPoint: 5,
    reorderQty: 10
  };

  public canAdjust = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private stockService: StockMovementService,
    private inventoryService: InventoryService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    const isGen = role === 'SuperAdmin' || role === 'TenantAdmin' || (role === 'Manager' && !this.userStoreId());
    this.isGeneral.set(isGen);
    this.canAdjust.set(role === 'SuperAdmin' || role === 'TenantAdmin' || role === 'Manager' || role === 'StoreManager');

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.variantId.set(id);
        this.loadData();
      }
    });
  }

  goBack() {
    this.location.back();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getCrossStoreStock(this.variantId());
      let list = data || [];

      // Defense-in-depth: If not HQ/General, strictly isolate to user's assigned store
      if (!this.isGeneral() && this.userStoreId()) {
        list = list.filter((item: any) => item.storeId === this.userStoreId());
      }

      let totalOh = 0;
      let totalRes = 0;
      let totalRo = 0;
      let pInfo: any = null;

      const mapped = list.map((item: any) => {
        totalOh += item.quantityOnHand || 0;
        totalRes += item.quantityReserved || 0;
        totalRo += item.reorderPoint || 0;

        if (!pInfo) {
          pInfo = {
            variantName: item.variantName || 'Product',
            sku: item.sku || '',
            singlesPerRoll: item.singlesPerRoll || 1,
            rollsPerPack: item.rollsPerPack || 1,
            singlesPerPack: item.singlesPerPack || 1
          };
        }

        const avail = (item.quantityOnHand || 0) - (item.quantityReserved || 0);
        const status = (item.quantityOnHand || 0) <= (item.reorderPoint || 0)
          ? ((item.quantityOnHand || 0) <= 0 ? 'OUT' : 'LOW')
          : 'OK';

        return {
          ...item,
          available: avail,
          status,
          formatted: this.formatStock(
            item.quantityOnHand || 0,
            item.singlesPerRoll,
            item.rollsPerPack,
            item.singlesPerPack
          )
        };
      });

      this.storesStock.set(mapped);
      this.productInfo.set(pInfo);

      const sp = pInfo?.singlesPerPack || 1;
      const sr = pInfo?.singlesPerRoll || 1;
      const rp = pInfo?.rollsPerPack || 1;

      this.totals.set({
        onHand: totalOh,
        reserved: totalRes,
        available: totalOh - totalRes,
        reorderPoint: totalRo,
        formatted: this.formatStock(totalOh, sr, rp, sp)
      });
    } catch (err) {
      console.error('Failed to load store stock breakdown', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  openAdjust(storeStock: any) {
    if (!this.isGeneral() && this.userStoreId() && storeStock.storeId !== this.userStoreId()) {
      alert('You can only adjust inventory for your own store.');
      return;
    }
    this.selectedStoreStock.set(storeStock);
    this.adjForm = {
      oh: storeStock.quantityOnHand,
      res: storeStock.quantityReserved,
      ro: storeStock.reorderPoint,
      roQty: storeStock.reorderQty,
      reason: ''
    };
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal() {
    this.isAdjustModalOpen.set(false);
    this.selectedStoreStock.set(null);
  }

  async saveAdjustment() {
    const item = this.selectedStoreStock();
    if (!item || !item.id) return;

    this.isSaving.set(true);
    const dto = {
      id: item.id,
      quantityOnHand: this.adjForm.oh,
      quantityReserved: this.adjForm.res,
      reorderPoint: this.adjForm.ro,
      reorderQty: this.adjForm.roQty,
      reason: this.adjForm.reason
    };

    try {
      await this.inventoryService.updateInventory(item.id, dto);
      this.closeAdjustModal();
      await this.loadData();
    } catch (error) {
      console.error('Failed to adjust stock', error);
      alert('Failed to save adjustment.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async openAddStoreModal() {
    try {
      const storeRes = await this.storeService.getStores(1, 100);
      const allStoresList = storeRes.items || storeRes || [];
      const currentStoreIds = new Set(this.storesStock().map(s => s.storeId));
      this.allStores.set(allStoresList.filter((s: any) => !currentStoreIds.has(s.id)));

      this.addStoreForm = {
        storeId: this.allStores().length > 0 ? this.allStores()[0].id : '',
        quantityOnHand: 0,
        reorderPoint: 5,
        reorderQty: 10
      };
      this.isAddStoreModalOpen.set(true);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  closeAddStoreModal() {
    this.isAddStoreModalOpen.set(false);
  }

  async saveAddStore() {
    if (!this.addStoreForm.storeId) {
      alert('Please select a store.');
      return;
    }

    this.isSaving.set(true);
    const dto = {
      variantId: this.variantId(),
      storeId: this.addStoreForm.storeId,
      quantityOnHand: this.addStoreForm.quantityOnHand,
      reorderPoint: this.addStoreForm.reorderPoint,
      reorderQty: this.addStoreForm.reorderQty
    };

    try {
      await this.inventoryService.createInventory(dto);
      this.closeAddStoreModal();
      await this.loadData();
    } catch (error) {
      console.error('Failed to add store inventory', error);
      alert('Failed to add product to this store.');
    } finally {
      this.isSaving.set(false);
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
