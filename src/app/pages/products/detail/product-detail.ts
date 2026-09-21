import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.html'
})
export class ProductDetailComponent implements OnInit {
  public product = signal<any>(null);
  public categoryName = signal<string>('Uncategorized');
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      await this.loadProduct(id);
    }
  }

  async loadProduct(id: string) {
    this.isLoading.set(true);
    try {
      const p = await this.productService.getProductById(id);
      this.product.set(p);

      if (p.categoryId) {
        try {
          const cat = await this.categoryService.getCategoryById(p.categoryId);
          if (cat) this.categoryName.set(cat.name);
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load product details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(val: number | null | undefined): string {
    if (val === null || val === undefined) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
  }

  getTaxLabel(taxCat: number | string | undefined): string {
    if (taxCat === 1 || taxCat === 'ZERO') return 'Zero-Rated (0%)';
    if (taxCat === 2 || taxCat === 'EXEMPT') return 'Exempt (0%)';
    if (taxCat === 3 || taxCat === 'REDUCED') return 'Reduced Rate';
    return 'Standard VAT (7.5%)';
  }

  calculateMargin(): { profit: number; percent: number } {
    const p = this.product();
    if (!p) return { profit: 0, percent: 0 };
    const cost = p.costPrice || 0;
    const price = p.sellingPrice || p.basePrice || 0;
    const profit = price - cost;
    const percent = cost > 0 ? (profit / cost) * 100 : 0;
    return { profit, percent };
  }

  goBack() {
    this.router.navigate(['/app/products']);
  }
}
