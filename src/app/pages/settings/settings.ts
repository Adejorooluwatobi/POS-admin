import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { LoyaltyService } from '../../services/loyalty.service';
import { Store, LoyaltySettings } from '../../models/pos.models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  public store = signal<Partial<Store>>({});
  public loyaltySettings = signal<LoyaltySettings>({
    loyaltyProgramEnabled: true,
    loyaltyPointsEarnRate: 100,
    loyaltyPointRedeemRate: 1,
    loyaltyMinRedemptionPoints: 50
  });

  public isOwner = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSavingStore = signal<boolean>(false);
  public isSavingLoyalty = signal<boolean>(false);
  public storeSuccessMessage = signal<string | null>(null);
  public loyaltySuccessMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private loyaltyService: LoyaltyService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');
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
      if (list && list.length > 0) {
        this.store.set(list[0]);
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

  async saveChanges() {
    const s = this.store();
    if (!s.id) return;
    this.isSavingStore.set(true);
    this.storeSuccessMessage.set(null);
    try {
      await this.storeService.updateStore(s.id, s);
      this.storeSuccessMessage.set('Store settings updated successfully!');
      setTimeout(() => this.storeSuccessMessage.set(null), 3000);
    } catch (error: any) {
      console.error('Failed to update settings', error);
      alert(error?.error?.message || 'Failed to update store settings');
    } finally {
      this.isSavingStore.set(false);
    }
  }

  async saveLoyaltySettings() {
    this.isSavingLoyalty.set(true);
    this.loyaltySuccessMessage.set(null);
    try {
      const updated = await this.loyaltyService.updateLoyaltySettings(this.loyaltySettings());
      this.loyaltySettings.set(updated);
      this.loyaltySuccessMessage.set('Loyalty Program rules saved successfully!');
      setTimeout(() => this.loyaltySuccessMessage.set(null), 3000);
    } catch (error: any) {
      console.error('Failed to update loyalty settings', error);
      alert(error?.error?.message || 'Failed to save loyalty settings');
    } finally {
      this.isSavingLoyalty.set(false);
    }
  }
}
