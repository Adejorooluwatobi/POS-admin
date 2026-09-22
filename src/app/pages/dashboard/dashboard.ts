import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { TillService } from '../../services/till.service';
import { TerminalService } from '../../services/terminal.service';
import { InventoryService } from '../../services/inventory.service';
import { AuditService } from '../../services/audit.service';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public currentDateFormatted = signal<string>('');

  // Top KPIs
  public totalRevenue = signal<number>(0);
  public revenueGrowth = signal<string>('+0.0%');
  public totalTx = signal<number>(0);
  public avgBasketSize = signal<number>(0);
  public basketGrowth = signal<string>('+0.0%');
  public activeTillsCount = signal<number>(0);
  public totalTillsCount = signal<number>(0);
  public totalDrawerBalance = signal<number>(0);
  public tillDiscrepancy = signal<number>(0);
  public onlineTerminalsCount = signal<number>(0);
  public totalTerminalsCount = signal<number>(0);

  // Store & Tenant Context
  public stores = signal<Store[]>([]);
  public activeStoreName = signal<string>('Main Flagship Store');
  public storeCode = signal<string>('HQ-01');

  // Tender breakdown
  public paymentMix = signal({
    cardAmount: 0,
    cardTx: 0,
    cardPct: 0,
    cashAmount: 0,
    cashTx: 0,
    cashPct: 0,
    mobileAmount: 0,
    mobileTx: 0,
    mobilePct: 0,
    giftAmount: 0,
    giftTx: 0,
    giftPct: 0
  });

  // Hourly volume distribution
  public hourlyBars = signal([
    { time: '09:00', height: 28, isPeak: false },
    { time: '10:00', height: 44, isPeak: false },
    { time: '11:00', height: 65, isPeak: false },
    { time: '12:00', height: 94, isPeak: true, label: 'Peak ₦4.9k' },
    { time: '13:00', height: 82, isPeak: false },
    { time: '14:00', height: 58, isPeak: false },
    { time: '15:00', height: 70, isPeak: false },
    { time: '16:00', height: 88, isPeak: false },
    { time: 'Now', height: 52, isPeak: false, isCurrent: true }
  ]);

  // Live Orders Stream
  public liveOrders = signal<any[]>([]);

  // Right Rail: Active Till Sessions
  public activeTills = signal<any[]>([]);

  // Right Rail: Urgent Inventory Alerts
  public inventoryAlerts = signal<any[]>([]);

  // Right Rail: Recent Audit Events
  public auditEvents = signal<any[]>([]);

  constructor(
    public authService: AuthService,
    private storeService: StoreService,
    private transactionService: TransactionService,
    private analyticsService: AnalyticsService,
    private tillService: TillService,
    private terminalService: TerminalService,
    private inventoryService: InventoryService,
    private auditService: AuditService
  ) {
    const now = new Date();
    this.currentDateFormatted.set(now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }));
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser();
      const tenantId = user?.tenantId;

      // Parallel execution of all real endpoints
      const [storesRes, txRes, tillsRes, terminalsRes, invRes, auditRes] = await Promise.allSettled([
        this.storeService.getStores(),
        this.transactionService.getTransactions(1, 20),
        this.tillService.getTillSessions(1, 10),
        this.terminalService.getTerminals(1, 50),
        this.inventoryService.getInventory(1, 10),
        tenantId ? this.auditService.getAuditLogs(tenantId, 1, 5) : Promise.resolve({ items: [] })
      ]);

      // 1. Process Stores
      if (storesRes.status === 'fulfilled' && storesRes.value) {
        const storesList = storesRes.value.items || storesRes.value || [];
        this.stores.set(Array.isArray(storesList) ? storesList : []);
        if (storesList.length > 0) {
          const s = storesList[0];
          this.activeStoreName.set(s.name || 'Main Flagship Store');
          this.storeCode.set(s.code || 'HQ-01');
        }
      }

      // 2. Process Transactions & Orders
      if (txRes.status === 'fulfilled' && txRes.value) {
        const txList = txRes.value.items || txRes.value || [];
        const rawTxs = Array.isArray(txList) ? txList : [];
        if (rawTxs.length > 0) {
          const rev = rawTxs.reduce((acc: number, t: any) => acc + (t.grandTotal || t.amount || 0), 0);
          this.totalRevenue.set(rev);
          this.totalTx.set(rawTxs.length);
          if (this.totalTx() > 0) {
            this.avgBasketSize.set(Math.round((this.totalRevenue() / this.totalTx()) * 100) / 100);
          }

          // Map recent orders
          this.liveOrders.set(rawTxs.slice(0, 5).map((t: any, idx: number) => ({
            id: t.receiptNumber || (t.id ? `#TX-${t.id.slice(-4).toUpperCase()}` : `#TX-${idx + 1}`),
            rawId: t.id,
            time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${(idx + 1) * 3}m ago`,
            terminal: t.terminalName || `Register #${(idx % 4) + 1}`,
            cashier: t.cashierName || 'Staff',
            cashierInitials: (t.cashierName || 'Staff').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            items: Array.isArray(t.items) ? t.items.length : 1,
            total: t.grandTotal || t.amount || 0,
            method: (t.payments && t.payments[0]) ? t.payments[0].method : 'Cash Tender',
            status: t.status === 3 || t.status === 'Completed' ? 'Completed' : (t.status === 5 || t.status === 'Refunded' ? 'Refunded' : 'Completed')
          })));

          // Calculate real payment mix
          let cardAmt = 0, cardCount = 0;
          let cashAmt = 0, cashCount = 0;
          let mobileAmt = 0, mobileCount = 0;
          let giftAmt = 0, giftCount = 0;

          rawTxs.forEach((t: any) => {
            const amt = t.grandTotal || t.amount || 0;
            const p = t.payments && t.payments[0] ? String(t.payments[0].method).toLowerCase() : 'cash';
            if (p.includes('card') || p.includes('visa') || p.includes('master')) {
              cardAmt += amt; cardCount++;
            } else if (p.includes('cash')) {
              cashAmt += amt; cashCount++;
            } else if (p.includes('mobile') || p.includes('transfer')) {
              mobileAmt += amt; mobileCount++;
            } else {
              giftAmt += amt; giftCount++;
            }
          });

          const totalAll = (cardAmt + cashAmt + mobileAmt + giftAmt) || 1;
          this.paymentMix.set({
            cardAmount: cardAmt,
            cardTx: cardCount,
            cardPct: Math.round((cardAmt / totalAll) * 100),
            cashAmount: cashAmt,
            cashTx: cashCount,
            cashPct: Math.round((cashAmt / totalAll) * 100),
            mobileAmount: mobileAmt,
            mobileTx: mobileCount,
            mobilePct: Math.round((mobileAmt / totalAll) * 100),
            giftAmount: giftAmt,
            giftTx: giftCount,
            giftPct: Math.round((giftAmt / totalAll) * 100)
          });
        } else {
          this.liveOrders.set([]);
          this.totalRevenue.set(0);
          this.totalTx.set(0);
          this.avgBasketSize.set(0);
        }
      }

      // 3. Process Terminals
      if (terminalsRes.status === 'fulfilled' && terminalsRes.value) {
        const terms = terminalsRes.value.items || terminalsRes.value || [];
        const termList = Array.isArray(terms) ? terms : [];
        this.totalTerminalsCount.set(termList.length || 0);
        const onlineCount = termList.filter((t: any) => t.isOnline || t.status === 'Active' || t.status === 'ONLINE').length;
        this.onlineTerminalsCount.set(onlineCount || termList.length || 0);
      }

      // 4. Process Till Sessions
      if (tillsRes.status === 'fulfilled' && tillsRes.value) {
        const tData = tillsRes.value.items || tillsRes.value || [];
        const rawTills = Array.isArray(tData) ? tData : [];
        const openTills = rawTills.filter((s: any) => s.status === 'Open' || !s.closedAt);
        this.activeTillsCount.set(openTills.length);
        this.totalTillsCount.set(rawTills.length);

        const totalDrawer = rawTills.reduce((sum: number, s: any) => sum + (s.actualCash || s.closingCash || s.openingFloat || 0), 0);
        this.totalDrawerBalance.set(totalDrawer);

        this.activeTills.set(rawTills.slice(0, 4).map((s: any) => ({
          id: s.id,
          name: s.terminalName || `Register #${(s.id || '').slice(0, 4)}`,
          cashier: s.staffName || s.cashierName || 'Cashier',
          float: s.openingFloat || 0,
          balance: s.actualCash || s.closingCash || s.openingFloat || 0,
          isOpen: s.status === 'Open' || !s.closedAt
        })));
      }

      // 5. Process Inventory Low-Stock Alerts
      if (invRes.status === 'fulfilled' && invRes.value) {
        const invData = invRes.value.items || invRes.value || [];
        const rawInv = Array.isArray(invData) ? invData : [];
        const critical = rawInv.filter((i: any) => (i.quantityOnHand || 0) <= (i.reorderPoint || 5));
        this.inventoryAlerts.set(critical.slice(0, 4).map((i: any) => ({
          id: i.id,
          name: i.productName || i.variantName || 'Stock Item',
          left: i.quantityOnHand || 0,
          unit: 'units left',
          critical: true,
          tag: i.sku || 'SKU'
        })));
      }

      // 6. Process Audit Events
      if (auditRes.status === 'fulfilled' && auditRes.value) {
        const aData = auditRes.value.items || auditRes.value || [];
        const rawAudit = Array.isArray(aData) ? aData : [];
        this.auditEvents.set(rawAudit.slice(0, 3).map((a: any) => ({
          id: a.id,
          title: a.action || 'System Mutation',
          auth: a.userEmail || a.userId || 'Authorized Personnel',
          reg: a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          type: (a.action || '').toLowerCase().includes('delete') ? 'override' : 'discount'
        })));
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  syncAllRegisters() {
    this.isSyncing.set(true);
    setTimeout(() => {
      this.isSyncing.set(false);
      this.loadDashboardData();
    }, 800);
  }

  exportDailySummary() {
    const csvContent = 'Metric,Value\n'
      + `Total Gross Sales,₦${this.formatNum(this.totalRevenue())}\n`
      + `Total Transactions,${this.totalTx()}\n`
      + `Average Basket Size,₦${this.formatNum(this.avgBasketSize())}\n`
      + `Active Registers,${this.activeTillsCount()}/${this.totalTillsCount()}\n`
      + `Drawer Cash Balance,₦${this.formatNum(this.totalDrawerBalance())}\n`
      + `Online Terminals,${this.onlineTerminalsCount()}/${this.totalTerminalsCount()}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RetailOS_Daily_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  formatNum(n: number): string {
    return Math.abs(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
