import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../../services/inventory.service';
import { ProductService } from '../../../services/product.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-seed-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seed-inventory.html'
})
export class SeedInventoryComponent implements OnInit {
  public stores = signal<any[]>([]);
  public variants = signal<any[]>([]);
  public isLoading = signal<boolean>(true);
  public isSubmitting = signal<boolean>(false);

  public userStoreId = signal<string | null>(null);
  public isGeneral = signal<boolean>(false);

  // Form Model
  public form = {
    variantId: '',
    storeId: '',
    // Packaging
    packs: 0,
    rolls: 0,
    singles: 0,
    quantityOnHand: 0,
    reorderPoint: 5,
    reorderQty: 10,
    // Batch & Expiry
    batchNumber: '',
    productionDate: '',
    expiryDate: '',
    expiryAlertPercentage: 30
  };

  public selectedVariant = signal<any>(null);

  constructor(
    private router: Router,
    private location: Location,
    private inventoryService: InventoryService,
    private productService: ProductService,
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    const role = this.authService.getSystemRole();
    this.isGeneral.set(role === 'TenantAdmin' || role === 'Manager' || role === 'SuperAdmin');

    this.generateDefaultBatchNumber();
    this.loadInitialData();
  }

  goBack() {
    this.router.navigate(['/app/inventory']);
  }

  generateDefaultBatchNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.form.batchNumber = `LOT-${today}-${rand}`;
  }

  async loadInitialData() {
    this.isLoading.set(true);
    try {
      const [storesData, prodData] = await Promise.all([
        this.storeService.getStores(1, 100),
        this.productService.getProducts(1, 100)
      ]);

      const storesList = storesData.items || storesData || [];
      this.stores.set(storesList);

      if (this.userStoreId()) {
        this.form.storeId = this.userStoreId()!;
      } else if (storesList.length > 0) {
        this.form.storeId = storesList[0].id;
      }

      // Flatten variants
      const prods = prodData.items || prodData || [];
      const vList: any[] = [];
      prods.forEach((p: any) => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            vList.push({
              ...v,
              productName: p.name || p.Name,
              brand: p.brand,
              singlesPerPack: p.singlesPerPack || v.conversionFactor || 1,
              singlesPerRoll: p.singlesPerRoll || 1,
              rollsPerPack: p.rollsPerPack || 1,
              conversionFactor: p.singlesPerPack || v.conversionFactor || 1
            });
          });
        }
      });
      this.variants.set(vList);
    } catch (e) {
      console.error('Failed to load stores or products for seed inventory', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  onVariantChange(variantId: string) {
    const v = this.variants().find(x => x.id === variantId);
    this.selectedVariant.set(v || null);

    if (v) {
      if (v.conversionFactor > 1) {
        this.form.packs = 1;
        this.form.rolls = 0;
        this.form.singles = 0;
      } else {
        this.form.packs = 0;
        this.form.rolls = 0;
        this.form.singles = 1;
      }
    }
  }

  calcTotalBaseUnits(): number {
    const v = this.selectedVariant();
    if (!v) return Number(this.form.quantityOnHand || 0);

    const cf = Number(v.conversionFactor || 1);
    const sr = Number(v.singlesPerRoll || 1);

    if (cf > 1 || sr > 1) {
      const p = Number(this.form.packs || 0);
      const r = Number(this.form.rolls || 0);
      const s = Number(this.form.singles || 0);
      return (p * (cf > 1 ? cf : 1)) + (r * (sr > 1 ? sr : 1)) + s;
    }

    return Number(this.form.quantityOnHand || 0);
  }

  getLifespanDays(): number | null {
    if (!this.form.productionDate || !this.form.expiryDate) return null;
    const p = new Date(this.form.productionDate).getTime();
    const e = new Date(this.form.expiryDate).getTime();
    if (isNaN(p) || isNaN(e) || e <= p) return null;
    return Math.round((e - p) / (1000 * 60 * 60 * 24));
  }

  getAlertDate(): string | null {
    const days = this.getLifespanDays();
    if (!days) return null;
    const e = new Date(this.form.expiryDate).getTime();
    const alertDays = Math.round(days * (this.form.expiryAlertPercentage / 100));
    const alertTime = e - (alertDays * 1000 * 60 * 60 * 24);
    return new Date(alertTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async submitSeed() {
    if (!this.form.variantId) {
      alert('Please select a product variant.');
      return;
    }
    if (!this.form.storeId) {
      alert('Please select a target store.');
      return;
    }

    const totalQty = this.calcTotalBaseUnits();

    if (this.form.productionDate && this.form.expiryDate) {
      const p = new Date(this.form.productionDate).getTime();
      const e = new Date(this.form.expiryDate).getTime();
      if (e <= p) {
        alert('Expiration date must be after the production date.');
        return;
      }
    }

    this.isSubmitting.set(true);
    const dto = {
      variantId: this.form.variantId,
      storeId: this.form.storeId,
      quantityOnHand: totalQty,
      reorderPoint: Number(this.form.reorderPoint || 0),
      reorderQty: Number(this.form.reorderQty || 0),
      batchNumber: this.form.batchNumber.trim() || null,
      productionDate: this.form.productionDate ? new Date(this.form.productionDate).toISOString() : null,
      expiryDate: this.form.expiryDate ? new Date(this.form.expiryDate).toISOString() : null,
      expiryAlertPercentage: Number(this.form.expiryAlertPercentage || 30)
    };

    try {
      await this.inventoryService.createInventory(dto);
      this.router.navigate(['/app/inventory']);
    } catch (error: any) {
      console.error('Failed to seed inventory', error);
      alert(`Failed to seed inventory: ${error.error?.message || error.message || 'Product might already exist in this store.'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
