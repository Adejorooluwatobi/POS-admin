import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';
import { Customer } from '../../models/pos.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customers.html'
})
export class CustomersComponent implements OnInit {
  public customers = signal<Customer[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOYALTY'>('ALL');

  public totalCustomers = computed(() => this.customers().length);
  public activeMembers = computed(() => this.customers().filter(c => (c.loy && c.loy !== 'N/A') || (c.pts && c.pts > 0)).length);
  public totalPoints = computed(() => this.customers().reduce((acc, c) => acc + (c.pts || 0), 0));
  public totalSpend = computed(() => this.customers().reduce((acc, c) => acc + (c.spend || 0), 0));

  public filteredCustomers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    let list = this.customers();

    if (filter === 'ACTIVE') {
      list = list.filter(c => c.active !== false);
    } else if (filter === 'INACTIVE') {
      list = list.filter(c => c.active === false);
    } else if (filter === 'LOYALTY') {
      list = list.filter(c => (c.loy && c.loy !== 'N/A') || (c.pts && c.pts > 0));
    }

    if (!q) return list;

    return list.filter(c =>
      (c.n && c.n.toLowerCase().includes(q)) ||
      (c.e && c.e.toLowerCase().includes(q)) ||
      (c.ph && c.ph.toLowerCase().includes(q)) ||
      (c.loy && c.loy.toLowerCase().includes(q)) ||
      (c.storeName && c.storeName.toLowerCase().includes(q))
    );
  });

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
      const data = await this.customerService.getCustomers(1, 100);
      const items = data.items || data;
      const rawList = Array.isArray(items) ? items : [];

      this.customers.set(rawList.map((c: any) => {
        const pts = c.pointsBalance !== undefined ? c.pointsBalance : (c.loyaltyPoints || 0);
        let tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' = 'BRONZE';
        if (c.tier) {
          tier = c.tier;
        } else if (pts >= 1000) {
          tier = 'PLATINUM';
        } else if (pts >= 500) {
          tier = 'GOLD';
        } else if (pts >= 200) {
          tier = 'SILVER';
        }

        return {
          ...c,
          id: c.id,
          n: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed Customer',
          firstName: c.firstName,
          lastName: c.lastName,
          e: c.email || '',
          ph: c.phone || '',
          loy: c.loyaltyCardNo || 'N/A',
          tier,
          pts,
          spend: c.totalSpend || 0,
          storeName: c.registeredStoreName || (c.isSelfRegistered ? 'Online' : 'In-Store'),
          isSelfRegistered: c.isSelfRegistered,
          active: c.isActive !== undefined ? c.isActive : true,
          last: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'Recent'
        };
      }));
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOYALTY') {
    this.statusFilter.set(filter);
  }

  async deleteCustomer(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;

    try {
      await this.customerService.deleteCustomer(id);
      this.loadCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer', error);
      alert(`Error deleting customer: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
