import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { Product, Category, Store } from '../../models/pos.models';
import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner';

export interface EnrichedProduct extends Product {
  marginPct: number;
  stockLevel: number;
  stockStatus: 'OPTIMAL' | 'LOW' | 'OUT';
  downtownStock: number;
  westsideStock: number;
  fastGridTile?: string;
  imageUrl?: string | null;
  department: string;
  storeId?: string;
  isSelected?: boolean;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BarcodeScannerComponent, NgClass],
  templateUrl: './products.html'
})
export class ProductsComponent implements OnInit {
  public products = signal<EnrichedProduct[]>([]);
  public categories = signal<Category[]>([]);
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  // Filters & State
  public selectedCategory = signal<string>('ALL');
  public searchQuery = signal<string>('');
  public selectedStore = signal<string>('ALL');
  public stockFilter = signal<'ALL' | 'LOW' | 'OUT' | 'OPTIMAL'>('ALL');
  public selectAll = signal<boolean>(false);

  // Barcode Scanner State
  public isScannerOpen = signal<boolean>(false);

  // Computed Metrics
  public totalActiveSkus = computed(() => {
    return this.products().length;
  });

  public totalValuationCost = computed(() => {
    return this.products().reduce((acc, p) => acc + ((p.cost || 0) * (p.stockLevel || 0)), 0);
  });

  public totalValuationRetail = computed(() => {
    return this.products().reduce((acc, p) => acc + ((p.price || 0) * (p.stockLevel || 0)), 0);
  });

  public lowStockCount = computed(() => {
    return this.products().filter(p => p.stockStatus === 'LOW').length;
  });

  public outOfStockCount = computed(() => {
    return this.products().filter(p => p.stockStatus === 'OUT').length;
  });

