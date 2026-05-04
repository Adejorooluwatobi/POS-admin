import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockMovementService } from '../../../services/stock-movement.service';
import { AuthService } from '../../../services/auth.service';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-requisitions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './requisitions.html'
})
export class RequisitionsComponent implements OnInit {
  public requisitions = signal<any[]>([]);
  public products = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isModalOpen = signal<boolean>(false);
  public isGenerals = signal<boolean>(false);

  // Requisition Form
  public newReq = {
    notes: '',
    items: [{ variantId: '', quantityRequested: 1, sku: '' }]
  };

  // Approval Modal
  public selectedReq = signal<any>(null);
  public fulfillmentPlans = signal<any[]>([]);

  constructor(
    private stockService: StockMovementService,
    private authService: AuthService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.checkUserRole();
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
            variants.push({
              id: v.id || v.Id,
              name: productVariants.length > 1 ? `${p.name || p.Name} - ${v.sku || v.SKU || v.Sku}` : (p.name || p.Name),
              sku: v.sku || v.SKU || v.Sku
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

  checkUserRole() {
    const role = this.authService.getSystemRole();
    this.isGenerals.set(role === 'SuperAdmin' || role === 'TenantAdmin' || role === 'Manager');
  }

  async loadRequisitions() {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getRequisitions();
      this.requisitions.set(data.items || data);
    } catch (error) {
      console.error('Failed to load requisitions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.newReq = { notes: '', items: [{ variantId: '', quantityRequested: 1, sku: '' }] };
    this.isModalOpen.set(true);
  }

  addItem() {
    this.newReq.items.push({ variantId: '', quantityRequested: 1, sku: '' });
  }

  async submitRequisition() {
    try {
      await this.stockService.createRequisition(this.newReq);
      this.isModalOpen.set(false);
      this.loadRequisitions();
    } catch (error) {
      alert('Failed to create requisition');
    }
  }

  async review(req: any) {
    if (!confirm('Start review for this requisition?')) return;
    try {
      // await this.stockService.reviewRequisition(req.id); // TODO: Add to service
      this.loadRequisitions();
    } catch (error) {}
  }

  async openApproveModal(req: any) {
    this.selectedReq.set(req);
    // Initialize plans
    this.fulfillmentPlans.set([{
      sourceStoreId: null, // HQ
      items: req.items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantityRequested, sku: i.sku }))
    }]);
  }

  async approve() {
    try {
      await this.stockService.approveRequisition(this.selectedReq().id, {
        fulfillmentPlans: this.fulfillmentPlans()
      });
      this.selectedReq.set(null);
      this.loadRequisitions();
    } catch (error) {
      alert('Approval failed');
    }
  }
}
