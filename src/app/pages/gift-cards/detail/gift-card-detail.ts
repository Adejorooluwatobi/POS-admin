import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GiftCardService } from '../../../services/gift-card.service';
import { CustomerService } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';
import { GiftCard, GiftCardTransaction } from '../../../models/pos.models';

@Component({
  selector: 'app-gift-card-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gift-card-detail.html'
})
export class GiftCardDetailComponent implements OnInit {
  public card = signal<GiftCard | null>(null);
  public transactions = signal<GiftCardTransaction[]>([]);
  public customers = signal<any[]>([]);

  public isLoading = signal<boolean>(false);
  public isLoadingTransactions = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public successMessage = signal<string | null>(null);
  public showPin = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);

  // Modals
  public showRechargeModal = signal<boolean>(false);
  public showTransferModal = signal<boolean>(false);
  public showLinkModal = signal<boolean>(false);

  // Recharge form
  public rechargeForm = signal({
    amount: 1000,
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });
  public isSubmittingRecharge = signal<boolean>(false);

  // Transfer form
  public transferForm = signal({
    destinationCardNumber: '',
    sourcePin: '',
    amount: 500,
    notes: ''
  });
  public isSubmittingTransfer = signal<boolean>(false);

  // Link form
  public selectedCustomerId = signal<string | null>(null);
  public customerSearchQuery = signal<string>('');
  public isSubmittingLink = signal<boolean>(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private giftCardService: GiftCardService,
    private customerService: CustomerService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      await Promise.all([
        this.loadCard(id),
        this.loadTransactions(id),
        this.loadCustomers()
      ]);
    }
  }

  async loadCard(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.giftCardService.getGiftCardById(id);
      this.card.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load gift card details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadTransactions(id: string) {
    this.isLoadingTransactions.set(true);
    try {
      const txs = await this.giftCardService.getCardTransactions(id);
      this.transactions.set(txs || []);
    } catch (err: any) {
      console.error('Failed to load card transactions', err);
    } finally {
      this.isLoadingTransactions.set(false);
    }
  }

  async loadCustomers() {
    try {
      const data = await this.customerService.getCustomers(1, 100);
      this.customers.set(data.items || data || []);
    } catch (e) {
      console.error('Failed to load customers list', e);
    }
  }

  togglePin() {
    this.showPin.set(!this.showPin());
  }

  async toggleStatus() {
    const c = this.card();
    if (!c?.id) return;
    this.isUpdating.set(true);
    try {
      await this.giftCardService.updateGiftCard(c.id, { id: c.id, isActive: !c.isActive });
      this.card.update(curr => curr ? ({ ...curr, isActive: !curr.isActive }) : null);
      this.showToast('Card status updated successfully.');
    } catch (e: any) {
      this.errorMessage.set(e?.error?.message || 'Failed to update card status.');
    } finally {
      this.isUpdating.set(false);
    }
  }

  // --- Recharge ---
  openRechargeModal() {
    this.rechargeForm.set({
      amount: 1000,
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
    this.showRechargeModal.set(true);
  }

  async submitRecharge() {
    const c = this.card();
    const form = this.rechargeForm();
    if (!c) return;

    if (form.amount <= 0) {
      alert('Recharge amount must be greater than zero.');
      return;
    }

    this.isSubmittingRecharge.set(true);
    try {
      const updated = await this.giftCardService.rechargeGiftCard({
        cardNumber: c.cardNumber,
        amount: form.amount,
        paymentMethod: form.paymentMethod,
        reference: form.reference?.trim() || undefined,
        notes: form.notes?.trim() || undefined
      });
      this.card.set(updated);
      this.showRechargeModal.set(false);
      this.showToast(`Successfully recharged ₦${form.amount.toLocaleString()} onto card!`);
      if (c.id) await this.loadTransactions(c.id);
    } catch (error: any) {
      console.error('Recharge error', error);
      alert(error?.error?.message || 'Failed to recharge gift card.');
    } finally {
      this.isSubmittingRecharge.set(false);
    }
  }

  // --- Transfer ---
  openTransferModal() {
    this.transferForm.set({
      destinationCardNumber: '',
      sourcePin: '',
      amount: 500,
      notes: ''
    });
    this.showTransferModal.set(true);
  }

  async submitTransfer() {
    const c = this.card();
    const form = this.transferForm();
    if (!c) return;

    if (!form.destinationCardNumber?.trim()) {
      alert('Destination card number is required.');
      return;
    }
    if (form.amount <= 0) {
      alert('Transfer amount must be greater than zero.');
      return;
    }
    if (form.amount > c.balance) {
      alert(`Transfer amount exceeds current balance (₦${c.balance.toLocaleString()}).`);
      return;
    }

    this.isSubmittingTransfer.set(true);
    try {
      const updated = await this.giftCardService.transferBalance({
        sourceCardNumber: c.cardNumber,
        sourcePin: form.sourcePin?.trim() || undefined,
        destinationCardNumber: form.destinationCardNumber.trim(),
        amount: form.amount,
        notes: form.notes?.trim() || undefined
      });
      this.card.set(updated);
      this.showTransferModal.set(false);
      this.showToast(`Transferred ₦${form.amount.toLocaleString()} to card ${form.destinationCardNumber}!`);
      if (c.id) await this.loadTransactions(c.id);
    } catch (error: any) {
      console.error('Transfer error', error);
      alert(error?.error?.message || 'Failed to complete balance transfer.');
    } finally {
      this.isSubmittingTransfer.set(false);
    }
  }

  // --- Link / Unlink Customer ---
  openLinkModal() {
    this.selectedCustomerId.set(this.card()?.customerId || null);
    this.customerSearchQuery.set('');
    this.showLinkModal.set(true);
  }

  get filteredCustomers(): any[] {
    const q = this.customerSearchQuery().toLowerCase().trim();
    const list = this.customers();
    if (!q) return list;
    return list.filter((c: any) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const cardNo = (c.loyaltyCardNo || '').toLowerCase();
      return fullName.includes(q) || phone.includes(q) || email.includes(q) || cardNo.includes(q);
    });
  }

  getCustomerLabel(cust: any): string {
    if (!cust) return '';
    const name = `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Unnamed Customer';
    const contact = cust.phone || cust.email || (cust.loyaltyCardNo ? `Loyalty: ${cust.loyaltyCardNo}` : null);
    return contact ? `${name} (${contact})` : name;
  }

  selectCustomerForLink(customerId: string) {
    this.selectedCustomerId.set(customerId);
  }

  getSelectedCustomer(): any {
    const id = this.selectedCustomerId();
    if (!id) return null;
    return this.customers().find((c: any) => c.id === id) || null;
  }

  async submitLink() {
    const c = this.card();
    const customerId = this.selectedCustomerId();
    if (!c?.id) return;
    if (!customerId) {
      alert('Please select a customer to link.');
      return;
    }

    this.isSubmittingLink.set(true);
    try {
      const updated = await this.giftCardService.linkCustomer(c.id, customerId);
      this.card.set(updated);
      this.showLinkModal.set(false);
      this.showToast('Customer successfully linked to card! Loyalty points will now track automatically.');
    } catch (error: any) {
      console.error('Link customer error', error);
      alert(error?.error?.message || 'Failed to link customer.');
    } finally {
      this.isSubmittingLink.set(false);
    }
  }

  async unlinkCustomer() {
    const c = this.card();
    if (!c?.id) return;
    if (!confirm('Are you sure you want to unlink the customer from this card? Transactions with this card will no longer award loyalty points to their profile.')) {
      return;
    }

    this.isUpdating.set(true);
    try {
      const updated = await this.giftCardService.unlinkCustomer(c.id);
      this.card.set(updated);
      this.showToast('Customer unlinked successfully.');
    } catch (error: any) {
      console.error('Unlink customer error', error);
      alert(error?.error?.message || 'Failed to unlink customer.');
    } finally {
      this.isUpdating.set(false);
    }
  }

  showToast(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  isCardExpired(): boolean {
    const exp = this.card()?.expiresAt;
    if (!exp) return false;
    const expDate = new Date(exp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate < today;
  }

  async setStatus(isActive: boolean) {
    const c = this.card();
    if (!c?.id) return;

    if (isActive && this.isCardExpired()) {
      alert('Expired cards can NEVER be reactivated. Balance can only be transferred to a replacement card.');
      return;
    }

    const reason = prompt(
      isActive ? 'Enter optional reason for activation:' : 'Enter reason for deactivating this card:',
      isActive ? 'Re-activated by administrator' : 'Temporarily suspended by administrator'
    );
    if (reason === null) return; // cancelled

    this.isUpdating.set(true);
    try {
      const updated = await this.giftCardService.setStatus(c.id, isActive, reason);
      this.card.set(updated);
      this.showToast(`Card status updated to ${isActive ? 'ACTIVE' : 'DEACTIVATED'}.`);
    } catch (err: any) {
      console.error('Failed to set card status', err);
      alert(err?.error?.message || 'Failed to update card status.');
    } finally {
      this.isUpdating.set(false);
    }
  }

  // Replace Lost Card Modal
  public showReplaceModal = signal<boolean>(false);
  public isSubmittingReplace = signal<boolean>(false);
  public replaceForm = signal({
    newCardNumber: '',
    newCardPin: '',
    activateNewCard: true,
    reason: 'Reported lost/misplaced',
    bypassVerification: true,
    bypassReason: 'Portal administrator override'
  });

  openReplaceModal() {
    const c = this.card();
    if (!c) return;

    if (this.isCardExpired() && !c.customerId) {
      alert('This expired card is not linked to any customer. You must link or register a customer first before migrating the balance.');
      this.openLinkModal();
      return;
    }

    this.replaceForm.set({
      newCardNumber: '',
      newCardPin: Math.floor(1000 + Math.random() * 9000).toString(),
      activateNewCard: true,
      reason: 'Reported lost/misplaced by customer',
      bypassVerification: true,
      bypassReason: 'Portal administrator override'
    });
    this.showReplaceModal.set(true);
  }

  async submitReplace() {
    const c = this.card();
    if (!c?.cardNumber) return;

    const f = this.replaceForm();
    this.isSubmittingReplace.set(true);
    try {
      const replacement = await this.giftCardService.replaceLostCard({
        lostCardNumber: c.cardNumber,
        newCardNumber: f.newCardNumber.trim() || undefined,
        newCardPin: f.newCardPin.trim() || undefined,
        activateNewCard: f.activateNewCard,
        reason: f.reason,
        bypassVerification: f.bypassVerification,
        bypassReason: f.bypassReason
      });

      this.showReplaceModal.set(false);
      alert(`Replacement card ${replacement.cardNumber} created successfully with transferred balance of ₦${replacement.balance.toLocaleString()}!`);
      this.router.navigate(['/app/gift-cards', replacement.id]);
    } catch (err: any) {
      console.error('Failed to replace lost card', err);
      alert(err?.error?.message || 'Failed to replace lost card.');
    } finally {
      this.isSubmittingReplace.set(false);
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val || 0);
  }

  goBack() {
    this.router.navigate(['/app/gift-cards']);
  }
}
