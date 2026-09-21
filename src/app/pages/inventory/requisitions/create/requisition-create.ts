import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StockMovementService } from '../../../../services/stock-movement.service';
import { ProductService } from '../../../../services/product.service';
import { StoreService } from '../../../../services/store.service';
import { AuthService } from '../../../../services/auth.service';

interface RequisitionLineItem {
  variantId: string;
  sku: string;
  productName: string;
  quantityRequested: number;
  packs: number;
  rolls: number;
  singles: number;
  conversionFactor: number;
  singlesPerRoll: number;
  rollsPerPack: number;
}

@Component({
  selector: 'app-requisition-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './requisition-create.html'
})
export class RequisitionCreateComponent implements OnInit {
  public stores = signal<any[]>([]);
  public variants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);

  public userStoreId = signal<string | null>(null);
  public isGeneral = signal<boolean>(false);

  public requestingStoreId: string = '';
  public notes: string = '';
  public items: RequisitionLineItem[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private stockService: StockMovementService,
    private productService: ProductService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager' || role === 'SuperAdmin');

    this.addItem();
    this.loadInitialData();
  }

  goBack() {
    this.router.navigate(['/app/inventory/requisitions']);
  }

  async loadInitialData() {
    this.isLoading.set(true);
    try {
      const [storesData, prodData] = await Promise.all([
        this.storeService.getStores(1, 100),
        this.productService.getProducts(1, 100)
      ]);

      const storesList = storesData.items || storesData || [];
      this.stores.set(storesList);

      // Default requesting store
      if (this.userStoreId()) {
        this.requestingStoreId = this.userStoreId()!;
      } else if (storesList.length > 0) {
        this.requestingStoreId = storesList[0].id;
      }

      // Flatten variants
      const prods = prodData.items || prodData || [];
      const vList: any[] = [];
      prods.forEach((p: any) => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            vList.push({
              ...v,
              productName: p.name || p.Name,
              brand: p.brand,
              singlesPerPack: p.singlesPerPack || v.conversionFactor || 1,
              singlesPerRoll: p.singlesPerRoll || 1,
              rollsPerPack: p.rollsPerPack || 1,
              conversionFactor: p.singlesPerPack || v.conversionFactor || 1
            });
          });
        }
      });
      this.variants.set(vList);
    } catch (e) {
      console.error('Failed to load stores or products for requisition', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  addItem() {
    this.items.push({
      variantId: '',
      sku: '',
      productName: '',
      quantityRequested: 1,
      packs: 1,
      rolls: 0,
      singles: 0,
      conversionFactor: 1,
      singlesPerRoll: 1,
      rollsPerPack: 1
    });
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  onProductSelect(item: RequisitionLineItem, variantId: string) {
    const v = this.variants().find(x => x.id === variantId);
    if (v) {
      item.sku = v.sku;
      item.productName = v.productName || v.name;
      item.conversionFactor = v.singlesPerPack || v.conversionFactor || 1;
      item.singlesPerRoll = v.singlesPerRoll || 1;
      item.rollsPerPack = v.rollsPerPack || 1;
      item.packs = 1;
      item.rolls = 0;
      item.singles = 0;
      item.quantityRequested = 1;
    }
  }

  calcItemTotal(item: RequisitionLineItem): number {
    const p = Number(item.packs || 0);
    const r = Number(item.rolls || 0);
    const s = Number(item.singles || 0);
    const cf = Number(item.conversionFactor || 1);
    const sr = Number(item.singlesPerRoll || 1);

    if (cf > 1 || sr > 1) {
      return (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
    }
    return Number(item.quantityRequested || 1);
  }

  getTotalRequestedUnits(): number {
    return this.items.reduce((acc, curr) => acc + this.calcItemTotal(curr), 0);
  }

  async submitRequisition() {
    if (!this.requestingStoreId) {
      alert('Please select a requesting store.');
      return;
    }

    const validItems = this.items.filter(i => i.variantId);
    if (validItems.length === 0) {
      alert('Please select at least one product.');
      return;
    }

    const itemsPayload = validItems.map(i => ({
      variantId: i.variantId,
      sku: i.sku,
      quantityRequested: this.calcItemTotal(i)
    }));

    if (itemsPayload.some(i => i.quantityRequested <= 0)) {
      alert('All items must have a requested quantity greater than 0.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = {
        requestingStoreId: this.requestingStoreId,
        notes: this.notes.trim() || null,
        items: itemsPayload
      };

      await this.stockService.createRequisition(payload);
      this.router.navigate(['/app/inventory/requisitions']);
    } catch (err: any) {
      console.error('Failed to create requisition', err);
      alert(`Failed to create requisition: ${err.error?.message || err.message || 'Unknown error'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
