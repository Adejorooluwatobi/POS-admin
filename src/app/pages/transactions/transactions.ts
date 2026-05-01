import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../models/pos.models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './transactions.html'
})
export class TransactionsComponent implements OnInit {
  public transactions = signal<Transaction[]>([]);
  public isLoading = signal<boolean>(false);
  public isModalOpen = signal<boolean>(false);
  public selectedTx = signal<any>(null);

  constructor(private transactionService: TransactionService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  async loadTransactions() {
    this.isLoading.set(true);
    try {
      const data = await this.transactionService.getTransactions();
      const items = data.items || data;
      this.transactions.set(items.map((t: any) => ({
        ...t,
        date: new Date(t.createdAt).toLocaleDateString(),
        time: new Date(t.createdAt).toLocaleTimeString(),
        cashier: t.staffName || 'Unknown',
        customer: t.customerName || 'Walk-in',
        method: t.paymentMethod || 'CASH',
        items: t.totalItems,
        amount: t.totalAmount,
        status: t.status === 0 ? 'COMPLETED' : t.status === 1 ? 'VOIDED' : 'REFUNDED',
        store: t.storeName || 'Store'
      })));
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async viewReceipt(tx: Transaction) {
    if (!tx.id) return;
    this.selectedTx.set(tx);
    this.isModalOpen.set(true);
    
    try {
      const details = await this.transactionService.getTransactionById(tx.id);
      this.selectedTx.set({ ...tx, details });
    } catch (error) {
      console.error('Failed to fetch transaction details', error);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedTx.set(null);
  }
}
