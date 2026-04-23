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
    if (!user) return;

    if (user.role === 'SUPER_ADMIN') {
      this.navItems = [
        { section: 'Overview' },
        { id: 'dashboard', icon: 'grid', label: 'Dashboard', route: '/app/dashboard' },
        { id: 'stores', icon: 'store', label: 'All Stores', route: '/app/stores' },
        { section: 'Data' },
        { id: 'transactions', icon: 'receipt', label: 'Transactions', route: '/app/transactions' },
        { id: 'reports', icon: 'chart', label: 'Reports', route: '/app/reports' },
        { section: 'Monitor' },
        { id: 'audit', icon: 'shield', label: 'Audit Logs', route: '/app/audit' },
      ];
    } else {
      this.navItems = [
        { section: 'Overview' },
        { id: 'dashboard', icon: 'grid', label: 'Dashboard', route: '/app/dashboard' },
        { id: 'transactions', icon: 'receipt', label: 'Transactions', route: '/app/transactions' },
        { section: 'Inventory' },
        { id: 'products', icon: 'box', label: 'Products', route: '/app/products' },
        { id: 'inventory', icon: 'stack', label: 'Inventory', route: '/app/inventory' },
        { section: 'Commerce' },
        { id: 'customers', icon: 'users', label: 'Customers', route: '/app/customers' },
        { id: 'promotions', icon: 'tag', label: 'Promotions', route: '/app/promotions' },
        { section: 'Management' },
        { id: 'staff', icon: 'person', label: 'Staff', route: '/app/staff' },
        { id: 'reports', icon: 'chart', label: 'Reports', route: '/app/reports' },
        { id: 'settings', icon: 'cog', label: 'Store Settings', route: '/app/settings' },
      ];
    }
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
