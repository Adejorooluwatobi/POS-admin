import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PromotionService } from '../../../services/promotion.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promotion-detail.html'
})
export class PromotionDetailComponent implements OnInit {
  public promotion = signal<any>(null);
  public storeName = signal<string>('All Stores (Global)');
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public copied = signal<boolean>(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private promotionService: PromotionService,
    private storeService: StoreService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      await this.loadData(id);
    }
  }

  async loadData(id: string) {
    this.isLoading.set(true);
    try {
      const p = await this.promotionService.getPromotionById(id);
      this.promotion.set(p);

      if (p.storeId) {
        try {
          const store = await this.storeService.getStoreById(p.storeId);
          if (store) this.storeName.set(store.name);
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load promotion details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val || 0);
  }

  goBack() {
    this.router.navigate(['/app/promotions']);
  }
}
