import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from '../../services/loyalty.service';
import { CustomerService } from '../../services/customer.service';
import { LoyaltyLedgerEntry, Customer } from '../../models/pos.models';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './loyalty.html'
})
export class LoyaltyComponent implements OnInit {
  public ledger = signal<LoyaltyLedgerEntry[]>([]);
  public customers = signal<Customer[]>([]);
  public isLoading = signal<boolean>(false);

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

  getCustomerName(id: string) {
    const c = this.customers().find(cust => cust.id === id);
    return c ? (c.firstName + ' ' + c.lastName) : 'Unknown Customer';
  }
}
