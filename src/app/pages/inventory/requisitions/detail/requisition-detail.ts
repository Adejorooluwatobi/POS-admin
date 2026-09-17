import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StockMovementService } from '../../../../services/stock-movement.service';
import { AuthService } from '../../../../services/auth.service';
import { StatusStepperComponent } from '../../../../components/status-stepper/status-stepper';

import { StoreService } from '../../../../services/store.service';

@Component({
  selector: 'app-requisition-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusStepperComponent],
  templateUrl: './requisition-detail.html'
})
export class RequisitionDetailComponent implements OnInit {
  public requisition = signal<any>(null);
  public stores = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);
  public isSuperAdmin = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);

  // Fulfillment Planner State
  public showPlanner = signal<boolean>(false);
  public fulfillmentPlans = signal<any[]>([]); // { sourceStoreId: string, items: { variantId: string, quantity: number, sku: string } }
  public crossStoreData = signal<Map<string, any[]>>(new Map());

  // Rejection Modal State
  public isRejectModalOpen = signal<boolean>(false);
  public isRejecting = signal<boolean>(false);
  public rejectionReason: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: StockMovementService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager');
    this.isSuperAdmin.set(role === 'SuperAdmin');
    this.loadStores();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadRequisition(params['id']);
      }
    });
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores(1, 100);
      this.stores.set(data.items || data || []);
    } catch (e) {}
  }

  async loadRequisition(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getRequisitionById(id);
      this.requisition.set(data);
      
      if (this.isGeneral() && (data.status === 'Pending' || data.status === 'UnderReview')) {
        await this.preparePlanner(data);
      }
    } catch (error) {
      console.error('Failed to load requisition', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async preparePlanner(req: any) {
    // 1. Fetch cross-store stock for each item
    for (const item of req.items) {
      const stock = await this.stockService.getCrossStoreStock(item.variantId);
      this.crossStoreData().set(item.variantId, stock);
    }

    // 2. Initialize plans with HQ as default source
    this.fulfillmentPlans.set([{
      sourceStoreId: null, // HQ
      sourceStoreName: 'Headquarters',
      items: req.items.map((i: any) => ({
        variantId: i.variantId,
        sku: i.sku,
        variantName: i.variantName,
        quantity: i.quantityRequested
      }))
    }]);
  }

  addSourceStore() {
    this.fulfillmentPlans.update(plans => [...plans, {
      sourceStoreId: '',
      sourceStoreName: '',
      items: this.requisition().items.map((i: any) => ({
        variantId: i.variantId,
        sku: i.sku,
        variantName: i.variantName,
        quantity: 0
      }))
    }]);
  }

  async submitFulfillment() {
    try {
      const dto = {
        fulfillmentPlans: this.fulfillmentPlans().map(p => ({
          sourceStoreId: p.sourceStoreId || null,
          items: p.items.filter((i: any) => i.quantity > 0).map((i: any) => ({
            variantId: i.variantId,
            quantity: i.quantity
          }))
        })).filter(p => p.items.length > 0)
      };

      await this.stockService.approveRequisition(this.requisition().id, dto);
      this.loadRequisition(this.requisition().id);
      this.showPlanner.set(false);
    } catch (error: any) {
      alert(`Failed to approve requisition: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  canApproveOrReject(): boolean {
    if (this.isSuperAdmin()) return false;
    const req = this.requisition();
    return this.isGeneral() && (req?.status === 'Pending' || req?.status === 'UnderReview');
  }

  canCancel(): boolean {
    if (this.isSuperAdmin()) return false;
    const req = this.requisition();
    if (!req || req.status !== 'Pending') return false;
    return this.isGeneral() || req.requestingStoreId === this.userStoreId();
  }

  openRejectModal() {
    this.rejectionReason = '';
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal() {
    this.isRejectModalOpen.set(false);
  }

  async submitReject() {
    if (!this.rejectionReason.trim()) {
      alert('Please enter a reason for rejecting this requisition.');
      return;
    }

    this.isRejecting.set(true);
    try {
      await this.stockService.rejectRequisition(this.requisition().id, this.rejectionReason.trim());
      this.isRejectModalOpen.set(false);
      this.loadRequisition(this.requisition().id);
    } catch (error: any) {
      alert(`Rejection failed: ${error.error?.message || error.message || 'Unknown error'}`);
    } finally {
      this.isRejecting.set(false);
    }
  }

  async cancelRequisition() {
    if (!confirm('Are you sure you want to cancel this stock request?')) return;
    try {
      await this.stockService.cancelRequisition(this.requisition().id);
      this.loadRequisition(this.requisition().id);
    } catch (error: any) {
      alert(`Cancel failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  getCrossStockForItem(variantId: string) {
    return this.crossStoreData().get(variantId) || [];
  }

  formatQuantity(total: number, item: any): string {
    if (total === null || total === undefined) return '-';
    
    const sr = item.singlesPerRoll && item.singlesPerRoll > 0 ? item.singlesPerRoll : 1;
    const rp = item.rollsPerPack && item.rollsPerPack > 0 ? item.rollsPerPack : 1;
    const sp = item.singlesPerPack && item.singlesPerPack > 0 ? item.singlesPerPack : (item.conversionFactor > 1 ? item.conversionFactor : (sr * rp));

    if (sp <= 1 && sr <= 1) return `${total}`;

    const packs = Math.floor(total / sp);
    const remPacks = total % sp;
    const rolls = Math.floor(remPacks / sr);
    const singles = remPacks % sr;

    const parts = [];
    if (packs > 0) parts.push(`${packs} Pks`);
    if (rolls > 0) parts.push(`${rolls} Rls`);
    if (singles > 0 || (packs === 0 && rolls === 0)) parts.push(`${singles} Sgl`);

    return parts.join(', ');
  }
}
