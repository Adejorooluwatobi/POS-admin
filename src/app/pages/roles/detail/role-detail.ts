import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './role-detail.html'
})
export class RoleDetailComponent implements OnInit {
  public roleId = signal<string | null>(null);
  public role = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  public permissionGroups = [
    {
      group: 'Point of Sale & Checkout',
      permissions: [
        { key: 'VIEW_DASHBOARD', label: 'View Dashboard & KPIs', desc: 'Access high-level sales and operational summaries' },
        { key: 'VIEW_TRANSACTIONS', label: 'View Order History', desc: 'Search and inspect previous receipts and sales' },
        { key: 'VOID_TRANSACTIONS', label: 'Void / Refund Transactions', desc: 'Perform item returns and transaction cancellations' }
      ]
    },
    {
      group: 'Catalog & Inventory Operations',
      permissions: [
        { key: 'MANAGE_PRODUCTS', label: 'Manage Products & Prices', desc: 'Create, update barcodes, prices and packaging units' },
        { key: 'MANAGE_INVENTORY', label: 'Stock Movements & Transfers', desc: 'Approve requisitions, dispatch transfers and receive stock' }
      ]
    },
    {
      group: 'Staff & Administration',
      permissions: [
        { key: 'MANAGE_STAFF', label: 'Manage Staff Members', desc: 'Create employees, reset POS PINs and set work schedules' },
        { key: 'VIEW_REPORTS', label: 'Financial & Audit Reports', desc: 'Export ledger summaries and end-of-day reports' },
        { key: 'MANAGE_SETTINGS', label: 'Branch & System Settings', desc: 'Configure receipt printers, tax rates and store details' },
        { key: 'MANAGE_ROLES', label: 'Security Roles & Permissions', desc: 'Create and assign custom roles to staff' }
      ]
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/roles']);
      return;
    }
    this.roleId.set(id);
    await this.loadRole(id);
  }

  async loadRole(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.roleService.getRoleById(id);
      this.role.set(data);
    } catch (err: any) {
      console.error('Failed to load role details', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load role details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getSystemRoleName(systemRole: number | undefined): string {
    switch (systemRole) {
      case 0: return 'System Administrator';
      case 1: return 'Manager';
      case 2: return 'Store Manager';
      case 3: return 'Cashier / Store Associate';
      case 4: return 'Supervisor';
      case 5: return 'General Manager';
      default: return 'Custom Staff Role';
    }
  }

  hasPermission(key: string): boolean {
    return !!this.role()?.permissions?.[key];
  }

  getActivePermissionsCount(): number {
    const perms = this.role()?.permissions;
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  }
}
