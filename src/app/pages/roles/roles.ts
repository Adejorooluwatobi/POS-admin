import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/pos.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './roles.html'
})
export class RolesComponent implements OnInit {
  public roles = signal<Role[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedRole = signal<Partial<Role>>({
    name: '',
    description: '',
    isActive: true,
    permissions: {},
    systemRole: 3
  });

  public systemRoles = [
    { id: 2, name: 'Store Manager', icon: '👔' },
    { id: 5, name: 'Manager', icon: '💼' },
    { id: 4, name: 'Supervisor', icon: '🕵️' },
    { id: 3, name: 'Cashier', icon: '🛒' }
  ];

  public availablePermissions = [
    'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VOID_TRANSACTIONS',
    'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'MANAGE_STAFF',
    'VIEW_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_ROLES'
  ];

  constructor(
    private roleService: RoleService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN');
  }

  async toggleRoleStatus(role: Role) {
    if (!role.id) return;
    try {
      await this.roleService.updateRole(role.id, { ...role, isActive: !role.isActive });
      this.loadRoles();
    } catch (error) {
      console.error('Failed to toggle role status', error);
    }
  }

  async deleteRole(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      await this.roleService.deleteRole(id);
      this.loadRoles();
    } catch (error: any) {
      console.error('Failed to delete role', error);
      alert(`Error deleting role: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  ngOnInit() {
    this.loadRoles();
  }

  async loadRoles() {
    this.isLoading.set(true);
    try {
      const data = await this.roleService.getRoles();
      this.roles.set(data.items || data);
    } catch (error) {
      console.error('Failed to load roles', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedRole.set({
      name: '',
      description: '',
      isActive: true,
      permissions: {},
      systemRole: 3
    });
    this.isModalOpen.set(true);
  }

  openEditModal(role: Role) {
    this.modalMode.set('edit');
    this.selectedRole.set({ ...role });
    this.isModalOpen.set(true);
  }

  openViewModal(role: Role) {
    this.modalMode.set('view');
    this.selectedRole.set({ ...role });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  selectSystemRole(id: number) {
    const selected = this.systemRoles.find(sr => sr.id === id);
    this.selectedRole.set({ 
      ...this.selectedRole(), 
      systemRole: id,
      name: selected?.name || '' 
    });
    
    // Auto-fill common permissions based on system role
    const perms: { [key: string]: boolean } = {};
    if (id === 2) { // Store Manager
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'MANAGE_STAFF', 'VIEW_REPORTS'].forEach(p => perms[p] = true);
    } else if (id === 4) { // Supervisor
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS', 'MANAGE_INVENTORY', 'VIEW_REPORTS'].forEach(p => perms[p] = true);
    } else if (id === 3) { // Cashier
      ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'MANAGE_PRODUCTS'].forEach(p => perms[p] = true);
    }
    this.selectedRole.set({ ...this.selectedRole(), permissions: perms });
  }

  togglePermission(perm: string) {
    const role = this.selectedRole();
    const perms = { ...(role.permissions || {}) };
    perms[perm] = !perms[perm];
    this.selectedRole.set({ ...role, permissions: perms });
  }

  async saveRole() {
    const r = this.selectedRole();
    const user = this.authService.currentUser();
    
    const payload = {
      name: r.name,
      description: r.description,
      permissions: r.permissions || {}
    };

    try {
      if (this.modalMode() === 'create') {
        const result = await this.roleService.createRole(payload);
        console.log('Role created successfully', result);
      } else if (this.modalMode() === 'edit' && r.id) {
        await this.roleService.updateRole(r.id, payload);
      }
      this.closeModal();
      this.loadRoles();
    } catch (error: any) {
      console.error('Failed to save role', error);
      alert(`Error saving role: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  getPermissionsKeys(permissions?: { [key: string]: boolean }): string[] {
    if (!permissions) return [];
    return Object.keys(permissions).filter(k => permissions[k]);
  }
}
