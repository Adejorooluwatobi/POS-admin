import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { InventoryItem } from '../../models/pos.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './inventory.html'
})
export class InventoryComponent {
  public inventory = signal<InventoryItem[]>([]);
  public storeName = signal<string>('');

  constructor(private dataService: DataService, private authService: AuthService) {
    this.inventory.set(this.dataService.inventory);
    const user = this.authService.currentUser();
    this.storeName.set(user?.role === 'SUPER_ADMIN' ? 'All Stores' : this.dataService.stores[user?.store!]?.name || '');
  }

  openStockAdj(name: string = '') { console.log('Adjust stock for', name); }
}
