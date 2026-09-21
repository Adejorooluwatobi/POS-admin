import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/pos.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, NgClass, RouterModule],
  templateUrl: './roles.html'
})
export class RolesComponent implements OnInit {
  public roles = signal<Role[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  public systemRoles = [
    { id: 2, name: 'Store Manager', icon: '👔', key: 'StoreManager' },
    { id: 5, name: 'Manager', icon: '💼', key: 'Manager' },
    { id: 4, name: 'Supervisor', icon: '🕵️', key: 'Supervisor' },
    { id: 3, name: 'Cashier', icon: '🛒', key: 'Cashier' }
  ];

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
      const items = (data.items || data).map((r: any) => ({
        ...r,
        systemRole: this.mapSystemRoleToId(r.systemRole)
      }));
      this.roles.set(items);
    } catch (error) {
      console.error('Failed to load roles', error);
    } finally {
      this.isLoading.set(false);
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
