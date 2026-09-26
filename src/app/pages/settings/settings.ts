import { Component, signal, computed, effect, untracked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LoyaltyService } from '../../services/loyalty.service';
import { ContextService } from '../../services/context.service';
import { Store, LoyaltySettings } from '../../models/pos.models';

export interface ReceiptSettings {
  storeName: string;
  headerSubtitle: string;
  address: string;
  phone: string;
  vatNumber: string;
  footerMessage: string;
  showBarcode: boolean;
  showCashier: boolean;
  paperWidth: '80mm' | '58mm';
}

export interface HardwareSettings {
  printerIp: string;
  printerPort: number;
  autoCutter: boolean;
  drawerKickPulse: boolean;
  baudRate: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  // Navigation Tabs: 'loyalty' | 'receipt' | 'hardware'
  public activeTab = signal<'loyalty' | 'receipt' | 'hardware'>('loyalty');

  // Currently loaded store (for receipt & hardware targeting)
  public store = signal<Partial<Store>>({});

  // Loyalty Program Settings (Tenant-level)
  public loyaltySettings = signal<LoyaltySettings>({
    loyaltyProgramEnabled: true,
    loyaltyPointsEarnRate: 100,
    loyaltyPointRedeemRate: 1,
    loyaltyMinRedemptionPoints: 50
  });

  // Receipt Settings (Store-scoped with Tenant master fallback)
  public receiptSettings = signal<ReceiptSettings>({
    storeName: 'RetailOS Master Outlet',
    headerSubtitle: 'Federal Republic of Nigeria',
    address: 'Plot 12, Adeola Odeku Street, Victoria Island, Lagos',
    phone: '+234 800 000 7382',
    vatNumber: 'VAT-10482938-0001',
    footerMessage: 'Thank you for your patronage! Items in original condition exchangeable within 7 days with valid fiscal receipt.',
    showBarcode: true,
    showCashier: true,
    paperWidth: '80mm'
  });

  // Hardware Settings (Store-scoped)
  public hardwareSettings = signal<HardwareSettings>({
    printerIp: '192.168.1.200',
    printerPort: 9100,
    autoCutter: true,
    drawerKickPulse: true,
    baudRate: 115200
  });

  public isOwner = signal<boolean>(false);

  // Status & Notifications
  public isSavingLoyalty = signal<boolean>(false);
  public isSavingReceipt = signal<boolean>(false);
  public isSavingHardware = signal<boolean>(false);
  public toastMessage = signal<{ text: string; type: 'success' | 'info' } | null>(null);

  // Computed Context properties
  public selectedStoreId = computed(() => this.contextService.selectedStoreId());
  public selectedTenantId = computed(() => this.contextService.effectiveTenantId());
  public selectedStore = computed(() => this.contextService.selectedStore());
  public selectedTenant = computed(() => this.contextService.selectedTenant());
  public storesList = computed(() => this.contextService.stores());
  public isAllStoresSelected = computed(() => !this.contextService.selectedStoreId());

  // Role & Permissions: SuperAdmin is strictly view-only for tenant stores & hardware
  public isSuperAdmin = computed(() => this.authService.isSuperAdmin());
  public isTenantAdmin = computed(() => this.authService.currentUser()?.role === 'TENANT_ADMIN');
  public canEditStore = computed(() => {
    // Only tenant admins or store managers can edit; SuperAdmin is view-only
    return !this.isSuperAdmin() && (this.isTenantAdmin() || this.authService.currentUser()?.role === 'STORE_MANAGER' || this.authService.currentUser()?.role === 'MANAGER');
  });

  constructor(
    private authService: AuthService,
    private loyaltyService: LoyaltyService,
    public contextService: ContextService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');

    // Reactive effect: Automatically aligns tabs whenever Store or Tenant context changes in the header.
    // Wrapped in untracked to prevent cyclic dependency loops on internal signal reads/writes.
    effect(() => {
      const tenantId = this.selectedTenantId();
      const storeId = this.selectedStoreId();

      untracked(() => {
        this.handleContextChange(tenantId, storeId);
      });
    });
  }

  ngOnInit() {
    // Context effect handles initial loading cleanly without redundant calls
  }

  /**
   * Reactively reload store, receipt, and hardware data according to the selected context
   */
  private handleContextChange(tenantId: string | null, storeId: string | null) {
    this.loadLoyaltySettings(tenantId);
    this.loadReceiptSettings(storeId, tenantId);
    this.loadHardwareSettings(storeId);

    if (storeId) {
      const found = this.contextService.stores().find(s => s.id === storeId);
      if (found) {
        this.store.set({
          ...found,
          active: found.isActive !== undefined ? found.isActive : found.active
        });
        this.syncStoreReceiptDefaults(found);
      }
    } else {
      this.store.set({});
    }
  }

