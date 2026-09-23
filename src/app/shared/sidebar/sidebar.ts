import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
    public router: Router,
    private dataService: DataService
  ) {
    this.setupNav();
  }

  setupNav() {
    const user = this.authService.currentUser();
    const role = user?.role;

    const allItems = [
      // 1. Main
      { section: 'Main', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '/app/dashboard', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'reports', icon: 'query_stats', label: 'Analytics & Reports', route: '/app/reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },

      // 2. Retail Operations
      { section: 'Retail Operations', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'till-sessions', icon: 'point_of_sale', label: 'Till Sessions', route: '/app/till-sessions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'terminals', icon: 'devices', label: 'Terminals', route: '/app/terminals', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'transactions', icon: 'receipt_long', label: 'Transactions', route: '/app/transactions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'gift-cards', icon: 'credit_card', label: 'Card Management', route: '/app/gift-cards', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },

      // 3. Catalog & Stock
      { section: 'Catalog & Stock', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'products', icon: 'inventory_2', label: 'Products & SKUs', route: '/app/products', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'categories', icon: 'category', label: 'Categories', route: '/app/categories', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      {
        id: 'inventory',
        icon: 'swap_vert',
        label: 'Inventory Levels',
        route: '/app/inventory',
        roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'],
        children: [
          { label: 'Stock Levels', route: '/app/inventory' },
          { label: 'Requisitions', route: '/app/inventory/requisitions' },
          { label: 'Movement Orders', route: '/app/inventory/orders' }
        ]
      },
      { id: 'promotions', icon: 'sell', label: 'Promotions', route: '/app/promotions', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'loyalty', icon: 'loyalty', label: 'Loyalty Program', route: '/app/loyalty', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },

      // 4. Organization & Governance
      { section: 'Organization & Governance', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR'] },
      { id: 'customers', icon: 'group', label: 'Customers', route: '/app/customers', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER'] },
      { id: 'staff', icon: 'badge', label: 'Staff Members', route: '/app/staff', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR'] },
      { id: 'roles', icon: 'shield_person', label: 'Roles & Permissions', route: '/app/roles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
      { id: 'stores', icon: 'apartment', label: 'Stores & Branches', route: '/app/stores', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
      { id: 'tenants', icon: 'domain', label: 'Tenants', route: '/app/tenants', roles: ['SUPER_ADMIN'] },
      { id: 'audit', icon: 'history_toggle_off', label: 'Audit Logs', route: '/app/audit', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },

      // 5. System
      { section: 'System', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] },
      { id: 'settings', icon: 'settings', label: 'Settings', route: '/app/settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'] },
      { id: 'profile', icon: 'person', label: 'Profile', route: '/app/profile', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STORE_MANAGER', 'SUPERVISOR', 'CASHIER'] }
    ];

    this.navItems = allItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(role || '');
    });
  }

  getStoreName(): string {
    const user = this.authService.currentUser();
    if (user && user.store) {
      return this.dataService.stores[user.store]?.name || 'Store Assigned';
    }
    return 'Downtown Flagship #01';
  }

  logout() {
    if (confirm('Logout of RetailOS?')) {
      this.authService.logout();
    }
  }
}
