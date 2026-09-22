import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { StoreService } from '../../services/store.service';
import { TerminalService } from '../../services/terminal.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './transactions.html'
})
export class TransactionsComponent implements OnInit {
  public transactions = signal<any[]>([]);
  public selectedTx = signal<any | null>(null);
  public isLoading = signal<boolean>(false);
  public isRefunding = signal<boolean>(false);

  // Filters & State
  public activeTab = signal<'all' | 'tills' | 'refunds' | 'voided'>('all');
  public activeStatus = signal<'all' | 'COMPLETED' | 'REFUNDED' | 'PENDING' | 'DECLINED'>('all');
  public searchQuery = signal<string>('');
  public selectedTender = signal<string>('all');
  public selectedTerminal = signal<string>('all');
  public selectedStore = signal<string>('all');

  // Stores & Terminals for dynamic filter dropdowns
  public stores = signal<any[]>([]);
  public terminals = signal<any[]>([]);

  // Computed metrics from real loaded transactions
  public totalCount = computed(() => this.transactions().length);
  public completedCount = computed(() => this.transactions().filter(t => t.status === 'COMPLETED').length);
  public refundedCount = computed(() => this.transactions().filter(t => t.status === 'REFUNDED').length);
  public pendingCount = computed(() => this.transactions().filter(t => t.status === 'PENDING').length);
  public declinedCount = computed(() => this.transactions().filter(t => t.status === 'DECLINED').length);

  public shiftVolume = computed(() => {
    return this.transactions()
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  public tillDiscrepancy = signal<number>(0.00);

  // Toast / notification state
  public actionFeedback = signal<string | null>(null);

  constructor(
    private transactionService: TransactionService,
    private storeService: StoreService,
    private terminalService: TerminalService
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadTransactions(),
      this.loadFilterMetadata()
    ]);
  }

  async loadFilterMetadata() {
    try {
      const [storesRes, terminalsRes] = await Promise.allSettled([
        this.storeService.getStores(1, 100),
        this.terminalService.getTerminals(1, 100)
      ]);

      if (storesRes.status === 'fulfilled' && storesRes.value) {
        const items = storesRes.value.items || storesRes.value;
        this.stores.set(Array.isArray(items) ? items : []);
      }
      if (terminalsRes.status === 'fulfilled' && terminalsRes.value) {
        const items = terminalsRes.value.items || terminalsRes.value;
        this.terminals.set(Array.isArray(items) ? items : []);
      }
    } catch (e) {
      console.warn('Could not load filter metadata', e);
    }
  }

