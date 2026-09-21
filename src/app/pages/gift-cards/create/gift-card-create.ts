import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GiftCardService } from '../../../services/gift-card.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { CustomerService } from '../../../services/customer.service';

@Component({
  selector: 'app-gift-card-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gift-card-create.html'
})
export class GiftCardCreateComponent implements OnInit {
  public isLoading = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public stores = signal<any[]>([]);
  public customers = signal<any[]>([]);

  // Card ownership mode
  public cardMode = signal<'anonymous' | 'linked'>('anonymous');
  public isQuickRegistering = signal<boolean>(false);

  // Quick Customer Form
  public quickCustomer = signal({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  public newCard = signal({
    cardNumber: '',
    initialValue: 5000,
    expiresAt: '',
    pin: '',
    activateNow: false,
    issuingStoreId: null as string | null,
    customerId: null as string | null,
    paymentMethod: 'Cash',
    reference: ''
  });
  public customerSearchQuery = signal<string>('');

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

  selectCustomer(customerId: string | null) {
    this.newCard.update(c => ({ ...c, customerId }));
  }

  getSelectedCustomer(): any {
    const id = this.newCard().customerId;
    if (!id) return null;
    return this.customers().find((c: any) => c.id === id) || null;
  }

  constructor(
    private router: Router,
    private giftCardService: GiftCardService,
    private storeService: StoreService,
    private customerService: CustomerService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    this.newCard.update(c => ({
      ...c,
      cardNumber: this.generateCardNumber(),
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    }));

    await Promise.all([
      this.loadStores(),
      this.loadCustomers()
    ]);
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  }

  async loadCustomers() {
    try {
      const data = await this.customerService.getCustomers(1, 100);
      this.customers.set(data.items || data || []);
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  }

  generateCardNumber(): string {
    const businessName = this.authService.currentUser()?.businessName || '';
    const prefix = this.getTenantPrefix(businessName);
    const digitsCount = 16 - prefix.length;
    let digits = '';
    for (let i = 0; i < digitsCount; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    return prefix + digits;
  }

  private getTenantPrefix(businessName: string): string {
    const name = (businessName || '').trim().toLowerCase();
    if (name.includes('nevermind')) return 'NVMD';
    if (name.includes('shoprite')) return 'SHPR';
    if (name.includes('spar')) return 'SPAR';
    const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (lettersOnly.length >= 4) return lettersOnly.substring(0, 4);
    return 'RETL';
  }

  regenerateNumber() {
    this.newCard.update(c => ({
      ...c,
      cardNumber: this.generateCardNumber(),
      pin: Math.floor(1000 + Math.random() * 9000).toString()
    }));
  }

  async issueCard() {
    const c = this.newCard();
    if (!c.cardNumber || !c.cardNumber.trim()) {
      this.errorMessage.set('Card number is required.');
      return;
    }
    if (c.initialValue <= 0) {
      this.errorMessage.set('Initial card value must be greater than 0.');
      return;
    }
    if (!c.pin || c.pin.length !== 4) {
      this.errorMessage.set('Security PIN must be exactly 4 digits.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      let targetCustomerId = c.customerId;

      // If in linked mode and quick registering a new customer first
      if (this.cardMode() === 'linked' && this.isQuickRegistering()) {
        const qc = this.quickCustomer();
        if (!qc.firstName.trim() || !qc.lastName.trim() || !qc.phone.trim()) {
          this.errorMessage.set('First name, last name, and phone are required to register the customer.');
          this.isSubmitting.set(false);
          return;
        }

        const createdCustomer = await this.customerService.createCustomer({
          firstName: qc.firstName.trim(),
          lastName: qc.lastName.trim(),
          phone: qc.phone.trim(),
          email: qc.email.trim() || null
        });

        targetCustomerId = createdCustomer.id;
      }

      const payload = {
        cardNumber: c.cardNumber,
        initialValue: c.initialValue,
        expiresAt: c.expiresAt || null,
        pin: c.pin,
        activateNow: c.activateNow,
        issuingStoreId: c.issuingStoreId,
        customerId: this.cardMode() === 'linked' ? targetCustomerId : null,
        paymentMethod: c.paymentMethod,
        reference: c.reference ? c.reference.trim() : null
      };

      await this.giftCardService.issueGiftCard(payload);
      this.router.navigate(['/app/gift-cards']);
    } catch (err: any) {
      console.error('Failed to issue gift card', err);
      this.errorMessage.set(err?.error?.message || 'Failed to issue gift card.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/gift-cards']);
  }
}
