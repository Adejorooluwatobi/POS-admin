import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { LoyaltyService } from '../../../services/loyalty.service';
import { GiftCardService } from '../../../services/gift-card.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './customer-detail.html'
})
export class CustomerDetailComponent implements OnInit {
  public customer = signal<any>(null);
  public loyaltyLedger = signal<any[]>([]);
  public transactionHistory = signal<any>(null);
  public isLoading = signal<boolean>(false);
  public isTransactionsLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public isOwner = signal<boolean>(false);

  // Link card modal state
  public availableCards = signal<any[]>([]);
  public cardSearchQuery = signal<string>('');
  public showLinkCardModal = signal<boolean>(false);
  public selectedCardId = signal<string | null>(null);
  public isSubmittingCardLink = signal<boolean>(false);
  public toastMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private loyaltyService: LoyaltyService,
    private giftCardService: GiftCardService,
    public authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'STORE_MANAGER');
  }

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      await this.loadCustomerData(id);
    }
  }

  async loadCustomerData(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.customerService.getCustomerById(id);
      this.customer.set(data);

      try {
        const ledger = await this.loyaltyService.getCustomerLedger(id);
        this.loyaltyLedger.set(ledger || []);
      } catch (e) {
        // ledger may be empty
        this.loyaltyLedger.set([]);
      }

      try {
        this.isTransactionsLoading.set(true);
        const txData = await this.customerService.getCustomerTransactions(id);
        this.transactionHistory.set(txData);
      } catch (e) {
        console.warn('Failed to load customer transactions', e);
        this.transactionHistory.set(null);
      } finally {
        this.isTransactionsLoading.set(false);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load customer profile.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getPaymentKeys(methodsObj: any): string[] {
    return methodsObj ? Object.keys(methodsObj) : [];
  }

  getPaymentBadgeClass(method: string): string {
    switch (method?.toLowerCase()) {
      case 'card': return 'badge-purple';
      case 'cash': return 'badge-green';
      case 'giftcard': return 'badge-amber';
      case 'banktransfer': return 'badge-blue';
      case 'mobilemoney': return 'badge-dim';
      default: return 'badge-dim';
    }
  }

  async deleteCustomer() {
    const c = this.customer();
    if (!c?.id) return;
    if (!confirm(`Are you sure you want to delete customer ${c.firstName} ${c.lastName}?`)) return;

    try {
      await this.customerService.deleteCustomer(c.id);
      this.router.navigate(['/app/customers']);
    } catch (error: any) {
      console.error('Failed to delete customer', error);
      alert(`Error deleting customer: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val || 0);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  async openLinkCardModal() {
    this.selectedCardId.set(null);
    this.cardSearchQuery.set('');
    this.showLinkCardModal.set(true);
    try {
      const data = await this.giftCardService.getGiftCards(1, 100);
      this.availableCards.set(data.items || data || []);
    } catch (e) {
      console.error('Failed to load cards', e);
    }
  }

  get filteredCards(): any[] {
    const q = this.cardSearchQuery().toLowerCase().trim();
    const list = this.availableCards();
    if (!q) return list;
    return list.filter((card: any) => {
      const num = (card.cardNumber || '').toLowerCase();
      const holder = (card.customerName || '').toLowerCase();
      return num.includes(q) || holder.includes(q);
    });
  }

  selectCardForLink(cardId: string) {
    this.selectedCardId.set(cardId);
  }

  getSelectedCard(): any {
    const id = this.selectedCardId();
    if (!id) return null;
    return this.availableCards().find((c: any) => c.id === id) || null;
  }

  async submitLinkCard() {
    const cust = this.customer();
    const cardId = this.selectedCardId();
    if (!cust?.id || !cardId) return;

    this.isSubmittingCardLink.set(true);
    try {
      await this.giftCardService.linkCustomer(cardId, cust.id);
      this.showLinkCardModal.set(false);
      this.showToast('Card successfully linked to this customer!');
      await this.loadCustomerData(cust.id);
    } catch (err: any) {
      console.error('Error linking card', err);
      alert(err?.error?.message || 'Failed to link card to customer.');
    } finally {
      this.isSubmittingCardLink.set(false);
    }
  }

  async unlinkCard(cardId: string) {
    const cust = this.customer();
    if (!cust?.id) return;
    if (!confirm('Are you sure you want to unlink this card from this customer?')) return;

    try {
      await this.giftCardService.unlinkCustomer(cardId);
      this.showToast('Card unlinked successfully.');
      await this.loadCustomerData(cust.id);
    } catch (err: any) {
      console.error('Error unlinking card', err);
      alert(err?.error?.message || 'Failed to unlink card.');
    }
  }

  goBack() {
    this.router.navigate(['/app/customers']);
  }
}
