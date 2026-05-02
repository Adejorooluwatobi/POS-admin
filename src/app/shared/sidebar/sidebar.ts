import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  public navItems: any[] = [];

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private dataService: DataService
  ) {
    this.setupNav();
  }

  setupNav() {
    const user = this.authService.currentUser();
    const role = user?.role;

    const allItems = [
      { section: 'Overview', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'dashboard', icon: 'grid', label: 'Dashboard', route: '/app/dashboard', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'stores', icon: 'store', label: 'All Stores', route: '/app/stores', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
      { id: 'transactions', icon: 'receipt', label: 'Transactions', route: '/app/transactions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'till-sessions', icon: 'stack', label: 'Till Sessions', route: '/app/till-sessions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      
      { section: 'Commerce', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'products', icon: 'box', label: 'Products', route: '/app/products', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'categories', icon: 'grid', label: 'Categories', route: '/app/categories', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'inventory', icon: 'stack', label: 'Inventory', route: '/app/inventory', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'customers', icon: 'users', label: 'Customers', route: '/app/customers', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'promotions', icon: 'tag', label: 'Promotions', route: '/app/promotions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      
      { section: 'Financials', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'gift-cards', icon: 'credit-card', label: 'Gift Cards', route: '/app/gift-cards', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'loyalty', icon: 'star', label: 'Loyalty Ledger', route: '/app/loyalty', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      
      { section: 'Management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'profile', icon: 'person', label: 'My Profile', route: '/app/profile', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'staff', icon: 'users', label: 'Staff Management', route: '/app/staff', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR'] },
      { id: 'roles', icon: 'shield', label: 'Roles', route: '/app/roles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
      { id: 'reports', icon: 'chart', label: 'Reports', route: '/app/reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'audit', icon: 'shield', label: 'Audit Logs', route: '/app/audit', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },
      { id: 'settings', icon: 'cog', label: 'Settings', route: '/app/settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },

      { section: 'Infrastructure', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'terminals', icon: 'grid', label: 'Terminals', route: '/app/terminals', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
    ];

    this.navItems = allItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(role || '');
    });
  }

  getStoreName() {
    const user = this.authService.currentUser();
    if (user && user.store) {
      return this.dataService.stores[user.store]?.name || '';
    }
    return '';
  }

  logout() {
    if (confirm('Logout?')) {
      this.authService.logout();
    }
  }
}
