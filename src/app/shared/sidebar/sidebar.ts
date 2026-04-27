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
    this.navItems = [
      { section: 'Overview' },
      { id: 'dashboard', icon: 'grid', label: 'Dashboard', route: '/app/dashboard' },
      { id: 'stores', icon: 'store', label: 'All Stores', route: '/app/stores' },
      { id: 'transactions', icon: 'receipt', label: 'Transactions', route: '/app/transactions' },
      { id: 'till-sessions', icon: 'stack', label: 'Till Sessions', route: '/app/till-sessions' },
      
      { section: 'Commerce' },
      { id: 'products', icon: 'box', label: 'Products', route: '/app/products' },
      { id: 'categories', icon: 'grid', label: 'Categories', route: '/app/categories' },
      { id: 'inventory', icon: 'stack', label: 'Inventory', route: '/app/inventory' },
      { id: 'customers', icon: 'users', label: 'Customers', route: '/app/customers' },
      { id: 'promotions', icon: 'tag', label: 'Promotions', route: '/app/promotions' },
      
      { section: 'Financials' },
      { id: 'gift-cards', icon: 'credit-card', label: 'Gift Cards', route: '/app/gift-cards' },
      { id: 'loyalty', icon: 'star', label: 'Loyalty Ledger', route: '/app/loyalty' },
      
      { section: 'Management' },
      { id: 'staff', icon: 'person', label: 'Staff', route: '/app/staff' },
      { id: 'roles', icon: 'shield', label: 'Roles', route: '/app/roles' },
      { id: 'reports', icon: 'chart', label: 'Reports', route: '/app/reports' },
      { id: 'audit', icon: 'shield', label: 'Audit Logs', route: '/app/audit' },
      { id: 'settings', icon: 'cog', label: 'Settings', route: '/app/settings' },

      { section: 'Infrastructure' },
      { id: 'terminals', icon: 'grid', label: 'Terminals', route: '/app/terminals' },
    ];
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
