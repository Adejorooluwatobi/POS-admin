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

  // Dispatch Modal
  public isDispatchModalOpen = signal<boolean>(false);
  public isDispatching = signal<boolean>(false);
  public dispatchDto = {
    driverName: '',
    driverPhone: '',
    vehiclePlateNumber: '',
    dispatchedAt: '',
    estimatedDeliveryTime: '',
    dispatchNotes: ''
  };

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
    if (!ord || (ord.status !== 'Received' && ord.status !== 'Resolved')) return false;
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

  openDispatchModal() {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    this.dispatchDto = {
      driverName: this.order()?.driverName || '',
      driverPhone: this.order()?.driverPhone || '',
      vehiclePlateNumber: this.order()?.vehiclePlateNumber || '',
      dispatchedAt: localIso,
      estimatedDeliveryTime: this.order()?.estimatedDeliveryTime 
        ? new Date(new Date(this.order().estimatedDeliveryTime).getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : '',
      dispatchNotes: ''
    };
    this.isDispatchModalOpen.set(true);
  }

  dispatch() {
    this.openDispatchModal();
  }

  async submitDispatch() {
    this.isDispatching.set(true);
    try {
      const payload = {
        driverName: this.dispatchDto.driverName.trim() || null,
        driverPhone: this.dispatchDto.driverPhone.trim() || null,
        vehiclePlateNumber: this.dispatchDto.vehiclePlateNumber.trim() || null,
        dispatchedAt: this.dispatchDto.dispatchedAt ? new Date(this.dispatchDto.dispatchedAt).toISOString() : new Date().toISOString(),
        estimatedDeliveryTime: this.dispatchDto.estimatedDeliveryTime ? new Date(this.dispatchDto.estimatedDeliveryTime).toISOString() : null,
        dispatchNotes: this.dispatchDto.dispatchNotes.trim() || null
      };

      await this.stockService.dispatchOrder(this.order().id, payload);
      this.isDispatchModalOpen.set(false);
      this.loadOrder(this.order().id);
    } catch (error: any) {
      alert(`Dispatch failed: ${error.error?.message || error.message || 'Unknown error'}`);
    } finally {
      this.isDispatching.set(false);
    }
  }

  openReceiveModal() {
    this.receivedItems.set(this.order().items.map((i: any) => {
      const totalBase = (i.quantityReceivedBaseUnits !== null && i.quantityReceivedBaseUnits !== undefined)
        ? i.quantityReceivedBaseUnits
        : (i.quantityReceived !== null && i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered);
      const sr = i.singlesPerRoll || 1;
      const sp = (i.singlesPerPack && i.singlesPerPack > 1) ? i.singlesPerPack : (i.conversionFactor > 1 ? i.conversionFactor : 1);
      
      const packs = Math.floor(totalBase / sp);
      const remPacks = totalBase % sp;
      const rolls = Math.floor(remPacks / sr);
      const singles = remPacks % sr;

      return {
        itemId: i.id,
        variantName: i.variantName || i.variant?.sku || 'Item',
        sku: i.sku || i.variant?.sku || '',
        conversionFactor: sp,
        singlesPerRoll: sr,
        batchNumber: i.batchNumber,
        productionDate: i.productionDate,
        expiryDate: i.expiryDate,
        quantityOrdered: i.quantityOrdered,
        quantityReceived: totalBase,
        packs: packs,
        rolls: rolls,
        singles: singles
      };
    }));
    this.isReceiveModalOpen.set(true);
  }

  async submitReceive() {
    this.isReceiving.set(true);
    try {
      await this.stockService.receiveOrder(this.order().id, {
        items: this.receivedItems().map(i => {
          const p = Number(i.packs || 0);
          const r = Number(i.rolls || 0);
          const s = Number(i.singles || 0);
          const cf = Number(i.conversionFactor || 1);
          const sr = Number(i.singlesPerRoll || 1);

          let baseUnits = s;
          if (cf > 1 || sr > 1) {
            baseUnits = (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
          } else {
            baseUnits = Number(i.quantityReceived || 1);
          }

          return {
            itemId: i.itemId,
            quantityReceived: p > 0 ? p : baseUnits, // sending packs mostly for UI reference, backend mostly cares about QuantityReceivedBaseUnits
            quantityReceivedBaseUnits: baseUnits
          };
        })
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
    this.resolveItems.set(this.order().items.map((i: any) => {
      const qtyRec = (i.quantityReceivedBaseUnits !== null && i.quantityReceivedBaseUnits !== undefined) 
        ? i.quantityReceivedBaseUnits 
        : (i.quantityReceived !== null && i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered);
      
      const sr = i.singlesPerRoll || 1;
      const sp = (i.singlesPerPack && i.singlesPerPack > 1) ? i.singlesPerPack : (i.conversionFactor > 1 ? i.conversionFactor : 1);
      
      const packs = Math.floor(qtyRec / sp);
      const remPacks = qtyRec % sp;
      const rolls = Math.floor(remPacks / sr);
      const singles = remPacks % sr;

      return {
        itemId: i.id,
        variantName: i.variantName || i.variant?.sku || 'Item',
        sku: i.sku || i.variant?.sku || '',
        conversionFactor: sp,
        singlesPerRoll: sr,
        quantityOrdered: i.quantityOrdered,
        quantityReceived: qtyRec,
        finalAgreedQuantity: qtyRec,
        agreedPacks: packs,
        agreedRolls: rolls,
        agreedSingles: singles,
        resolutionReason: ''
      };
    }));
    this.isResolveModalOpen.set(true);
  }

  async submitResolve() {
    this.isResolving.set(true);
    try {
      const payload = {
        items: this.resolveItems().map(i => {
          let agreed = Number(i.finalAgreedQuantity || 0);
          
          const p = Number(i.agreedPacks || 0);
          const r = Number(i.agreedRolls || 0);
          const s = Number(i.agreedSingles || 0);
          const cf = Number(i.conversionFactor || 1);
          const sr = Number(i.singlesPerRoll || 1);

          if (cf > 1 || sr > 1) {
            agreed = (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
          }

          return {
            itemId: i.itemId,
            finalAgreedQuantity: agreed,
            resolutionReason: i.resolutionReason
          };
        })
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
