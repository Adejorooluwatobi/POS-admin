import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockMovementService } from '../../../services/stock-movement.service';
import { AuthService } from '../../../services/auth.service';
import { ProductService } from '../../../services/product.service';
import { StoreService } from '../../../services/store.service';

@Component({
  selector: 'app-requisitions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './requisitions.html'
})
export class RequisitionsComponent implements OnInit {
  public requisitions = signal<any[]>([]);
  
  public pendingCount = computed(() => this.requisitions().filter(r => r.status === 'Pending').length);
  public reviewCount = computed(() => this.requisitions().filter(r => r.status === 'UnderReview').length);
  public fulfilledCount = computed(() => this.requisitions().filter(r => r.status === 'FullyFulfilled' || r.status === 'PartiallyFulfilled').length);

  public products = signal<any[]>([]);
  public stores = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isModalOpen = signal<boolean>(false);
  public isGenerals = signal<boolean>(false);
  public isSuperAdmin = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);

  // Requisition Form
  public newReq = {
    requestingStoreId: '' as string,
    notes: '',
    items: [{ variantId: '', quantityRequested: 1, sku: '', packs: 1, rolls: 0, singles: 0, conversionFactor: 1, singlesPerRoll: 1, rollsPerPack: 1 }]
  };

  // Approval Modal
  public selectedReq = signal<any>(null);
  public fulfillmentPlans = signal<any[]>([]);

  constructor(
    private stockService: StockMovementService,
    private authService: AuthService,
    private productService: ProductService,
    private storeService: StoreService
  ) {}

  ngOnInit() {
    this.checkUserRole();
    this.loadStores();
    this.loadRequisitions();
    this.loadProducts();
  }

  async loadProducts() {
    try {
      console.log('Fetching products for requisition...');
      const data = await this.productService.getProducts(1, 100);
      const items = data.items || data || [];
      console.log(`Loaded ${items.length} products`, items);
      
      const variants: any[] = [];
      items.forEach((p: any) => {
        const productVariants = p.variants || p.Variants;
        if (productVariants && productVariants.length > 0) {
          productVariants.forEach((v: any) => {
            let cf = v.conversionFactor || v.ConversionFactor;
            if (!cf || cf === 1) {
              cf = p.singlesPerPack || p.SinglesPerPack || 1;
            }
            
            variants.push({
              id: v.id || v.Id,
              name: productVariants.length > 1 ? `${p.name || p.Name} - ${v.sku || v.SKU || v.Sku}` : (p.name || p.Name),
              sku: v.sku || v.SKU || v.Sku,
              conversionFactor: cf,
              singlesPerRoll: p.singlesPerRoll || p.SinglesPerRoll || 1,
              rollsPerPack: p.rollsPerPack || p.RollsPerPack || 1
            });
          });
        } else {
          console.warn(`Product ${p.name || p.Name} has no variants and will be skipped.`);
        }
      });
      console.log(`Available selectable variants: ${variants.length}`, variants);
      this.products.set(variants);
    } catch (error) {
      console.error('Failed to load products for dropdown', error);
    }
  }

  onVariantChange(item: any) {
    const product = this.products().find(p => p.id === item.variantId);
    if (product) {
      item.sku = product.sku;
      item.conversionFactor = product.conversionFactor;
      item.singlesPerRoll = product.singlesPerRoll || 1;
      item.rollsPerPack = product.rollsPerPack || 1;
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores(1, 100);
      this.stores.set(data.items || data || []);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  }

  checkUserRole() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGenerals.set(role === 'TenantAdmin' || role === 'Manager');
    this.isSuperAdmin.set(role === 'SuperAdmin');
  }

  canCreate(): boolean {
    return !this.isSuperAdmin();
  }

  canCancel(req: any): boolean {
    if (this.isSuperAdmin()) return false;
    if (!req || req.status !== 'Pending') return false;
    return this.isGenerals() || req.requestingStoreId === this.userStoreId();
  }

  canApprove(req: any): boolean {
    if (this.isSuperAdmin()) return false;
    return this.isGenerals() && (req?.status === 'Pending' || req?.status === 'UnderReview');
  }

  async loadRequisitions() {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getRequisitions();
      this.requisitions.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load requisitions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    const defaultStore = this.userStoreId() || (this.stores().length > 0 ? this.stores()[0].id : '');
    this.newReq = {
      requestingStoreId: defaultStore,
      notes: '',
      items: [{ variantId: '', quantityRequested: 1, sku: '', packs: 1, rolls: 0, singles: 0, conversionFactor: 1, singlesPerRoll: 1, rollsPerPack: 1 }]
    };
    this.isModalOpen.set(true);
  }

  addItem() {
    this.newReq.items.push({ variantId: '', quantityRequested: 1, sku: '', packs: 1, rolls: 0, singles: 0, conversionFactor: 1, singlesPerRoll: 1, rollsPerPack: 1 });
  }

  async submitRequisition() {
    if (!this.newReq.requestingStoreId) {
      alert('Please select a requesting store.');
      return;
    }

    // Calculate actual requested quantity based on packs and singles
    const payload = {
      ...this.newReq,
      items: this.newReq.items.map(i => {
        const p = Number(i.packs || 0);
        const r = Number(i.rolls || 0);
        const s = Number(i.singles || 0);
        const cf = Number(i.conversionFactor || 1);
        const sr = Number(i.singlesPerRoll || 1);
        
        let totalBaseUnits = s;
        if (cf > 1 || sr > 1) {
            totalBaseUnits = (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
        } else {
            totalBaseUnits = Number(i.quantityRequested || 1);
        }

        return {
          variantId: i.variantId,
          sku: i.sku,
          quantityRequested: totalBaseUnits
        };
      })
    };

    if (payload.items.length === 0 || payload.items.some(i => !i.variantId || i.quantityRequested <= 0)) {
      alert('Please ensure all items have a selected product and quantity greater than 0.');
      return;
    }

    try {
      await this.stockService.createRequisition(payload);
      this.isModalOpen.set(false);
      this.loadRequisitions();
    } catch (error: any) {
      alert(`Failed to create requisition: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async cancelRequisition(id: string) {
    if (!confirm('Are you sure you want to cancel this requisition?')) return;
    try {
      await this.stockService.cancelRequisition(id);
      this.loadRequisitions();
    } catch (error: any) {
      alert(`Cancellation failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async review(req: any) {
    if (!confirm('Start review for this requisition?')) return;
    try {
      // await this.stockService.reviewRequisition(req.id);
      this.loadRequisitions();
    } catch (error) {}
  }

  async openApproveModal(req: any) {
    this.selectedReq.set(req);
    this.fulfillmentPlans.set([{
      sourceStoreId: null, // HQ
      items: req.items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantityRequested, sku: i.sku }))
    }]);
  }

  addFulfillmentPlan() {
    this.fulfillmentPlans.update(plans => [
      ...plans,
      {
        sourceStoreId: null,
        items: this.selectedReq().items.map((i: any) => ({ variantId: i.variantId, quantity: 0, sku: i.sku }))
      }
    ]);
  }
  
  removeFulfillmentPlan(index: number) {
    this.fulfillmentPlans.update(plans => plans.filter((_, i) => i !== index));
  }

  async approve() {
    try {
      await this.stockService.approveRequisition(this.selectedReq().id, {
        fulfillmentPlans: this.fulfillmentPlans()
      });
      this.selectedReq.set(null);
      this.loadRequisitions();
    } catch (error: any) {
      alert(`Approval failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
