import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from '../../services/loyalty.service';
import { CustomerService } from '../../services/customer.service';
import { LoyaltyLedgerEntry, Customer } from '../../models/pos.models';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './loyalty.html'
})
export class LoyaltyComponent implements OnInit {
  public ledger = signal<LoyaltyLedgerEntry[]>([]);
  public customers = signal<Customer[]>([]);
  public isLoading = signal<boolean>(false);

  public totalPointsAccrued = computed(() => 
    this.ledger().filter(e => e.delta > 0).reduce((acc, curr) => acc + curr.delta, 0)
  );
  public totalPointsRedeemed = computed(() => 
    Math.abs(this.ledger().filter(e => e.delta < 0).reduce((acc, curr) => acc + curr.delta, 0))
  );
  public totalEntries = computed(() => this.ledger().length);
  public enrolledCount = computed(() => this.customers().length);

  public searchQuery = signal<string>('');
  public typeFilter = signal<string>('All');

  public filteredLedger = computed(() => {
    let list = this.ledger();
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();

    if (type === 'Accruals') {
      list = list.filter(e => e.delta > 0);
    } else if (type === 'Redemptions') {
      list = list.filter(e => e.delta < 0);
    }

    if (q) {
      list = list.filter(e => {
        const name = this.getCustomerName(e.customerId, e).toLowerCase();
        const reason = (e.reason || '').toLowerCase();
        const txId = (e.transactionId || '').toLowerCase();
        return name.includes(q) || reason.includes(q) || txId.includes(q);
      });
    }

    return list;
  });

  constructor(
    private loyaltyService: LoyaltyService,
    private customerService: CustomerService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [ledgerData, customerData] = await Promise.all([
        this.loyaltyService.getGlobalLedger(),
        this.customerService.getCustomers()
      ]);
      this.ledger.set(ledgerData.items || ledgerData);
      this.customers.set(customerData.items || customerData);
    } catch (error) {
      console.error('Failed to load loyalty data', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getCustomerName(id: string, entry?: any) {
    if (entry?.customerName && entry.customerName !== 'Unknown Customer') return entry.customerName;
    const c = this.customers().find(cust => cust.id === id);
    return c ? (c.firstName + ' ' + c.lastName) : 'Unknown Customer';
  }
}
