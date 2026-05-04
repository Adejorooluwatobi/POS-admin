import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockMovementService } from '../../../services/stock-movement.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.html'
})
export class OrdersComponent implements OnInit {
  public orders = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public userStoreId = signal<string | null>(null);

  constructor(
    private stockService: StockMovementService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.userStoreId.set(this.authService.getStoreId());
    this.loadOrders();
  }

  async loadOrders() {
    this.isLoading.set(true);
    try {
      const data = await this.stockService.getOrders();
      this.orders.set(data.items || data);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async dispatch(order: any) {
    if (!confirm('Dispatch this order now?')) return;
    try {
      await this.stockService.dispatchOrder(order.id);
      this.loadOrders();
    } catch (error) {
      alert('Dispatch failed');
    }
  }

  async receive(order: any) {
    // In a real app, this would open a modal to record received quantities
    const receivedItems = order.items.map((i: any) => ({
      itemId: i.id,
      quantityReceived: i.quantityOrdered
    }));

    try {
      await this.stockService.receiveOrder(order.id, { items: receivedItems });
      this.loadOrders();
    } catch (error) {
      alert('Receiving failed');
    }
  }

  async approve(order: any) {
    try {
      await this.stockService.approveOrder(order.id);
      this.loadOrders();
    } catch (error) {}
  }
}
