import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PromotionService } from '../../services/promotion.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { Promotion, Store } from '../../models/pos.models';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgClass],
  templateUrl: './promotions.html'
})
export class PromotionsComponent implements OnInit {
  public promotions = signal<Promotion[]>([]);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);
  public isAdmin = signal<boolean>(false);

  public totalCount = computed(() => this.promotions().length);
  public activeCount = computed(() => this.promotions().filter(p => p.isActive).length);
  public inactiveCount = computed(() => this.promotions().filter(p => !p.isActive).length);

  public searchQuery = signal<string>('');
  public statusFilter = signal<string>('All');

  public filteredPromotions = computed(() => {
    let list = this.promotions();
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    if (status === 'Active') {
      list = list.filter(p => p.isActive);
    } else if (status === 'Inactive') {
      list = list.filter(p => !p.isActive);
    }

    if (q) {
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }

    return list;
  });

  constructor(
    private promotionService: PromotionService,
    private authService: AuthService,
    private storeService: StoreService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPERVISOR');
    this.isAdmin.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER');
  }

  ngOnInit() {
    this.loadPromotions();
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

  async togglePromotionStatus(promo: Promotion) {
    if (!promo.id) return;
    try {
      await this.promotionService.updatePromotion(promo.id, { ...promo, isActive: !promo.isActive });
      this.loadPromotions();
    } catch (error) {
      console.error('Failed to toggle promotion status', error);
    }
  }

  async deletePromotion(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      await this.promotionService.deletePromotion(id);
      this.loadPromotions();
    } catch (error: any) {
      console.error('Failed to delete promotion', error);
      alert(`Error deleting promotion: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
