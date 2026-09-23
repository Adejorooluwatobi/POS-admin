import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/pos.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './roles.html'
})
export class RolesComponent implements OnInit {
  public roles = signal<Role[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  public systemRoles = [
    { id: 2, name: 'Store Manager', icon: '👔', key: 'StoreManager' },
    { id: 5, name: 'Manager', icon: '💼', key: 'Manager' },
    { id: 4, name: 'Supervisor', icon: '🕵️', key: 'Supervisor' },
    { id: 3, name: 'Cashier', icon: '🛒', key: 'Cashier' }
  ];

  public totalRoles = computed(() => this.roles().length);
  public activeRoles = computed(() => this.roles().filter(r => r.isActive !== false).length);
  public managerRoles = computed(() => this.roles().filter(r => r.systemRole === 2 || r.systemRole === 5).length);
  public cashierRoles = computed(() => this.roles().filter(r => r.systemRole === 3).length);

  public filteredRoles = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    let list = this.roles();

    if (filter === 'ACTIVE') {
      list = list.filter(r => r.isActive !== false);
    } else if (filter === 'INACTIVE') {
      list = list.filter(r => r.isActive === false);
    }

    if (!q) return list;

    return list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  constructor(
    private roleService: RoleService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN');
  }

  ngOnInit() {
    this.loadRoles();
  }

  async loadRoles() {
    this.isLoading.set(true);
    try {
      const data = await this.roleService.getRoles();
      const raw = data.items || data;
      const rawList = Array.isArray(raw) ? raw : [];
      const items = rawList.map((r: any) => ({
        ...r,
        systemRole: this.mapSystemRoleToId(r.systemRole),
        isActive: r.isActive !== undefined ? r.isActive : true
      }));
      this.roles.set(items);
    } catch (error) {
      console.error('Failed to load roles', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE') {
    this.statusFilter.set(filter);
  }

  async deleteRole(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this security role? Staff members assigned this role must be reassigned.')) return;

    try {
      await this.roleService.deleteRole(id);
      this.loadRoles();
    } catch (error: any) {
      console.error('Failed to delete role', error);
      const msg = error.error?.message || error.message || 'Unknown error';
      if (msg.includes('FK_Staff_Roles_RoleId') || msg.includes('assigned to')) {
        alert('Cannot delete this role because it is currently assigned to one or more staff members. Please reassign the staff to a different role first.');
      } else {
        alert(`Error deleting role: ${msg}`);
      }
    }
  }

  getPermissionsKeys(permissions?: { [key: string]: boolean }): string[] {
    if (!permissions) return [];
    return Object.keys(permissions).filter(k => permissions[k]);
  }

  private mapSystemRoleToId(role: string | number): number {
    if (typeof role === 'number') return role;
    const found = this.systemRoles.find(sr => sr.key === role || sr.name === role);
    return found ? found.id : 3;
  }
}
