import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StockMovementService } from '../../../../services/stock-movement.service';
import { AuthService } from '../../../../services/auth.service';
import { StatusStepperComponent } from '../../../../components/status-stepper/status-stepper';

@Component({
  selector: 'app-requisition-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusStepperComponent],
  templateUrl: './requisition-detail.html'
})
export class RequisitionDetailComponent implements OnInit {
  public requisition = signal<any>(null);
  public isLoading = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);

  // Fulfillment Planner State
  public showPlanner = signal<boolean>(false);
  public fulfillmentPlans = signal<any[]>([]); // { sourceStoreId: string, items: { variantId: string, quantity: number, sku: string } }
  public crossStoreData = signal<Map<string, any[]>>(new Map());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: StockMovementService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'SuperAdmin' || role === 'TenantAdmin' || role === 'Manager');
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadRequisition(params['id']);
      }
    });
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
    } catch (error) {
      alert('Failed to approve requisition');
    }
  }

  getCrossStockForItem(variantId: string) {
    return this.crossStoreData().get(variantId) || [];
  }
}
