import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { Product, Category } from '../../models/pos.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './products.html'
})
export class ProductsComponent implements OnInit {
  public products = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public isOwner = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedProduct = signal<Partial<Product>>({
    n: '',
    e: '📦',
    sku: '',
    cat: '',
    categoryId: '',
    cost: 0,
    price: 0,
    tax: 'STANDARD',
    status: 'ACTIVE'
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    public authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPERVISOR');
  }

  async deleteProduct(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await this.productService.deleteProduct(id);
      this.loadProducts();
    } catch (error: any) {
      console.error('Failed to delete product', error);
      alert(`Error deleting product: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadCategories();
    await this.loadProducts();
    this.isLoading.set(false);
  }

  async loadCategories() {
    try {
      const data = await this.categoryService.getCategories();
      this.categories.set(data.items || data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  }

  async loadProducts() {
    try {
      const data = await this.productService.getProducts();
      const items = data.items || data;
      const cats = this.categories();

      this.products.set(items.map((p: any) => {
        const catObj = cats.find(c => c.id === p.categoryId);
        return {
          ...p,
          n: p.name,
          sku: p.masterSku,
          cat: catObj ? catObj.name : 'General',
          e: '📦',
          price: p.basePrice || 0,
          cost: p.costPrice || 0,
          weight: p.weightGrams,
          uom: p.unitOfMeasure,
          status: p.isActive !== undefined ? (p.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
          tax: p.taxCategory || 'STANDARD'
        };
      }));
    } catch (error) {
      console.error('Failed to load products', error);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedProduct.set({
      n: '',
      e: '📦',
      sku: '',
      cat: '',
      categoryId: '',
      cost: 0,
      price: 0,
      tax: 'STANDARD',
      status: 'ACTIVE'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product) {
    this.modalMode.set('edit');
    this.selectedProduct.set({ ...product });
    this.isModalOpen.set(true);
  }

  openViewModal(product: Product) {
    this.modalMode.set('view');
    this.selectedProduct.set({ ...product });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveProduct() {
    const p = this.selectedProduct();
    const user = this.authService.currentUser();
    const dto = {
      name: p.n,
      masterSku: p.sku,
      brand: p.brand || 'RetailOS',
      description: p.description,
      costPrice: p.cost,
      sellingPrice: p.price,
      weightGrams: p.weight,
      unitOfMeasure: p.uom || 'Each',
      taxCategory: p.tax === 'STANDARD' ? 0 : p.tax === 'ZERO' ? 1 : p.tax === 'EXEMPT' ? 2 : 3,
      isActive: p.status === 'ACTIVE',
      tenantId: user?.tenantId,
      categoryId: p.categoryId
    };

    try {
      if (this.modalMode() === 'create') {
        await this.productService.createProduct(dto);
      } else if (this.modalMode() === 'edit' && p.id) {
        await this.productService.updateProduct(p.id, { ...dto, id: p.id });
      }
      this.closeModal();
      await this.loadProducts();
    } catch (error: any) {
      console.error('Failed to save product', error);
      alert(`Error saving product: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
