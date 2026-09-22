import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './role-form.html'
})
export class RoleFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public roleId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public role = signal<any>({
    name: '',
    description: '',
    systemRole: 3,
    isActive: true,
    permissions: {}
  });

  public systemRoles = [
    { id: 2, name: 'Store Manager', icon: '👔', desc: 'Manage branch store, staff, products and till operations' },
    { id: 5, name: 'General Manager', icon: '💼', desc: 'Full business operations across all retail locations' },
    { id: 4, name: 'Shift Supervisor', icon: '🕵️', desc: 'Oversee cashiers, float counts and till audits' },
    { id: 3, name: 'Cashier / Associate', icon: '🛒', desc: 'Frontline checkout, scanning, receipt generation' }
  ];

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
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.roleId.set(id);
      await this.loadRole(id);
    } else {
      // Initialize default permissions for Cashier (systemRole 3)
      this.applyTemplate(3);
    }
  }

  async loadRole(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.roleService.getRoleById(id);
      this.role.set({
        name: data.name || '',
        description: data.description || '',
        systemRole: typeof data.systemRole === 'number' ? data.systemRole : 3,
        isActive: data.isActive !== undefined ? data.isActive : true,
        permissions: data.permissions || {}
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load role details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  applyTemplate(systemRoleId: number) {
    const r = this.role();
    const perms: { [key: string]: boolean } = {};

    if (systemRoleId === 2) { // Store Manager
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'MANAGE_STAFF', 'VIEW_REPORTS'].forEach(p => perms[p] = true);
    } else if (systemRoleId === 5) { // General Manager
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VOID_TRANSACTIONS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'MANAGE_STAFF', 'VIEW_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_ROLES'].forEach(p => perms[p] = true);
    } else if (systemRoleId === 4) { // Supervisor
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'VIEW_REPORTS'].forEach(p => perms[p] = true);
    } else if (systemRoleId === 3) { // Cashier
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS'].forEach(p => perms[p] = true);
    }

    this.role.set({
      ...r,
      systemRole: systemRoleId,
      name: r.name ? r.name : (this.systemRoles.find(s => s.id === systemRoleId)?.name || ''),
      permissions: perms
    });
  }

  togglePermission(key: string) {
    const r = this.role();
    const current = { ...(r.permissions || {}) };
    current[key] = !current[key];
    this.role.set({ ...r, permissions: current });
  }

  isPermissionActive(key: string): boolean {
    return !!this.role().permissions?.[key];
  }

  async saveRole() {
    const r = this.role();
    if (!r.name || !r.name.trim()) {
      this.errorMessage.set('Role name is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: r.name.trim(),
      description: r.description ? r.description.trim() : '',
      systemRole: r.systemRole,
      isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
      permissions: r.permissions || {}
    };

    try {
      if (this.isEditMode()) {
        await this.roleService.updateRole(this.roleId()!, payload);
      } else {
        await this.roleService.createRole(payload);
      }
      this.router.navigate(['/app/roles']);
    } catch (err: any) {
      console.error('Failed to save role', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save role.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/roles']);
  }
}
