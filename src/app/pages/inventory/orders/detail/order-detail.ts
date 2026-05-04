import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StockMovementService } from '../../../../services/stock-movement.service';
import { AuthService } from '../../../../services/auth.service';
import { StatusStepperComponent } from '../../../../components/status-stepper/status-stepper';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusStepperComponent],
  templateUrl: './order-detail.html'
})
export class OrderDetailComponent implements OnInit {
  public order = signal<any>(null);
  public isLoading = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);
  public isGeneral = signal<boolean>(false);

  // Receive Modal
  public isReceiveModalOpen = signal<boolean>(false);
  public receivedItems = signal<any[]>([]);

  // Dispute Modal
  public isDisputeModalOpen = signal<boolean>(false);
  public disputeDto = { notes: '', photoUrl: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: StockMovementService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'SuperAdmin' || role === 'TenantAdmin' || role === 'Manager');
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadOrder(params['id']);
      }
    });
  }

  async loadOrder(id: string) {
    this.isLoading.set(true);
    try {
      this.order.set(await this.stockService.getOrderById(id));
    } catch (error) {
      console.error('Failed to load order', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async dispatch() {
    if (!confirm('Dispatch this order?')) return;
    try {
      await this.stockService.dispatchOrder(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error) {}
  }

  openReceiveModal() {
    this.receivedItems.set(this.order().items.map((i: any) => ({
      itemId: i.id,
      variantName: i.variantName,
      sku: i.sku,
      quantityOrdered: i.quantityOrdered,
      quantityReceived: i.quantityOrdered
    })));
    this.isReceiveModalOpen.set(true);
  }

  async submitReceive() {
    try {
      await this.stockService.receiveOrder(this.order().id, {
        items: this.receivedItems().map(i => ({ itemId: i.itemId, quantityReceived: i.quantityReceived }))
      });
      this.isReceiveModalOpen.set(false);
      this.loadOrder(this.order().id);
    } catch (error) {}
  }

  async approve() {
    if (!confirm('Approve this delivery? Stock will be updated.')) return;
    try {
      await this.stockService.approveOrder(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error) {}
  }

  async acceptReferral() {
    try {
      await this.stockService.acceptReferral(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error) {}
  }

  async declineReferral() {
    const reason = prompt('Reason for declining:');
    if (!reason) return;
    try {
      await this.stockService.declineReferral(this.order().id, reason);
      this.loadOrder(this.order().id);
    } catch (error) {}
  }
}
