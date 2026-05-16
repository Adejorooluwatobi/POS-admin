import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GiftCardService } from '../../services/gift-card.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { GiftCard, Store } from '../../models/pos.models';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './gift-cards.html'
})
export class GiftCardsComponent implements OnInit {
  public giftCards = signal<GiftCard[]>([]);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);
  public isAdmin = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'issue' | 'view'>('issue');
  public newCard = signal({
    cardNumber: '',
    initialValue: 0,
    expiresAt: '',
    pin: '',
    issuingStoreId: null as string | null
  });

  constructor(
    private giftCardService: GiftCardService,
    public authService: AuthService,
    private storeService: StoreService
  ) {
    const user = this.authService.currentUser();
    this.isAdmin.set(
      user?.role === 'TENANT_ADMIN' || 
      user?.role === 'MANAGER' || 
      user?.role === 'STORE_MANAGER' || 
      user?.role === 'SUPERVISOR' || 
      user?.role === 'CASHIER'
    );
  }

  ngOnInit() {
    this.loadGiftCards();
    if (this.isAdmin()) {
      this.loadStores();
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  async loadGiftCards() {
    this.isLoading.set(true);
    try {
      const data = await this.giftCardService.getGiftCards();
      this.giftCards.set(data.items || data);
    } catch (error) {
      console.error('Failed to load gift cards', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openIssueModal() {
    this.modalMode.set('issue');
    this.newCard.set({
      cardNumber: this.generateCardNumber(),
      initialValue: 0,
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      issuingStoreId: null
    });
    this.isModalOpen.set(true);
  }

  generateCardNumber(): string {
    return 'GC-' + Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async issueCard() {
    try {
      await this.giftCardService.issueGiftCard(this.newCard());
      this.closeModal();
      this.loadGiftCards();
    } catch (error) {
      console.error('Failed to issue gift card', error);
      alert('Error issuing gift card');
    }
  }

  async toggleCardStatus(card: GiftCard) {
    if (!card.id) return;
    try {
      await this.giftCardService.updateGiftCard(card.id, { id: card.id, isActive: !card.isActive });
      this.loadGiftCards();
    } catch (error) {
      console.error('Failed to toggle card status', error);
    }
  }

  async deleteCard(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this gift card?')) return;

    try {
      await this.giftCardService.deleteGiftCard(id);
      this.loadGiftCards();
    } catch (error: any) {
      console.error('Failed to delete gift card', error);
      alert(`Error deleting gift card: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
