import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { Product, Category, Store } from '../../models/pos.models';

import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScannerComponent],
  templateUrl: './products.html'
})
export class ProductsComponent implements OnInit {
  public products = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public stores = signal<Store[]>([]);
  public isOwner = signal<boolean>(false);
  public isGeneral = signal<boolean>(false);
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
    taxRate: 7.5,
    status: 'ACTIVE',
    barcode: '',
    barcodes: [],
    targetStoreIds: [],
    storeOverrides: []
  });
  public allProducts = signal<Product[]>([]);
  public isScannerOpen = signal<boolean>(false);
  public scannerTarget = signal<'search' | 'create'>('search');

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private storeService: StoreService,
    public authService: AuthService
  ) {
    const user = this.authService.currentUser();
    // Generals are SuperAdmin, TenantAdmin, and Manager (5)
    this.isGeneral.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER');
    // Staff who can access the catalog at all
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
        
        // Resolve Effective Price (Override for current store)
        let effectivePrice = p.basePrice || 0;
        if (user?.store && p.storeOverrides) {
          const over = p.storeOverrides.find((o: any) => o.storeId === user.store && o.isActive);
          if (over) effectivePrice = over.price;
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
          barcode: p.barcode
        };
      }));
      this.allProducts.set(this.products());
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
      taxRate: 7.5,
      status: 'ACTIVE',
      barcode: '',
      barcodes: [],
      targetStoreIds: []
    });
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product) {
    this.modalMode.set('edit');
    this.selectedProduct.set({ 
      ...product,
      barcodes: product.barcodes || (product.barcode ? [product.barcode] : []),
      targetStoreIds: [] 
    });
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
      taxRate: p.taxRate,
      isActive: p.status === 'ACTIVE',
      tenantId: user?.tenantId,
      categoryId: p.categoryId,
      targetStoreIds: p.targetStoreIds,
      barcodes: p.barcodes
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

  addBarcode(bc: string) {
    if (!bc) return;
    const current = this.selectedProduct();
    const barcodes = [...(current.barcodes || [])];
    if (!barcodes.includes(bc)) {
      barcodes.push(bc);
      this.selectedProduct.update(p => ({ ...p, barcodes, barcode: bc }));
    }
  }

  removeBarcode(bc: string) {
    const current = this.selectedProduct();
    const barcodes = (current.barcodes || []).filter(b => b !== bc);
    this.selectedProduct.update(p => ({ ...p, barcodes }));
  }

  toggleStoreTarget(storeId: string | undefined) {
    if (!storeId) return;
    const current = this.selectedProduct();
    let targets = [...(current.targetStoreIds || [])];
    if (targets.includes(storeId)) {
      targets = targets.filter(id => id !== storeId);
    } else {
      targets.push(storeId);
    }
    this.selectedProduct.update(p => ({ ...p, targetStoreIds: targets }));
  }

  toggleAllStores() {
    const current = this.selectedProduct();
    if (current.targetStoreIds?.length === this.stores().length) {
      this.selectedProduct.update(p => ({ ...p, targetStoreIds: [] }));
    } else {
      const allIds = this.stores().map(s => s.id!).filter(id => !!id);
      this.selectedProduct.update(p => ({ ...p, targetStoreIds: allIds }));
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
      p.barcode?.toLowerCase().includes(q)
    ));
  }

  async onBarcodeScanned(barcode: string) {
    if (!barcode) return;
    
    // First check local list
    const foundLocal = this.allProducts().find(p => p.barcode === barcode);
    if (foundLocal) {
      this.openViewModal(foundLocal);
      return;
    }

    // If not in local list, search API
    try {
      const product = await this.productService.getProductByBarcode(barcode);
      if (product) {
        // Map backend product to frontend model
        const mapped = {
          ...product,
          n: product.name,
          sku: product.masterSku,
          e: '📦',
          price: product.basePrice || 0,
          cost: product.costPrice || 0,
          weight: product.weightGrams,
          uom: product.unitOfMeasure,
          status: product.isActive ? 'ACTIVE' : 'INACTIVE',
          tax: product.taxCategory === 0 ? 'STANDARD' : product.taxCategory === 1 ? 'ZERO' : product.taxCategory === 2 ? 'EXEMPT' : 'REDUCED',
          taxRate: product.taxRate || 0,
          barcode: product.barcode
        };
        this.openViewModal(mapped);
      }
    } catch (error) {
      console.warn('Product not found by barcode', barcode);
      // Optional: open create modal with barcode pre-filled
      if (confirm('Product not found. Would you like to create a new product with this barcode?')) {
        this.openCreateModal();
        this.selectedProduct.update(p => ({ ...p, barcode }));
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
    if (this.scannerTarget() === 'search') {
      this.onBarcodeScanned(barcode);
    } else {
      this.addBarcode(barcode);
    }
  }
}
