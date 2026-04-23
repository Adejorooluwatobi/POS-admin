import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Transaction } from '../../models/pos.models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './transactions.html'
})
export class TransactionsComponent {
  public transactions = signal<Transaction[]>([]);

  constructor(private dataService: DataService) {
    this.transactions.set(this.dataService.transactions);
  }

  filterTxs(query: string) {
    if (!query) {
      this.transactions.set(this.dataService.transactions);
      return;
    }
    const q = query.toLowerCase();
    this.transactions.set(this.dataService.transactions.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.cashier.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q)
    ));
  }
}