  public categoryCounts = computed(() => {
    const counts: Record<string, number> = { ALL: this.products().length };
    for (const p of this.products()) {
      const cat = p.cat || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  });

  public filteredProducts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const stock = this.stockFilter();

    return this.products().filter(p => {
      const matchesQuery = !q ||
        (p.n && p.n.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.cat && p.cat.toLowerCase().includes(q));

      const matchesCat = cat === 'ALL' || p.cat === cat || p.categoryId === cat;
      const matchesStock = stock === 'ALL' || p.stockStatus === stock;
      const matchesStore = this.selectedStore() === 'ALL' || p.storeId === this.selectedStore() || (p.storeOverrides && p.storeOverrides.some((o: any) => o.storeId === this.selectedStore()));

      return matchesQuery && matchesCat && matchesStock && matchesStore;
    });
  });

  public hasActiveFilters = computed(() => {
    return this.selectedCategory() !== 'ALL' ||
      this.stockFilter() !== 'ALL' ||
      this.selectedStore() !== 'ALL' ||
      !!this.searchQuery().trim();
  });

  public clearAllFilters() {
    this.selectedCategory.set('ALL');
    this.stockFilter.set('ALL');
    this.selectedStore.set('ALL');
    this.searchQuery.set('');
  }

  public getSelectedStoreName(): string {
    const s = this.stores().find(st => st.id === this.selectedStore());
    return s ? s.name : this.selectedStore();
  }

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

  async ngOnInit() {
    await Promise.all([this.loadCategories(), this.loadStores()]);
    await this.loadProducts();
  }

  async loadCategories() {
    try {
      const data = await this.categoryService.getCategories();
      this.categories.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load categories', error);
      this.categories.set([]);
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load stores', error);
      this.stores.set([]);
    }
  }

  async loadProducts() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.productService.getProducts();
      const items = data.items || data;
      const user = this.authService.currentUser();
      const cats = this.categories();

      let filteredItems = items;
      if (user && (user.role === 'STORE_MANAGER' || user.role === 'SUPERVISOR')) {
        filteredItems = Array.isArray(items) ? items.filter((p: any) => p.storeId === null || p.storeId === user.store) : [];
      }

      if (Array.isArray(filteredItems) && filteredItems.length > 0) {
        this.products.set(this.enrichProducts(filteredItems, cats, user));
      } else {
        this.products.set([]);
      }
    } catch (error: any) {
      console.error('Failed to load products from API', error);
      this.errorMessage.set(error?.error?.message || 'Unable to load products from backend.');
      this.products.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private enrichProducts(items: any[], cats: Category[], user: any): EnrichedProduct[] {
    return items.map((p, idx) => {
      const catObj = cats.find(c => c.id === p.categoryId);
      let effectivePrice = p.basePrice || p.sellingPrice || p.price || 0;
      let cost = p.costPrice || p.cost || 0;

      if (user?.store && p.storeOverrides) {
        const over = p.storeOverrides.find((o: any) => o.storeId === user.store && o.isActive);
        if (over) effectivePrice = over.price;
      }

      const marginPct = effectivePrice > 0 ? Math.round(((effectivePrice - cost) / effectivePrice) * 100) : 0;
      const stockLevel = p.stockLevel !== undefined ? p.stockLevel : (p.stock !== undefined ? p.stock : 0);
      const stockStatus: 'OPTIMAL' | 'LOW' | 'OUT' = stockLevel <= 0 ? 'OUT' : stockLevel < 15 ? 'LOW' : 'OPTIMAL';

      // Barcode extraction
      let barcodeStr = p.barcode || '';
      if (!barcodeStr && p.barcodes && p.barcodes.length > 0) {
        barcodeStr = typeof p.barcodes[0] === 'string' ? p.barcodes[0] : (p.barcodes[0]?.barcode || '');
      }

      return {
        ...p,
        id: p.id || `prod-${idx}`,
        n: p.name || p.n || 'Catalog Item',
        sku: p.masterSku || p.sku || '—',
        cat: catObj ? catObj.name : (p.category?.name || p.cat || 'General'),
        e: p.e || '📦',
        price: effectivePrice,
        cost: cost,
        tax: p.tax || (p.taxCategory === 1 ? 'ZERO' : p.taxCategory === 2 ? 'EXEMPT' : 'STANDARD'),
        status: p.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        barcode: barcodeStr || '—',
        marginPct: marginPct,
        stockLevel: stockLevel,
        stockStatus: stockStatus,
        downtownStock: p.downtownStock !== undefined ? p.downtownStock : stockLevel,
        westsideStock: p.westsideStock !== undefined ? p.westsideStock : 0,
        fastGridTile: p.fastGridTile || 'Disabled',
        department: catObj ? catObj.name : (p.department || 'Front Counter'),
        imageUrl: p.imageUrl || null
      };
    });
  }

  // Fast-Grid Tile Quick Cycle
  cycleFastGridTile(p: EnrichedProduct, event: Event) {
    event.stopPropagation();
    const tiles = ['Tile #01', 'Tile #02', 'Tile #04', 'Tile #05', 'Tile #08', 'Tile #11', 'Disabled'];
    const currentIdx = tiles.indexOf(p.fastGridTile || 'Disabled');
    const nextTile = tiles[(currentIdx + 1) % tiles.length];
    p.fastGridTile = nextTile;

    // Persist quick toggle to backend
    if (p.id) {
      this.productService.updateProduct(p.id, { fastGridTile: nextTile }).catch(err => {
        console.warn('Failed to update tile on backend', err);
      });
    }
  }

  // Selection
  toggleSelectAll() {
    const newVal = !this.selectAll();
    this.selectAll.set(newVal);
    this.products.update(list => list.map(p => ({ ...p, isSelected: newVal })));
  }

  toggleItemSelect(p: EnrichedProduct) {
    p.isSelected = !p.isSelected;
  }

  // Barcode Handlers
  openScanner() {
    this.isScannerOpen.set(true);
  }

  closeScanner() {
    this.isScannerOpen.set(false);
  }

  handleScan(barcode: string) {
    this.closeScanner();
    this.searchQuery.set(barcode);
  }

  async deleteProduct(id: string | undefined, event?: Event) {
    if (event) event.stopPropagation();
    if (!id) return;
    if (!confirm('Are you sure you want to permanently delete this product?')) return;

    try {
      await this.productService.deleteProduct(id);
      this.products.update(list => list.filter(p => p.id !== id));
    } catch (e: any) {
      console.error('API delete failed', e);
      alert(e?.error?.message || 'Failed to delete product from database.');
    }
  }

  formatNum(val: number | undefined): string {
    if (val === undefined || val === null) return '0.00';
    return val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
