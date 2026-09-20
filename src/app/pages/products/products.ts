import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { Product, Category, Store } from '../../models/pos.models';
import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BarcodeScannerComponent],
  templateUrl: './products.html'
})
export class ProductsComponent implements OnInit {
  public products = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  public allProducts = signal<Product[]>([]);
  public isScannerOpen = signal<boolean>(false);
  public scannerTarget = signal<'search' | 'create'>('search');

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private storeService: StoreService,
    public authService: AuthService,
    private router: Router
  ) {
    const user = this.authService.currentUser();
    this.isGeneral.set(
      user?.role === 'TENANT_ADMIN' || 
      user?.role === 'MANAGER' || 
      user?.role === 'STORE_MANAGER' || 
      user?.role === 'SUPERVISOR' || 
      user?.role === 'CASHIER'
    );
    this.isOwner.set(!!user);
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
    await this.loadStores();
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

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  async loadProducts() {
    try {
      const data = await this.productService.getProducts();
      const items = data.items || data;
      const user = this.authService.currentUser();
      const cats = this.categories();

      let filteredItems = items;
      
      if (user && (user.role === 'STORE_MANAGER' || user.role === 'SUPERVISOR')) {
        filteredItems = items.filter((p: any) => p.storeId === null || p.storeId === user.store);
      }

      this.products.set(filteredItems.map((p: any) => {
        const catObj = cats.find(c => c.id === p.categoryId);
        
        // Resolve Effective Prices (Overrides for current store)
        let effectivePrice = p.basePrice || 0;
        let effectiveRollPrice = p.rollPrice || 0;
        let effectivePackPrice = p.packPrice || 0;

        if (user?.store && p.storeOverrides) {
          const over = p.storeOverrides.find((o: any) => o.storeId === user.store && o.isActive);
          if (over) {
            effectivePrice = over.price;
            if (over.rollPrice) effectiveRollPrice = over.rollPrice;
            if (over.packPrice) effectivePackPrice = over.packPrice;
          }
        }

        return {
          ...p,
          n: p.name,
          sku: p.masterSku,
          cat: catObj ? catObj.name : 'General',
          e: '📦',
          price: effectivePrice,
          cost: p.costPrice || 0,
          weight: p.weightGrams,
          uom: p.unitOfMeasure,
          status: p.isActive !== undefined ? (p.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
          tax: p.taxCategory !== undefined ? (p.taxCategory === 0 ? 'STANDARD' : p.taxCategory === 1 ? 'ZERO' : p.taxCategory === 2 ? 'EXEMPT' : 'REDUCED') : 'STANDARD',
          taxRate: p.taxRate || 0,
          barcode: p.barcode,
          singlesPerRoll: p.singlesPerRoll || 1,
          rollsPerPack: p.rollsPerPack || 1,
          singlesPerPack: p.singlesPerPack || (p.singlesPerRoll * p.rollsPerPack) || 1,
          rollPrice: effectiveRollPrice,
          packPrice: effectivePackPrice
        };
      }));
      this.allProducts.set(this.products());
    } catch (error) {
      console.error('Failed to load products', error);
    }
  }

  filterProducts(query: string) {
    if (!query) {
      this.products.set(this.allProducts());
      return;
    }
    const q = query.toLowerCase();
    this.products.set(this.allProducts().filter(p => 
      p.n.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.cat && p.cat.toLowerCase().includes(q)) ||
      (p.barcodes && p.barcodes.some((b: string) => b.toLowerCase().includes(q)))
    ));
  }

  async onBarcodeScanned(barcode: string) {
    if (!barcode) return;
    try {
      const product = await this.productService.getProductByBarcode(barcode);
      if (product && product.id) {
        this.router.navigate(['/app/products', product.id]);
      }
    } catch (error) {
      console.warn('Product not found by barcode', barcode);
      if (confirm('Product not found. Would you like to create a new product?')) {
        this.router.navigate(['/app/products/new']);
      }
    }
  }

  openScanner(target: 'search' | 'create') {
    this.scannerTarget.set(target);
    this.isScannerOpen.set(true);
  }

  closeScanner() {
    this.isScannerOpen.set(false);
  }

  handleScan(barcode: string) {
    this.closeScanner();
    this.onBarcodeScanned(barcode);
  }
}
