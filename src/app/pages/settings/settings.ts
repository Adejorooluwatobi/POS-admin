import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StoreService } from '../../services/store.service';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  public store = signal<Partial<Store>>({});
  public isOwner = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private storeService: StoreService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');
  }

  ngOnInit() {
    this.loadStore();
  }

  async loadStore() {
    const user = this.authService.currentUser();
    // In a real app, the store ID might be in the user session or route
    // For now, if it's a manager, we fetch their specific store
    // This is a placeholder since we don't have a direct 'getMyStore' endpoint yet
    this.isLoading.set(true);
    try {
      const stores = await this.storeService.getStores();
      const list = stores.items || stores;
      if (list.length > 0) {
        this.store.set(list[0]); // Default to first store for demo
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChanges() {
    const s = this.store();
    if (!s.id) return;
    try {
      await this.storeService.updateStore(s.id, s);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Failed to update settings', error);
    }
  }
}
