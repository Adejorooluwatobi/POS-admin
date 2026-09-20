import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';
import { Customer } from '../../models/pos.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './customers.html'
})
export class CustomersComponent implements OnInit {
  public customers = signal<Customer[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  constructor(
    private customerService: CustomerService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'STORE_MANAGER');
  }

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading.set(true);
    try {
      const data = await this.customerService.getCustomers();
      const items = data.items || data;
      this.customers.set(items.map((c: any) => ({
        ...c,
        n: `${c.firstName} ${c.lastName}`,
        e: c.email,
        ph: c.phone,
        loy: c.loyaltyCardNo || 'N/A',
        tier: 'BRONZE',
        pts: c.pointsBalance !== undefined ? c.pointsBalance : (c.loyaltyPoints || 0),
        spend: c.totalSpend || 0,
        storeName: c.registeredStoreName || (c.isSelfRegistered ? 'Online' : 'In-Store'),
        isSelfRegistered: c.isSelfRegistered,
        last: 'Recent'
      })));
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteCustomer(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await this.customerService.deleteCustomer(id);
      this.loadCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer', error);
      alert(`Error deleting customer: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
