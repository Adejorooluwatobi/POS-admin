import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromotionService } from '../../services/promotion.service';
import { AuthService } from '../../services/auth.service';
import { Promotion } from '../../models/pos.models';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotions.html'
})
export class PromotionsComponent implements OnInit {
  public promotions = signal<Promotion[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedPromotion = signal<Partial<Promotion>>({
    name: '',
    code: '',
    discountType: 'PERCENT',
    value: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    scope: 'CART'
  });

  constructor(
    private promotionService: PromotionService,
    private authService: AuthService
  ) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
  }

  ngOnInit() {
    this.loadPromotions();
  }

  async loadPromotions() {
    this.isLoading.set(true);
    try {
      const data = await this.promotionService.getPromotions();
      const items = data.items || data;
      this.promotions.set(items.map((p: any) => ({
        ...p,
        discountType: p.type?.toUpperCase() || 'PERCENT',
        startDate: p.startsAt?.split('T')[0],
        endDate: p.endsAt?.split('T')[0],
        scope: p.scope?.toUpperCase() || 'CART'
      })));
    } catch (error) {
      console.error('Failed to load promotions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedPromotion.set({
      name: '',
      code: '',
      discountType: 'PERCENT',
      value: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      scope: 'CART'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(promo: Promotion) {
    this.modalMode.set('edit');
    this.selectedPromotion.set({ ...promo });
    this.isModalOpen.set(true);
  }

  openViewModal(promo: Promotion) {
    this.modalMode.set('view');
    this.selectedPromotion.set({ ...promo });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async savePromotion() {
    const p = this.selectedPromotion();
    const user = this.authService.currentUser();
    const payload = {
      name: p.name,
      type: p.discountType === 'PERCENT' ? 'Percent' : p.discountType === 'FIXED' ? 'Fixed' : p.discountType === 'BOGO' ? 'Bogo' : 'Bundle',
      scope: p.scope === 'PRODUCT' ? 'Product' : p.scope === 'CATEGORY' ? 'Category' : 'Cart',
      value: p.value,
      startsAt: p.startDate,
      endsAt: p.endDate,
      tenantId: user?.tenantId
    };

    try {
      if (this.modalMode() === 'create') {
        await this.promotionService.createPromotion(payload);
      } else if (this.modalMode() === 'edit' && p.id) {
        await this.promotionService.updatePromotion(p.id, payload);
      }
      this.closeModal();
      this.loadPromotions();
    } catch (error: any) {
      console.error('Failed to save promotion', error);
      alert(`Error saving promotion: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
