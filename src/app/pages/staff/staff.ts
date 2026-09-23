import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Staff, Store, Role } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

  public searchQuery = signal<string>('');
  public filterRole = signal<string>('ALL');
  public filterStore = signal<string>('ALL');

  public totalStaff = computed(() => this.staff().length);
  public activeStaff = computed(() => this.staff().filter(s => s.active !== false).length);
  public totalCashiers = computed(() => this.staff().filter(s => {
    const roleName = this.getRoleName(s.roleId || '').toLowerCase();
    return s.role === 'Cashier' || s.role === '3' || roleName.includes('cashier');
  }).length);
  public totalShiftRevenue = computed(() => this.staff().reduce((sum, s) => sum + (s.sales || 0), 0));

  public filteredStaff = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const roleF = this.filterRole();
    const storeF = this.filterStore();
    let list = this.staff();

    if (roleF !== 'ALL') {
      if (roleF === 'ACTIVE') {
        list = list.filter(s => s.active !== false);
      } else if (roleF === 'INACTIVE') {
        list = list.filter(s => s.active === false);
      } else if (roleF === 'CASHIER') {
        list = list.filter(s => {
          const roleName = this.getRoleName(s.roleId || '').toLowerCase();
          return s.role === 'Cashier' || s.role === '3' || roleName.includes('cashier');
        });
      }
    }

    if (storeF !== 'ALL') {
      list = list.filter(s => s.storeId === storeF);
    }

    if (!q) return list;

    return list.filter(s => {
      const name = (s.n || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const empNo = (s.no || '').toLowerCase();
      const roleName = this.getRoleName(s.roleId || '').toLowerCase();
      const storeName = this.getStoreName(s.storeId || '').toLowerCase();
      return name.includes(q) || email.includes(q) || empNo.includes(q) || roleName.includes(q) || storeName.includes(q);
    });
  });

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
      const data = await this.staffService.getStaff(1, 100);
      const items = data.items || data;
      const rawList = Array.isArray(items) ? items : [];
      const user = this.currentUser();

      let filteredItems = rawList;
      if (user) {
        if (user.role === 'CASHIER') {
          filteredItems = rawList.filter((s: any) => s.id === user.sub || s.email === user.email);
        } else if (user.role === 'SUPERVISOR') {
          filteredItems = rawList.filter((s: any) => 
            (s.id === user.sub || s.email === user.email) || 
            (s.storeId === user.store && s.systemRole === 3)
          );
        } else if (user.role === 'STORE_MANAGER') {
          filteredItems = rawList.filter((s: any) => s.storeId === user.store);
        }
      }

      this.staff.set(filteredItems.map((s: any) => ({
        ...s,
        id: s.id,
        n: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed Staff',
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        no: s.employeeNo || s.no || 'N/A',
        role: s.systemRole !== undefined ? s.systemRole.toString() : (s.role || 'Staff'),
        roleId: s.roleId,
        storeId: s.storeId,
        active: s.isActive !== undefined ? s.isActive : (s.active !== undefined ? s.active : true),
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
      const data = await this.storeService.getStores(1, 100);
      const raw = data.items || data;
      this.stores.set(Array.isArray(raw) ? raw : []);
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

  getStoreName(storeId: string): string {
    if (!storeId) return 'All Branches (HQ)';
    const store = this.stores().find(st => st.id === storeId);
    if (store) return `${store.name} (${store.code})`;
    if (storeId === this.assignedStoreId()) return 'My Store';
    return 'Headquarters';
  }

  getRoleName(roleId: string): string {
    if (!roleId) return 'Standard Staff';
    const found = this.roles().find(r => r.id === roleId);
    return found ? found.name : 'Staff';
  }

  setRoleFilter(filter: string) {
    this.filterRole.set(filter);
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
