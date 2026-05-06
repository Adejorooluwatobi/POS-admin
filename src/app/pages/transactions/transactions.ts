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
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : 'N/A',
        cashier: t.cashierName || 'Unknown',
        customer: t.customerName || 'Walk-in',
        method: t.payments && t.payments.length > 0 ? t.payments[0].method : 'CASH',
        items: t.items ? t.items.length : 0,
        amount: t.grandTotal || 0,
        status: (t.status === 'Completed' || t.status === 3) ? 'COMPLETED' : 
                (t.status === 'Open' || t.status === 0) ? 'OPEN' :
                (t.status === 'Voided' || t.status === 4) ? 'VOIDED' : 'REFUNDED',
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
