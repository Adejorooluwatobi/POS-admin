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

  public isSuperAdmin = signal<boolean>(false);

  // Receive Modal
  public isReceiveModalOpen = signal<boolean>(false);
  public isReceiving = signal<boolean>(false);
  public receivedItems = signal<any[]>([]);

  // Dispute Modal
  public isDisputeModalOpen = signal<boolean>(false);
  public isDisputing = signal<boolean>(false);
  public disputeDto = { notes: '', photoUrl: '' };

  // Resolve Dispute Modal
  public isResolveModalOpen = signal<boolean>(false);
  public isResolving = signal<boolean>(false);
  public resolveItems = signal<any[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: StockMovementService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager');
    this.isSuperAdmin.set(role === 'SuperAdmin');
    
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

  canDispatch(): boolean {
    if (this.isSuperAdmin()) return false;
    const ord = this.order();
    if (!ord || ord.status !== 'Draft') return false;
    if (!ord.sourceStoreId && this.isGeneral()) return true;
    return this.isGeneral() || ord.sourceStoreId === this.userStoreId();
  }

  canReceive(): boolean {
    if (this.isSuperAdmin()) return false;
    const ord = this.order();
    if (!ord || ord.status !== 'Dispatched') return false;
    return ord.destinationStoreId === this.userStoreId();
  }

  canApprove(): boolean {
    if (this.isSuperAdmin()) return false;
    const ord = this.order();
    if (!ord || ord.status !== 'Received') return false;
    return ord.destinationStoreId === this.userStoreId();
  }

  canDispute(): boolean {
    if (this.isSuperAdmin()) return false;
    const ord = this.order();
    if (!ord || ord.status !== 'Received') return false;
    return ord.destinationStoreId === this.userStoreId();
  }

  canResolve(): boolean {
    if (this.isSuperAdmin()) return false;
    const ord = this.order();
    if (!ord || ord.status !== 'Disputed') return false;
    return this.isGeneral() || (ord.sourceStoreId && ord.sourceStoreId === this.userStoreId());
  }

  async dispatch() {
    if (!confirm('Dispatch this order now? Stock will be reserved/deducted from origin.')) return;
    try {
      await this.stockService.dispatchOrder(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Dispatch failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  openReceiveModal() {
    this.receivedItems.set(this.order().items.map((i: any) => ({
      itemId: i.id,
      variantName: i.variantName || i.variant?.sku || 'Item',
      sku: i.sku || i.variant?.sku || '',
      quantityOrdered: i.quantityOrdered,
      quantityReceived: i.quantityReceived !== null && i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered
    })));
    this.isReceiveModalOpen.set(true);
  }

  async submitReceive() {
    this.isReceiving.set(true);
    try {
      await this.stockService.receiveOrder(this.order().id, {
        items: this.receivedItems().map(i => ({ 
          itemId: i.itemId, 
          quantityReceived: Number(i.quantityReceived) 
        }))
      });
      this.isReceiveModalOpen.set(false);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Receiving failed: ${error.error?.message || error.message || 'Unknown error'}`);
    } finally {
      this.isReceiving.set(false);
    }
  }

  async approve() {
    if (!confirm('Approve this delivery? Final stock will be credited to destination store.')) return;
    try {
      await this.stockService.approveOrder(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Approval failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  openDisputeModal() {
    this.disputeDto = {
      notes: this.order()?.disputeNotes || '',
      photoUrl: this.order()?.disputePhotoUrl || ''
    };
    this.isDisputeModalOpen.set(true);
  }

  async submitDispute() {
    if (!this.disputeDto.notes.trim()) {
      alert('Please provide a reason / notes for disputing this shipment.');
      return;
    }

    this.isDisputing.set(true);
    try {
      await this.stockService.disputeOrder(this.order().id, {
        disputeNotes: this.disputeDto.notes.trim(),
        disputePhotoUrl: this.disputeDto.photoUrl?.trim() || null
      });
      this.isDisputeModalOpen.set(false);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Dispute failed: ${error.error?.message || error.message || 'Unknown error'}`);
    } finally {
      this.isDisputing.set(false);
    }
  }

  openResolveModal() {
    this.resolveItems.set(this.order().items.map((i: any) => ({
      itemId: i.id,
      variantName: i.variantName || i.variant?.sku || 'Item',
      sku: i.sku || i.variant?.sku || '',
      quantityOrdered: i.quantityOrdered,
      quantityReceived: i.quantityReceived !== null && i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered,
      finalAgreedQuantity: i.quantityReceived !== null && i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered
    })));
    this.isResolveModalOpen.set(true);
  }

  async submitResolve() {
    this.isResolving.set(true);
    try {
      const payload = {
        items: this.resolveItems().map(i => ({
          itemId: i.itemId,
          finalAgreedQuantity: Number(i.finalAgreedQuantity)
        }))
      };

      await this.stockService.resolveDispute(this.order().id, payload);
      this.isResolveModalOpen.set(false);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Resolve dispute failed: ${error.error?.message || error.message || 'Unknown error'}`);
    } finally {
      this.isResolving.set(false);
    }
  }

  async acceptReferral() {
    try {
      await this.stockService.acceptReferral(this.order().id);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Accept referral failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async declineReferral() {
    const reason = prompt('Reason for declining:');
    if (!reason) return;
    try {
      await this.stockService.declineReferral(this.order().id, reason);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Decline referral failed: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
