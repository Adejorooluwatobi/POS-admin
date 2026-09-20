import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-form.html'
})
export class ProductFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public productId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public categories = signal<any[]>([]);
  public stores = signal<any[]>([]);

  // Product Form Model
  public product = signal<any>({
    name: '',
    masterSku: '',
    brand: '',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    taxCategory: 'STANDARD',
    taxRate: 7.5,
    isActive: true,
    weightGrams: null,
    unitOfMeasure: 'Each',
    categoryId: '',
    barcodes: [] as string[],
    singlesPerRoll: null,
    rollsPerPack: null,
    singlesPerPack: null,
    rollPrice: null,
    packPrice: null
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private storeService: StoreService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadCategories(), this.loadStores()]);

    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.productId.set(id);
      await this.loadProduct(id);
    }
  }

  async loadCategories() {
    try {
      const data = await this.categoryService.getCategories();
      this.categories.set(data.items || data);
    } catch (e) {
      console.error('Failed to load categories', e);
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

  async loadProduct(id: string) {
    this.isLoading.set(true);
    try {
      const p = await this.productService.getProductById(id);
      const taxCategoryName = p.taxCategory === 1 ? 'ZERO' : p.taxCategory === 2 ? 'EXEMPT' : p.taxCategory === 3 ? 'REDUCED' : 'STANDARD';
      
      this.product.set({
        id: p.id,
        name: p.name,
        masterSku: p.masterSku,
        brand: p.brand || '',
        description: p.description || '',
        costPrice: p.costPrice || 0,
        sellingPrice: p.sellingPrice || p.basePrice || 0,
        taxCategory: taxCategoryName,
        taxRate: p.taxRate !== undefined ? p.taxRate : 7.5,
        isActive: p.isActive !== undefined ? p.isActive : true,
        weightGrams: p.weightGrams,
        unitOfMeasure: p.unitOfMeasure || 'Each',
        categoryId: p.categoryId || '',
        barcodes: p.barcodes ? p.barcodes.map((b: any) => typeof b === 'string' ? b : b.barcode) : [],
        singlesPerRoll: p.singlesPerRoll,
        rollsPerPack: p.rollsPerPack,
        singlesPerPack: p.singlesPerPack,
        rollPrice: p.rollPrice,
        packPrice: p.packPrice
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load product details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  addBarcode(code: string) {
    const trimmed = code?.trim();
    if (!trimmed) return;
    const current = this.product();
    const list = [...(current.barcodes || [])];
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      this.product.update(p => ({ ...p, barcodes: list }));
    }
  }

  removeBarcode(code: string) {
    this.product.update(p => ({
      ...p,
      barcodes: (p.barcodes || []).filter((b: string) => b !== code)
    }));
  }

  onTaxCategoryChange() {
    const cat = this.product().taxCategory;
    if (cat === 'STANDARD') {
      this.product.update(p => ({ ...p, taxRate: 7.5 }));
    } else {
      this.product.update(p => ({ ...p, taxRate: 0 }));
    }
  }

  async saveProduct() {
    const p = this.product();
    if (!p.name || !p.name.trim()) {
      this.errorMessage.set('Product Name is required.');
      return;
    }
    if (!p.masterSku || !p.masterSku.trim()) {
      this.errorMessage.set('Master SKU is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();
    const taxCatNum = p.taxCategory === 'STANDARD' ? 0 : p.taxCategory === 'ZERO' ? 1 : p.taxCategory === 'EXEMPT' ? 2 : 3;

    const dto = {
      name: p.name.trim(),
      masterSku: p.masterSku.trim(),
      brand: p.brand || 'RetailOS',
      description: p.description,
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      weightGrams: p.weightGrams ? Number(p.weightGrams) : null,
      unitOfMeasure: p.unitOfMeasure || 'Each',
      taxCategory: taxCatNum,
      taxRate: Number(p.taxRate) || 0,
      isActive: Boolean(p.isActive),
      tenantId: user?.tenantId,
      categoryId: p.categoryId || null,
      barcodes: p.barcodes || [],
      singlesPerRoll: p.singlesPerRoll ? Number(p.singlesPerRoll) : null,
      rollsPerPack: p.rollsPerPack ? Number(p.rollsPerPack) : null,
      singlesPerPack: p.singlesPerPack ? Number(p.singlesPerPack) : null,
      rollPrice: p.rollPrice ? Number(p.rollPrice) : null,
      packPrice: p.packPrice ? Number(p.packPrice) : null
    };

    try {
      if (this.isEditMode()) {
        await this.productService.updateProduct(this.productId()!, { ...dto, id: this.productId()! });
      } else {
        await this.productService.createProduct(dto);
      }
      this.router.navigate(['/app/products']);
    } catch (err: any) {
      console.error('Save product error', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save product. Check inputs and try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/products']);
  }
}
