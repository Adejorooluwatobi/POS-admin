import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockMovementService } from '../../../services/stock-movement.service';
import { AuthService } from '../../../services/auth.service';
import { StoreService } from '../../../services/store.service';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.html'
})
export class OrdersComponent implements OnInit {
  public orders = signal<any[]>([]);
  public stores = signal<any[]>([]);
  public variants = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);
  public isGeneral = signal<boolean>(false);
  public isSuperAdmin = signal<boolean>(false);

  // Create Modal State
  public isCreateModalOpen = signal<boolean>(false);
  public newOrder = {
    type: 0, // 0 = HqToStore, 1 = StoreToStore
    sourceStoreId: null as string | null,
    destinationStoreId: '',
    notes: '',
    items: [{ variantId: '', quantityOrdered: 1 }]
  };

  constructor(
    private stockService: StockMovementService,
    private storeService: StoreService,
    private productService: ProductService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager');
    this.isSuperAdmin.set(role === 'SuperAdmin');
    this.loadOrders();
    this.loadStoresAndVariants();
  }

  async loadStoresAndVariants() {
    try {
      const [storesData, prodData] = await Promise.all([
        this.storeService.getStores(1, 100),
        this.productService.getProducts(1, 100)
      ]);

      this.stores.set(storesData.items || storesData || []);

      const items = prodData.items || prodData || [];
      const vList: any[] = [];
      items.forEach((p: any) => {
        const productVariants = p.variants || p.Variants;
        if (productVariants && productVariants.length > 0) {
          productVariants.forEach((v: any) => {
            vList.push({
              id: v.id || v.Id,
              name: productVariants.length > 1 ? `${p.name || p.Name} - ${v.sku || v.SKU || v.Sku}` : (p.name || p.Name),
              sku: v.sku || v.SKU || v.Sku
            });
          });
        } else if (p.variantId || p.id) {
          vList.push({
            id: p.variantId || p.id,
            name: p.name || p.Name,
            sku: p.sku || p.Sku || ''
          });
        }
      });
      this.variants.set(vList);
    } catch (e) {
      console.warn('Failed to load stores or variants for order modal', e);
    }
  }

  openCreateModal() {
    const userStore = this.userStoreId();
    this.newOrder = {
      type: userStore ? 1 : 0,
      sourceStoreId: userStore || null,
      destinationStoreId: '',
      notes: '',
      items: [{ variantId: '', quantityOrdered: 1 }]
    };
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  addItem() {
    this.newOrder.items.push({ variantId: '', quantityOrdered: 1 });
  }

  removeItem(index: number) {
    if (this.newOrder.items.length > 1) {
      this.newOrder.items.splice(index, 1);
    }
  }

  async submitCreateOrder() {
    if (!this.newOrder.destinationStoreId) {
      alert('Please select a destination store.');
      return;
    }

    if (this.newOrder.type === 1 && !this.newOrder.sourceStoreId) {
      alert('Please select a source store for store-to-store transfer.');
      return;
    }

    if (this.newOrder.type === 1 && this.newOrder.sourceStoreId === this.newOrder.destinationStoreId) {
      alert('Source store and destination store cannot be the same.');
      return;
    }

    const validItems = this.newOrder.items.filter(i => i.variantId && i.quantityOrdered > 0);
    if (validItems.length === 0) {
      alert('Please add at least one product with a valid quantity.');
      return;
    }

    this.isCreating.set(true);
    try {
      const payload = {
        type: Number(this.newOrder.type),
        sourceStoreId: this.newOrder.type === 0 ? null : this.newOrder.sourceStoreId,
        destinationStoreId: this.newOrder.destinationStoreId,
        notes: this.newOrder.notes || null,
        items: validItems.map(i => ({
          variantId: i.variantId,
          quantityOrdered: Number(i.quantityOrdered)
        }))
      };

      await this.stockService.createOrder(payload);
      this.isCreateModalOpen.set(false);
      await this.loadOrders();
    } catch (err: any) {
      console.error('Failed to create order', err);
      alert(`Failed to create order: ${err.error?.message || err.message || 'Unknown error'}`);
    } finally {
      this.isCreating.set(false);
    }
  }

  async loadOrders() {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getOrders();
      this.orders.set(data.items || data);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async dispatch(order: any) {
    if (!confirm('Dispatch this order now?')) return;
    try {
      await this.stockService.dispatchOrder(order.id);
      this.loadOrders();
    } catch (error) {
      alert('Dispatch failed');
    }
  }

  async receive(order: any) {
    // In a real app, this would open a modal to record received quantities
    const receivedItems = order.items.map((i: any) => ({
      itemId: i.id,
      quantityReceived: i.quantityOrdered
    }));

    try {
      await this.stockService.receiveOrder(order.id, { items: receivedItems });
      this.loadOrders();
    } catch (error) {
      alert('Receiving failed');
    }
  }

  async approve(order: any) {
    try {
      await this.stockService.approveOrder(order.id);
      this.loadOrders();
    } catch (error) {}
  }
}
