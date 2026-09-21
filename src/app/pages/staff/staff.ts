import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Staff, Store, Role } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, NgClass, RouterModule],
  templateUrl: './staff.html'
})
export class StaffComponent implements OnInit {
  public staff = signal<Staff[]>([]);
  public stores = signal<Store[]>([]);
  public roles = signal<Role[]>([]);
  public isOwner = signal<boolean>(false);
  public canDelete = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public currentUser = signal<any>(null);
  public isStoreManager = signal<boolean>(false);
  public assignedStoreId = signal<string | null>(null);

  constructor(
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
    this.isOwner.set(user?.role === 'TENANT_ADMIN');
    this.canDelete.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER');
    this.isStoreManager.set(user?.role === 'STORE_MANAGER');
    this.assignedStoreId.set(user?.store || null);
  }

  ngOnInit() {
    this.loadStaff();
    this.loadStores();
    this.loadRoles();
  }

  async loadStaff() {
    this.isLoading.set(true);
    try {
      const data = await this.staffService.getStaff();
      const items = data.items || data;
      const user = this.currentUser();

      let filteredItems = items;
      if (user) {
        if (user.role === 'CASHIER') {
          filteredItems = items.filter((s: any) => s.id === user.sub || s.email === user.email);
        } else if (user.role === 'SUPERVISOR') {
          filteredItems = items.filter((s: any) => 
            (s.id === user.sub || s.email === user.email) || 
            (s.storeId === user.store && s.systemRole === 3)
          );
        } else if (user.role === 'STORE_MANAGER') {
          filteredItems = items.filter((s: any) => s.storeId === user.store);
        }
      }

      this.staff.set(filteredItems.map((s: any) => ({
        ...s,
        n: `${s.firstName} ${s.lastName}`,
        no: s.employeeNo,
        role: s.systemRole,
        active: s.isActive,
        hasPin: s.hasPin,
        hasPassword: s.hasPassword,
        last: 'Never',
        sales: s.todayRevenue || 0,
        txCount: 0
      })));
    } catch (error) {
      console.error('Failed to load staff', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  async loadRoles() {
    try {
      const response = await this.roleService.getRoles();
      const rawRoles = Array.isArray(response) ? response : (response.items || response.data || []);
      this.roles.set(rawRoles);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  }

  getStoreName(storeId: string) {
    const store = this.stores().find(st => st.id === storeId);
    if (store) return store.name;
    if (storeId && storeId === this.assignedStoreId()) return 'My Store';
    return 'Unknown';
  }

  getRoleName(roleId: string) {
    return this.roles().find(r => r.id === roleId)?.name || 'No Role';
  }

  async deleteStaff(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;

    try {
      await this.staffService.deleteStaff(id);
      this.loadStaff();
    } catch (error: any) {
      console.error('Failed to delete staff', error);
      alert(`Error deleting staff: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
