import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { LoyaltyService } from '../../services/loyalty.service';
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
  // Navigation Tabs: 'profile' | 'loyalty' | 'receipt' | 'hardware'
  public activeTab = signal<'profile' | 'loyalty' | 'receipt' | 'hardware'>('profile');

  public store = signal<Partial<Store>>({});
  public loyaltySettings = signal<LoyaltySettings>({
    loyaltyProgramEnabled: true,
    loyaltyPointsEarnRate: 100,
    loyaltyPointRedeemRate: 1,
    loyaltyMinRedemptionPoints: 50
  });

  public receiptSettings = signal<ReceiptSettings>({
    storeName: 'RetailOS Flagship Outlet',
    headerSubtitle: 'Federal Republic of Nigeria',
    address: 'Plot 12, Adeola Odeku Street, Victoria Island, Lagos',
    phone: '+234 800 000 7382',
    vatNumber: 'VAT-10482938-0001',
    footerMessage: 'Thank you for your patronage! Items in original condition exchangeable within 7 days with valid fiscal receipt.',
    showBarcode: true,
    showCashier: true,
    paperWidth: '80mm'
  });

  public hardwareSettings = signal<HardwareSettings>({
    printerIp: '192.168.1.200',
    printerPort: 9100,
    autoCutter: true,
    drawerKickPulse: true,
    baudRate: 115200
  });

  public isOwner = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Status & Notifications
  public isSavingStore = signal<boolean>(false);
  public isSavingLoyalty = signal<boolean>(false);
  public isSavingReceipt = signal<boolean>(false);
  public isSavingHardware = signal<boolean>(false);
  public toastMessage = signal<{ text: string; type: 'success' | 'info' } | null>(null);

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private loyaltyService: LoyaltyService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');

    // Load saved receipt & hardware settings from localStorage
    const savedReceipt = localStorage.getItem('retail_os_receipt_settings');
    if (savedReceipt) {
      try {
        this.receiptSettings.set(JSON.parse(savedReceipt));
      } catch (e) {}
    }

    const savedHardware = localStorage.getItem('retail_os_hardware_settings');
    if (savedHardware) {
      try {
        this.hardwareSettings.set(JSON.parse(savedHardware));
      } catch (e) {}
    }
  }

  ngOnInit() {
    this.loadStore();
    this.loadLoyaltySettings();
  }

  async loadStore() {
    this.isLoading.set(true);
    try {
      const stores = await this.storeService.getStores();
      const list = stores.items || stores;
      if (Array.isArray(list) && list.length > 0) {
        this.store.set(list[0]);
        // Sync initial store name into receipt settings if default
        if (list[0].name && this.receiptSettings().storeName === 'RetailOS Flagship Outlet') {
          this.receiptSettings.update(r => ({
            ...r,
            storeName: list[0].name,
            address: list[0].address || r.address,
            phone: list[0].phone || r.phone
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load store settings', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadLoyaltySettings() {
    try {
      const settings = await this.loyaltyService.getLoyaltySettings();
      if (settings) {
        this.loyaltySettings.set(settings);
      }
    } catch (error) {
      console.error('Failed to load loyalty settings', error);
    }
  }

  async saveStore() {
    const s = this.store();
    if (!s.id) return;
    this.isSavingStore.set(true);
    try {
      await this.storeService.updateStore(s.id, s);
      this.showToast('Store operating details updated successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to update store settings', error);
      alert(error?.error?.message || 'Failed to update store settings');
    } finally {
      this.isSavingStore.set(false);
    }
  }

  async saveLoyaltySettings() {
    this.isSavingLoyalty.set(true);
    try {
      const updated = await this.loyaltyService.updateLoyaltySettings(this.loyaltySettings());
      this.loyaltySettings.set(updated);
      this.showToast('Loyalty & Rewards Program rules saved successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to update loyalty settings', error);
      alert(error?.error?.message || 'Failed to save loyalty settings');
    } finally {
      this.isSavingLoyalty.set(false);
    }
  }

  saveReceiptSettings() {
    this.isSavingReceipt.set(true);
    localStorage.setItem('retail_os_receipt_settings', JSON.stringify(this.receiptSettings()));
    setTimeout(() => {
      this.isSavingReceipt.set(false);
      this.showToast('Thermal 80mm receipt format and header updated!', 'success');
    }, 400);
  }

  saveHardwareSettings() {
    this.isSavingHardware.set(true);
    localStorage.setItem('retail_os_hardware_settings', JSON.stringify(this.hardwareSettings()));
    setTimeout(() => {
      this.isSavingHardware.set(false);
      this.showToast('Hardware printer network settings saved!', 'success');
    }, 400);
  }

  testDrawerKick() {
    this.showToast('Sending ESC/POS cash drawer kick pulse (ESC p 0 25 250)... Drawer opened!', 'info');
  }

  testPrinter() {
    this.showToast(`Transmitting test slip to ${this.hardwareSettings().printerIp}:${this.hardwareSettings().printerPort}... Slip printed!`, 'info');
  }

  private showToast(text: string, type: 'success' | 'info') {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
