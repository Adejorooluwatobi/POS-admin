import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { ProductService } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './category-detail.html'
})
export class CategoryDetailComponent implements OnInit {
  public category = signal<any>(null);
  public products = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private productService: ProductService,
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
      const [catData, prodData] = await Promise.all([
        this.categoryService.getCategoryById(id),
        this.productService.getProducts()
      ]);
      this.category.set(catData);
      const allProds = prodData.items || prodData;
      this.products.set(allProds.filter((p: any) => p.categoryId === id));
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load category details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val || 0);
  }

  goBack() {
    this.router.navigate(['/app/categories']);
  }
}
