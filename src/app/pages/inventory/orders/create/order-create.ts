import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StockMovementService } from '../../../../services/stock-movement.service';
import { StoreService } from '../../../../services/store.service';
import { ProductService } from '../../../../services/product.service';
import { AuthService } from '../../../../services/auth.service';

interface OrderLineItem {
  variantId: string;
  sku: string;
  productName: string;
  quantityOrdered: number;
  packs: number;
  rolls: number;
  singles: number;
  conversionFactor: number;
  singlesPerRoll: number;
  rollsPerPack: number;
  batchNumber?: string;
  productionDate?: string;
  expiryDate?: string;
}

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-create.html'
})
export class OrderCreateComponent implements OnInit {
  public stores = signal<any[]>([]);
  public variants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);

  public userStoreId = signal<string | null>(null);
  public isGeneral = signal<boolean>(false);

  // Form State
  public transferType: number = 0; // 0 = HqToStore, 1 = StoreToStore
  public sourceStoreId: string | null = null;
  public destinationStoreId: string = '';
  public driverName: string = '';
  public driverPhone: string = '';
  public vehiclePlateNumber: string = '';
  public estimatedDeliveryTime: string = '';
  public notes: string = '';
  public items: OrderLineItem[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private stockService: StockMovementService,
    private storeService: StoreService,
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager' || role === 'SuperAdmin');

    if (this.userStoreId()) {
      this.transferType = 1;
      this.sourceStoreId = this.userStoreId();
    }

    this.addItem();
    this.loadInitialData();
  }

  goBack() {
    this.router.navigate(['/app/inventory/orders']);
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
      console.error('Failed to load stores or variants for order create', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  setTransferType(type: number) {
    this.transferType = type;
    if (type === 0) {
      this.sourceStoreId = null;
    } else if (!this.sourceStoreId && this.stores().length > 0) {
      this.sourceStoreId = this.userStoreId() || this.stores()[0].id;
    }
  }

  addItem() {
    this.items.push({
      variantId: '',
      sku: '',
      productName: '',
      quantityOrdered: 1,
      packs: 0,
      rolls: 0,
      singles: 1,
      conversionFactor: 1,
      singlesPerRoll: 1,
      rollsPerPack: 1,
      batchNumber: '',
      productionDate: '',
      expiryDate: ''
    });
  }

  autoGenerateBatch(item: OrderLineItem) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    item.batchNumber = `LOT-${today}-${rand}`;
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  onProductSelect(item: OrderLineItem, variantId: string) {
    const v = this.variants().find(x => x.id === variantId);
    if (v) {
      item.sku = v.sku;
      item.productName = v.productName || v.name;
      item.conversionFactor = v.singlesPerPack || v.conversionFactor || 1;
      item.singlesPerRoll = v.singlesPerRoll || 1;
      item.rollsPerPack = v.rollsPerPack || 1;
      item.packs = item.conversionFactor > 1 ? 1 : 0;
      item.rolls = 0;
      item.singles = item.conversionFactor > 1 ? 0 : 1;
      item.quantityOrdered = 1;
    }
  }

  calcItemTotal(item: OrderLineItem): number {
    const p = Number(item.packs || 0);
    const r = Number(item.rolls || 0);
    const s = Number(item.singles || 0);
    const cf = Number(item.conversionFactor || 1);
    const sr = Number(item.singlesPerRoll || 1);

    if (cf > 1 || sr > 1) {
      return (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
    }
    return Number(item.quantityOrdered || 1);
  }

  getTotalUnits(): number {
    return this.items.reduce((acc, curr) => acc + this.calcItemTotal(curr), 0);
  }

  async submitOrder() {
    if (!this.destinationStoreId) {
      alert('Please select a destination store.');
      return;
    }

    if (this.transferType === 1 && !this.sourceStoreId) {
      alert('Please select an origin source store for store-to-store transfer.');
      return;
    }

    if (this.transferType === 1 && this.sourceStoreId === this.destinationStoreId) {
      alert('Origin store and destination store cannot be the same location.');
      return;
    }

    const validItems = this.items.filter(i => i.variantId);
    if (validItems.length === 0) {
      alert('Please select at least one product.');
      return;
    }

    const itemsPayload = validItems.map(i => ({
      variantId: i.variantId,
      quantityOrdered: this.calcItemTotal(i),
      batchNumber: i.batchNumber?.trim() || null,
      productionDate: i.productionDate ? new Date(i.productionDate).toISOString() : null,
      expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : null
    }));

    if (itemsPayload.some(i => i.quantityOrdered <= 0)) {
      alert('All items must have a quantity greater than 0.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = {
        type: Number(this.transferType),
        sourceStoreId: this.transferType === 0 ? null : this.sourceStoreId,
        destinationStoreId: this.destinationStoreId,
        notes: this.notes.trim() || null,
        driverName: this.driverName.trim() || null,
        driverPhone: this.driverPhone.trim() || null,
        vehiclePlateNumber: this.vehiclePlateNumber.trim() || null,
        estimatedDeliveryTime: this.estimatedDeliveryTime ? new Date(this.estimatedDeliveryTime).toISOString() : null,
        items: itemsPayload
      };

      await this.stockService.createOrder(payload);
      this.router.navigate(['/app/inventory/orders']);
    } catch (err: any) {
      console.error('Failed to create movement order', err);
      alert(`Failed to create order: ${err.error?.message || err.message || 'Unknown error'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
