import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GiftCardService } from '../../services/gift-card.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { GiftCard, GiftCardTransaction, Store } from '../../models/pos.models';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, DatePipe],
  templateUrl: './gift-cards.html'
})
export class GiftCardsComponent implements OnInit {
  public giftCards = signal<GiftCard[]>([]);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);
  public isAdmin = signal<boolean>(false);

  // Search & NFC Reader Emulation
  public searchQuery = signal<string>('');
  public isNfcActive = signal<boolean>(true);
  public isNfcScanning = signal<boolean>(false);

  // Selected Card for the Tactical Workspace
  public selectedCard = signal<GiftCard | null>(null);
  public selectedCardTransactions = signal<GiftCardTransaction[]>([]);
  public isLoadingTransactions = signal<boolean>(false);

  // Inline Quick Top-Up Drawer / Panel State
  public topUpAmount = signal<number>(10000);
  public topUpMethod = signal<'Cash' | 'Transfer' | 'POS' | 'MobileMoney'>('Transfer');
  public topUpNotes = signal<string>('');
  public isProcessingTopUp = signal<boolean>(false);

  // Toast / Feedback
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  // Computed Portfolio KPIs
  public totalActiveCards = computed(() => {
    return this.giftCards().filter(c => c.isActive).length;
  });

  public totalStoredBalance = computed(() => {
    return this.giftCards().reduce((sum, c) => sum + (c.balance || 0), 0);
  });

  public totalIssuedVolume = computed(() => {
    return this.giftCards().reduce((sum, c) => sum + (c.initialValue || 0), 0);
  });

  public filteredCards = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.giftCards();
    if (!q) return list;

    return list.filter(c => {
      const cardMatch = (c.cardNumber || '').toLowerCase().includes(q);
      const nameMatch = (c.customerName || '').toLowerCase().includes(q);
      const phoneMatch = (c.customerPhone || '').toLowerCase().includes(q);
      return cardMatch || nameMatch || phoneMatch;
    });
  });

  constructor(
    private giftCardService: GiftCardService,
    public authService: AuthService,
    private storeService: StoreService
  ) {
    const user = this.authService.currentUser();
    this.isAdmin.set(
      user?.role === 'TENANT_ADMIN' ||
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'MANAGER' ||
      user?.role === 'STORE_MANAGER'
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  async loadAll() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadGiftCards(),
        this.loadStores()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  async loadGiftCards() {
    try {
      const data = await this.giftCardService.getGiftCards(1, 100);
      const items: GiftCard[] = data.items || data || [];
      this.giftCards.set(items);

      // Select first card or maintain current selection
      if (items.length > 0) {
        const currentId = this.selectedCard()?.id;
        const found = currentId ? items.find(c => c.id === currentId) : items[0];
        this.selectCard(found || items[0]);
      } else {
        this.selectedCard.set(null);
        this.selectedCardTransactions.set([]);
      }
    } catch (error) {
      console.error('Failed to load gift cards', error);
      this.giftCards.set([]);
    }
  }

  selectCard(card: GiftCard) {
    this.selectedCard.set(card);
    if (card?.id) {
      this.loadTransactions(card.id);
    }
  }

  async loadTransactions(cardId: string) {
    this.isLoadingTransactions.set(true);
    try {
      const txs = await this.giftCardService.getCardTransactions(cardId);
      this.selectedCardTransactions.set(txs || []);
    } catch (err) {
      console.error('Failed to load transactions for card', err);
      this.selectedCardTransactions.set([]);
    } finally {
      this.isLoadingTransactions.set(false);
    }
  }

  simulateNfcTap() {
    this.isNfcScanning.set(true);
    setTimeout(() => {
      this.isNfcScanning.set(false);
      const cards = this.giftCards();
      if (cards.length > 0) {
        // Pick random or next card to simulate physical NFC badge tap
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        this.selectCard(randomCard);
        this.searchQuery.set(randomCard.cardNumber);
        this.showToast(`NFC Card Detected: ${randomCard.cardNumber}`, 'success');
      } else {
        this.showToast('NFC Reader ready. No card detected in database.', 'error');
      }
    }, 600);
  }

  setPresetAmount(amount: number) {
    this.topUpAmount.set(amount);
  }

  async executeQuickTopUp() {
    const card = this.selectedCard();
    if (!card) return;

    const amount = this.topUpAmount();
    if (amount <= 0) {
      this.showToast('Please enter an amount greater than ₦0.00', 'error');
      return;
    }

    this.isProcessingTopUp.set(true);
    try {
      const updated = await this.giftCardService.rechargeGiftCard({
        cardNumber: card.cardNumber,
        amount: amount,
        paymentMethod: this.topUpMethod(),
        notes: this.topUpNotes() || 'Card Operations Center Quick Top-up'
      });

      this.showToast(`Successfully recharged ₦${amount.toLocaleString()} onto card!`, 'success');
      await this.loadGiftCards();
      if (updated) {
        this.selectCard(updated);
      }
    } catch (err: any) {
      console.error('Failed to top up card', err);
      this.showToast(err?.error?.message || 'Top-up transaction failed.', 'error');
    } finally {
      this.isProcessingTopUp.set(false);
    }
  }

  async toggleFreezeStatus() {
    const card = this.selectedCard();
    if (!card?.id) return;

    const newStatus = !card.isActive;
    try {
      const reason = newStatus ? 'Re-activated in Operations Center' : 'Temporarily frozen in Operations Center';
      const updated = await this.giftCardService.setStatus(card.id, newStatus, reason);
      this.showToast(`Card ${newStatus ? 'activated' : 'frozen'} successfully.`, 'success');
      this.selectCard(updated);
      await this.loadGiftCards();
    } catch (err: any) {
      console.error('Failed to change card status', err);
      this.showToast(err?.error?.message || 'Failed to update card status', 'error');
    }
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