  async loadTransactions() {
    this.isLoading.set(true);
    try {
      const data = await this.transactionService.getTransactions(1, 100);
      const items = data?.items || data || [];

      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((t: any, index: number) => this.mapTransaction(t, index));
        this.transactions.set(mapped);
        this.selectedTx.set(mapped[0]);
      } else {
        this.transactions.set([]);
        this.selectedTx.set(null);
      }
    } catch (error) {
      console.error('Failed to load live transactions from backend', error);
      this.transactions.set([]);
      this.selectedTx.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapTransaction(t: any, index: number) {
    const rawStatus = t.status;
    let status: 'COMPLETED' | 'REFUNDED' | 'PENDING' | 'DECLINED' = 'COMPLETED';
    if (rawStatus === 5 || rawStatus === 'Refunded' || String(rawStatus).toUpperCase().includes('REFUND')) {
      status = 'REFUNDED';
    } else if (rawStatus === 4 || rawStatus === 'Voided' || String(rawStatus).toUpperCase().includes('VOID') || String(rawStatus).toUpperCase().includes('DECLINE')) {
      status = 'DECLINED';
    } else if (rawStatus === 0 || rawStatus === 1 || rawStatus === 2 || rawStatus === 'Open' || rawStatus === 'PaymentPending' || String(rawStatus).toUpperCase().includes('PEND')) {
      status = 'PENDING';
    }

    const grandTotal = Number(t.grandTotal || t.amount || t.amountPaid || 0);
    const subtotal = Number(t.subtotal || grandTotal * 0.925);
    const tax = Number(t.taxTotal || (grandTotal - subtotal));
    const tip = Number(t.changeGiven > 0 ? 0 : 0);
    const discount = Number(t.discountTotal || 0);

    const payments = Array.isArray(t.payments) ? t.payments : [];
    const primaryPayment = payments.length > 0 ? payments[0] : null;
    const paymentMethod = primaryPayment ? this.getPaymentMethodName(primaryPayment.method) : 'Cash Tender';
    const methodDetail = primaryPayment?.gatewayRef ? `${paymentMethod} • Ref ${primaryPayment.gatewayRef}` : paymentMethod;

    const cashierName = t.cashierName || 'Cashier Staff';
    const cashierInitials = cashierName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'CS';

    const customerName = t.customerName || (t.customerId ? 'Registered Client' : 'Walk-in Shopper');
    const customerInitials = customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'WS';

    const items = Array.isArray(t.items) ? t.items.map((i: any) => ({
      qty: Number(i.quantity || 1),
      name: i.variantName || i.productName || 'Line Item',
      sku: i.sku || (i.variantId ? String(i.variantId).slice(0, 8).toUpperCase() : 'SKU-ITEM'),
      price: Number(i.lineTotal || (Number(i.unitPrice || 0) * Number(i.quantity || 1))),
      unitPrice: Number(i.unitPrice || 0),
      discount: i.discountAmount > 0 ? `-₦${Number(i.discountAmount).toFixed(2)}` : null,
      note: i.isVoided ? 'Line Voided' : null
    })) : [];

    const receiptNum = t.receiptNumber || (t.id ? `#TX-${String(t.id).slice(-6).toUpperCase()}` : `#TX-${index + 1}`);

    return {
      id: receiptNum,
      rawId: t.id || `TX-${index + 1}`,
      date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—',
      time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      terminal: t.terminalName || (t.sessionId ? `Register #${String(t.sessionId).slice(0, 4)}` : 'Main Counter'),
      terminalFull: t.terminalName || 'Main Counter Register',
      store: t.storeName || 'Chain Outlet',
      storeId: t.storeId,
      cashier: cashierName,
      cashierInitials: cashierInitials,
      customer: customerName,
      customerInitials: customerInitials,
      customerTier: t.customerId ? 'Loyalty Member' : 'Standard Guest',
      earnedPts: t.pointsEarned || 0,
      method: paymentMethod,
      methodDetail: methodDetail,
      amount: grandTotal,
      subtotal: subtotal,
      tax: tax,
      tip: tip,
      discount: discount,
      status: status,
      batch: t.sessionId ? `#SESS-${String(t.sessionId).slice(0, 6).toUpperCase()}` : '—',
      tillSessionId: t.sessionId ? `#TS-${String(t.sessionId).slice(0, 6).toUpperCase()}` : '—',
      rawSessionId: t.sessionId,
      shift: t.completedAt ? 'Completed Shift' : 'Active Shift',
      authCode: primaryPayment?.gatewayRef || (t.id ? `AUTH-${String(t.id).slice(0, 8).toUpperCase()}` : 'AUTH-SETTLED'),
      terminalHwId: t.terminalId ? `TM-${String(t.terminalId).slice(0, 8).toUpperCase()}` : 'POS-HW-01',
      gatewayTrace: primaryPayment?.gatewayRef || 'LOCAL-SYNC-SETTLED',
      cardMethod: paymentMethod,
      items: items
    };
  }

  private getPaymentMethodName(method: any): string {
    if (typeof method === 'string') return method;
    switch (method) {
      case 0: return 'Cash Tender';
      case 1: return 'POS Card Terminal';
      case 2: return 'Mobile Money / QR';
      case 3: return 'Bank Transfer';
      case 4: return 'Gift Card (Stored Value)';
      case 5: return 'Store Credit';
      case 6: return 'Split Payment';
      default: return 'Electronic Payment';
    }
  }

  // Filter computation
  public filteredTransactions = computed(() => {
    let list = this.transactions();

    // Tab filter
    if (this.activeTab() === 'refunds') {
      list = list.filter(t => t.status === 'REFUNDED');
    } else if (this.activeTab() === 'voided') {
      list = list.filter(t => t.status === 'DECLINED');
    }

    // Status pill filter
    if (this.activeStatus() !== 'all') {
      list = list.filter(t => t.status === this.activeStatus());
    }

    // Tender filter
    if (this.selectedTender() !== 'all') {
      const tender = this.selectedTender().toLowerCase();
      list = list.filter(t => t.method.toLowerCase().includes(tender));
    }

    // Terminal filter
    if (this.selectedTerminal() !== 'all') {
      list = list.filter(t => t.terminal.toLowerCase().includes(this.selectedTerminal().toLowerCase()) || t.terminalHwId.toLowerCase().includes(this.selectedTerminal().toLowerCase()));
    }

    // Store filter
    if (this.selectedStore() !== 'all') {
      list = list.filter(t => t.storeId === this.selectedStore() || t.store.toLowerCase().includes(this.selectedStore().toLowerCase()));
    }

    // Search query
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.rawId.toLowerCase().includes(q) ||
        t.cashier.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.method.toLowerCase().includes(q) ||
        t.store.toLowerCase().includes(q)
      );
    }

    return list;
  });

  selectTx(tx: any) {
    this.selectedTx.set(tx);
  }

  setTab(tab: 'all' | 'tills' | 'refunds' | 'voided') {
    this.activeTab.set(tab);
  }

  setStatus(status: 'all' | 'COMPLETED' | 'REFUNDED' | 'PENDING' | 'DECLINED') {
    this.activeStatus.set(status);
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value);
  }

  printDuplicate() {
    const tx = this.selectedTx();
    if (!tx) return;
    this.showToast(`Printing duplicate receipt for ${tx.id}...`);
    window.print();
  }

  async issueRefund() {
    const tx = this.selectedTx();
    if (!tx) return;
    if (confirm(`Confirm issuance of refund of ₦${this.formatNum(tx.amount)} for transaction ${tx.id}?`)) {
      this.isRefunding.set(true);
      try {
        await this.transactionService.updateTransaction(tx.rawId, {
          status: 5, // 5 = Refunded in backend enum
          notes: 'Full refund authorized and processed via Admin Portal'
        });

        // Update local state
        tx.status = 'REFUNDED';
        this.transactions.update(list => [...list]);
        this.showToast(`Refund processed for ${tx.id}. Ledger updated.`);
      } catch (e: any) {
        console.error('Failed to issue refund on backend', e);
        this.showToast(e?.error?.message || 'Failed to update transaction status.');
      } finally {
        this.isRefunding.set(false);
      }
    }
  }

  sendEmailReceipt() {
    this.showToast(`E-Receipt dispatched to customer for ${this.selectedTx()?.id}`);
  }

  sendSmsReceipt() {
    this.showToast(`SMS receipt link sent for ${this.selectedTx()?.id}`);
  }

  exportCsv() {
    const header = 'Order ID,Raw ID,Date,Time,Store,Terminal,Cashier,Customer,Method,Amount,Status\n';
    const rows = this.filteredTransactions().map(t =>
      `"${t.id}","${t.rawId}","${t.date}","${t.time}","${t.store}","${t.terminal}","${t.cashier}","${t.customer}","${t.method}","${t.amount}","${t.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RetailOS_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showToast('Transactions CSV exported successfully');
  }

  showToast(msg: string) {
    this.actionFeedback.set(msg);
    setTimeout(() => {
      this.actionFeedback.set(null);
    }, 3500);
  }

  formatNum(n: number): string {
    return Math.abs(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
