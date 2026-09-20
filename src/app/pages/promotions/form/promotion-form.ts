import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PromotionService } from '../../../services/promotion.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-promotion-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './promotion-form.html'
})
export class PromotionFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public promotionId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public stores = signal<any[]>([]);

  public promotion = signal<any>({
    name: '',
    code: '',
    discountType: 'PERCENT',
    value: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    scope: 'CART',
    storeId: null,
    isActive: true
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private promotionService: PromotionService,
    private storeService: StoreService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadStores();
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.promotionId.set(id);
      await this.loadPromotion(id);
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  }

  async loadPromotion(id: string) {
    this.isLoading.set(true);
    try {
      const p = await this.promotionService.getPromotionById(id);
      this.promotion.set({
        id: p.id,
        name: p.name,
        code: p.code,
        discountType: p.type?.toUpperCase() || 'PERCENT',
        value: p.value || 0,
        startDate: p.startsAt ? p.startsAt.split('T')[0] : '',
        endDate: p.endsAt ? p.endsAt.split('T')[0] : '',
        scope: p.scope?.toUpperCase() || 'CART',
        storeId: p.storeId || null,
        isActive: p.isActive !== undefined ? p.isActive : true
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load promotion.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePromotion() {
    const p = this.promotion();
    if (!p.name || !p.name.trim()) {
      this.errorMessage.set('Campaign Name is required.');
      return;
    }
    if (!p.code || !p.code.trim()) {
      this.errorMessage.set('Coupon Code is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();
    const payload = {
      name: p.name.trim(),
      code: p.code.trim().toUpperCase(),
      type: p.discountType === 'PERCENT' ? 'Percent' : p.discountType === 'FIXED' ? 'Fixed' : p.discountType === 'BOGO' ? 'Bogo' : 'Bundle',
      scope: p.scope === 'PRODUCT' ? 'Product' : p.scope === 'CATEGORY' ? 'Category' : 'Cart',
      value: Number(p.value) || 0,
      startsAt: p.startDate,
      endsAt: p.endDate,
      tenantId: user?.tenantId,
      storeId: p.storeId || null,
      isActive: Boolean(p.isActive)
    };

    try {
      if (this.isEditMode()) {
        await this.promotionService.updatePromotion(this.promotionId()!, { ...payload, id: this.promotionId()! });
      } else {
        await this.promotionService.createPromotion(payload);
      }
      this.router.navigate(['/app/promotions']);
    } catch (err: any) {
      console.error('Failed to save promotion', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save promotion.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/promotions']);
  }
}
