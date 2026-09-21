import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TransactionService } from '../../../services/transaction.service';

@Component({
  selector: 'app-transaction-receipt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './transaction-receipt.html',
  styleUrls: ['./transaction-receipt.css']
})
export class TransactionReceiptComponent implements OnInit {
  public txId = signal<string | null>(null);
  public tx = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);
  public viewMode = signal<'invoice' | 'thermal'>('invoice');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transactionService: TransactionService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/transactions']);
      return;
    }
    this.txId.set(id);
    await this.loadTransaction(id);
  }

  async loadTransaction(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.transactionService.getTransactionById(id);
      this.tx.set(data);
    } catch (err: any) {
      console.error('Failed to load transaction receipt', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load transaction details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusText(status: number | string | undefined): string {
    if (status === 3 || status === 'Completed') return 'COMPLETED';
    if (status === 0 || status === 'Open') return 'OPEN';
    if (status === 4 || status === 'Voided') return 'VOIDED';
    if (status === 5 || status === 'Refunded') return 'REFUNDED';
    return String(status || 'UNKNOWN');
  }

  getStatusClass(status: number | string | undefined): string {
    const s = this.getStatusText(status);
    if (s === 'COMPLETED') return 'badge-success';
    if (s === 'VOIDED') return 'badge-danger';
    if (s === 'REFUNDED') return 'badge-warning';
    return 'badge-info';
  }

  printReceipt() {
    window.print();
  }
}
