import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';
import { InventoryItem } from '../../models/pos.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './inventory.html'
})
export class InventoryComponent implements OnInit {
  public inventory = signal<InventoryItem[]>([]);
  public isLoading = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public selectedItem = signal<any>({
    n: '',
    oh: 0,
    res: 0,
    ro: 0,
    roQty: 0,
    reason: ''
  });

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadInventory();
  }

  async loadInventory() {
    this.isLoading.set(true);
    try {
      const data = await this.inventoryService.getInventory();
      const items = data.items || data;
      this.inventory.set(items.map((i: any) => ({
        ...i,
        n: i.variantName || 'Unknown Product',
        e: '📦',
        oh: i.quantityOnHand,
        res: i.quantityReserved,
        ro: i.reorderPoint,
        roQty: i.reorderQty,
        s: i.quantityOnHand <= i.reorderPoint ? (i.quantityOnHand <= 0 ? 'OUT' : 'LOW') : 'OK'
      })));
    } catch (error) {
      console.error('Failed to load inventory', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openStockAdj(item: InventoryItem) {
    this.selectedItem.set({ ...item });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveAdjustment() {
    const item = this.selectedItem();
    if (!item.id) return;

    const dto = {
      id: item.id,
      quantityOnHand: item.oh,
      quantityReserved: item.res,
      reorderPoint: item.ro,
      reorderQty: item.roQty,
      reason: item.reason
    };

    try {
      await this.inventoryService.updateInventory(item.id, dto);
      this.closeModal();
      this.loadInventory();
    } catch (error) {
      console.error('Failed to adjust stock', error);
    }
  }
}