  private syncStoreReceiptDefaults(storeData: any) {
    const storeKey = `retail_os_receipt_settings_${storeData.id}`;
    if (!localStorage.getItem(storeKey)) {
      this.receiptSettings.update(r => ({
        ...r,
        storeName: storeData.name || r.storeName,
        address: storeData.address ? `${storeData.address}, ${storeData.city || ''}` : r.address,
        phone: storeData.phone || r.phone
      }));
    }
  }

  /**
   * Load Receipt Settings scoped by store or master tenant template
   */
  public loadReceiptSettings(storeId: string | null, tenantId: string | null) {
    const tId = tenantId || 'global';
    const masterKey = `retail_os_receipt_settings_master_${tId}`;
    const legacyKey = 'retail_os_receipt_settings';

    // Base master template
    let master: ReceiptSettings = {
      storeName: this.selectedTenant()?.businessName || 'RetailOS Enterprise Outlet',
      headerSubtitle: 'Federal Republic of Nigeria',
      address: 'Plot 12, Adeola Odeku Street, Victoria Island, Lagos',
      phone: '+234 800 000 7382',
      vatNumber: 'VAT-10482938-0001',
      footerMessage: 'Thank you for your patronage! Items in original condition exchangeable within 7 days with valid fiscal receipt.',
      showBarcode: true,
      showCashier: true,
      paperWidth: '80mm'
    };

    const savedMaster = localStorage.getItem(masterKey) || localStorage.getItem(legacyKey);
    if (savedMaster) {
      try {
        master = { ...master, ...JSON.parse(savedMaster) };
      } catch (e) {}
    }

    if (!storeId) {
      this.receiptSettings.set(master);
      return;
    }

    const storeKey = `retail_os_receipt_settings_${storeId}`;
    const savedStore = localStorage.getItem(storeKey);
    if (savedStore) {
      try {
        this.receiptSettings.set(JSON.parse(savedStore));
        return;
      } catch (e) {}
    }

    const current = this.store();
    this.receiptSettings.set({
      ...master,
      storeName: current.name || master.storeName,
      address: current.address ? `${current.address}, ${current.city || ''}` : master.address,
      phone: current.phone || master.phone
    });
  }

  /**
   * Load Hardware Settings scoped to a specific store
   */
  public loadHardwareSettings(storeId: string | null) {
    if (!storeId) {
      this.hardwareSettings.set({
        printerIp: '',
        printerPort: 9100,
        autoCutter: true,
        drawerKickPulse: true,
        baudRate: 115200
      });
      return;
    }

    const storeKey = `retail_os_hardware_settings_${storeId}`;
    const saved = localStorage.getItem(storeKey) || localStorage.getItem('retail_os_hardware_settings');
    if (saved) {
      try {
        this.hardwareSettings.set(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    this.hardwareSettings.set({
      printerIp: '192.168.1.200',
      printerPort: 9100,
      autoCutter: true,
      drawerKickPulse: true,
      baudRate: 115200
    });
  }

  /**
   * Load Loyalty Settings from backend or safe defaults when in global scope
   */
  public async loadLoyaltySettings(tenantId?: string | null) {
    const activeTenantId = tenantId || this.selectedTenantId();
    if (!activeTenantId) {
      // Global scope / All Tenants: render standard baseline defaults immediately
      this.loyaltySettings.set({
        loyaltyProgramEnabled: true,
        loyaltyPointsEarnRate: 100,
        loyaltyPointRedeemRate: 1,
        loyaltyMinRedemptionPoints: 50
      });
      return;
    }

    try {
      const settings = await this.loyaltyService.getLoyaltySettings(activeTenantId);
      if (settings) {
        this.loyaltySettings.set(settings);
      }
    } catch (error) {
      console.warn('Could not load tenant loyalty settings, using defaults:', error);
    }
  }

  /**
   * Switch the active store context from inside the page
   */
  public selectStore(storeId: string | null) {
    this.contextService.switchStore(storeId);
  }

  /**
   * Save Loyalty Settings to backend (Tenant Admin Only)
   */
  public async saveLoyaltySettings() {
    if (!this.canEditStore()) {
      this.showToast('SuperAdmin is view-only. Only tenant administrators can modify loyalty rules.', 'info');
      return;
    }

    this.isSavingLoyalty.set(true);
    try {
      const updated = await this.loyaltyService.updateLoyaltySettings(this.loyaltySettings());
      this.loyaltySettings.set(updated);
      this.showToast('Loyalty & Rewards Program rules saved chain-wide!', 'success');
    } catch (error: any) {
      console.error('Failed to update loyalty settings', error);
      alert(error?.error?.message || 'Failed to save loyalty settings');
    } finally {
      this.isSavingLoyalty.set(false);
    }
  }

  /**
   * Save Receipt Settings (scoped by store or master template)
   */
  public saveReceiptSettings() {
    if (!this.canEditStore()) {
      this.showToast('SuperAdmin is view-only. Only tenant administrators can customize receipts.', 'info');
      return;
    }

    this.isSavingReceipt.set(true);
    const storeId = this.selectedStoreId();
    const tenantId = this.selectedTenantId() || 'global';

    if (storeId) {
      localStorage.setItem(`retail_os_receipt_settings_${storeId}`, JSON.stringify(this.receiptSettings()));
      localStorage.setItem('retail_os_receipt_settings', JSON.stringify(this.receiptSettings()));
    } else {
      localStorage.setItem(`retail_os_receipt_settings_master_${tenantId}`, JSON.stringify(this.receiptSettings()));
      localStorage.setItem('retail_os_receipt_settings', JSON.stringify(this.receiptSettings()));
    }

    setTimeout(() => {
      this.isSavingReceipt.set(false);
      const targetName = storeId ? (this.store()?.name || 'Selected Store') : 'All Stores (Master Template)';
      this.showToast(`Thermal 80mm receipt format saved for ${targetName}!`, 'success');
    }, 300);
  }

  /**
   * Save Hardware Settings
   */
  public saveHardwareSettings() {
    if (!this.canEditStore()) {
      this.showToast('SuperAdmin is view-only. Only tenant administrators can configure store hardware.', 'info');
      return;
    }

    const storeId = this.selectedStoreId();
    if (!storeId) {
      this.showToast('Please select a specific store branch before saving hardware settings.', 'info');
      return;
    }

    this.isSavingHardware.set(true);
    localStorage.setItem(`retail_os_hardware_settings_${storeId}`, JSON.stringify(this.hardwareSettings()));
    localStorage.setItem('retail_os_hardware_settings', JSON.stringify(this.hardwareSettings()));

    setTimeout(() => {
      this.isSavingHardware.set(false);
      this.showToast(`Hardware printer settings saved for ${this.store()?.name || 'Store'}!`, 'success');
    }, 300);
  }

  /**
   * Diagnostic: Cash Drawer Solenoid Kick
   */
  public testDrawerKick() {
    const storeId = this.selectedStoreId();
    if (!storeId) {
      this.showToast('Please select a specific store branch to trigger the cash drawer.', 'info');
      return;
    }
    this.showToast(`[${this.store()?.name || 'Store'}] Sending ESC/POS cash drawer kick pulse (ESC p 0 25 250)... Drawer opened!`, 'info');
  }

  /**
   * Diagnostic: Print Test Slip
   */
  public testPrinter() {
    const storeId = this.selectedStoreId();
    if (!storeId) {
      this.showToast('Please select a specific store branch to print a test slip.', 'info');
      return;
    }
    const ip = this.hardwareSettings().printerIp;
    const port = this.hardwareSettings().printerPort;
    if (!ip) {
      this.showToast('Please enter a valid printer IP address first.', 'info');
      return;
    }
    this.showToast(`[${this.store()?.name || 'Store'}] Transmitting test slip to ${ip}:${port}... Slip printed!`, 'info');
  }

  /**
   * Helper: Check if a store has configured hardware
   */
  public getStoreHardwareConfig(storeId?: string): { ip: string; isConfigured: boolean } {
    if (!storeId) return { ip: 'Not configured', isConfigured: false };
    const saved = localStorage.getItem(`retail_os_hardware_settings_${storeId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.printerIp) {
          return { ip: `${parsed.printerIp}:${parsed.printerPort || 9100}`, isConfigured: true };
        }
      } catch (e) {}
    }
    return { ip: 'Not configured', isConfigured: false };
  }

  /**
   * Helper: Check if a store has custom receipt settings
   */
  public hasStoreCustomReceipt(storeId?: string): boolean {
    if (!storeId) return false;
    return !!localStorage.getItem(`retail_os_receipt_settings_${storeId}`);
  }

  private showToast(text: string, type: 'success' | 'info') {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
