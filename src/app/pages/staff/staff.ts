import { Component, signal, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { ContextService } from '../../services/context.service';
import { Staff, Store, Role } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staff.html'
})
export class StaffComponent implements OnInit {
  public staff = signal<Staff[]>([]);
  public binStaff = signal<Staff[]>([]);
  public stores = signal<Store[]>([]);
  public roles = signal<Role[]>([]);
  public isOwner = signal<boolean>(false);
  public canDelete = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public currentUser = signal<any>(null);
  public isStoreManager = signal<boolean>(false);
  public assignedStoreId = signal<string | null>(null);

  // Auto-generated credentials modal
  public generatedCredentials = signal<{
    fullName: string;
    email: string;
    employeeNo: string;
    password: string;
    pin?: string;
  } | null>(null);
  public copiedNotice = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public filterRole = signal<string>('ALL');
  public filterStore = signal<string>('ALL');

  public totalStaff = computed(() => this.staff().length);
  public activeStaff = computed(() => this.staff().filter(s => s.active !== false).length);
  public totalCashiers = computed(() => this.staff().filter(s => {
    const roleName = this.getRoleName(s.roleId || '').toLowerCase();
    return s.role === 'Cashier' || s.role === '3' || roleName.includes('cashier');
  }).length);
  public binCount = computed(() => this.binStaff().length);
  public totalShiftRevenue = computed(() => this.staff().reduce((sum, s) => sum + (s.sales || 0), 0));

  public filteredStaff = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const roleF = this.filterRole();
    const storeF = this.contextService.selectedStoreId() || this.filterStore();
    
    let list: Staff[];
    if (roleF === 'BIN') {
      list = this.binStaff();
    } else {
      list = this.staff();
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

    if (storeF && storeF !== 'ALL') {
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
    public authService: AuthService,
    public contextService: ContextService
  ) {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
    this.isOwner.set(user?.role === 'TENANT_ADMIN');
    this.canDelete.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'STORE_MANAGER');
    this.isStoreManager.set(user?.role === 'STORE_MANAGER');
    this.assignedStoreId.set(user?.store || null);

    effect(() => {
      this.contextService.selectedTenantId();
      const sId = this.contextService.selectedStoreId();
      this.filterStore.set(sId || 'ALL');
      this.loadStaff();
      this.loadStores();
      this.loadRoles();
    });
  }

  ngOnInit() {
    // Initial load handled by effect
  }

  async loadStaff() {
    this.isLoading.set(true);
    try {
      const [data, binData] = await Promise.all([
        this.staffService.getStaff(1, 100),
        this.staffService.getStaffBin(1, 100).catch(() => ({ items: [] }))
      ]);

      const items = data.items || data;
      const rawList = Array.isArray(items) ? items : [];

      const binItems = binData.items || binData;
      const rawBinList = Array.isArray(binItems) ? binItems : [];

      const user = this.currentUser();
      const effectiveStoreId = this.contextService.selectedStoreId();

      const filterScoped = (list: any[]) => {
        let scoped = list;
        if (effectiveStoreId) {
          scoped = scoped.filter((s: any) => s.storeId === effectiveStoreId);
        }
        if (user) {
          if (user.role === 'CASHIER') {
            scoped = scoped.filter((s: any) => s.id === user.sub || s.email === user.email);
          } else if (user.role === 'SUPERVISOR') {
            scoped = scoped.filter((s: any) => 
              (s.id === user.sub || s.email === user.email) || 
              (s.storeId === user.store && s.systemRole === 3)
            );
          } else if (user.role === 'STORE_MANAGER') {
            scoped = scoped.filter((s: any) => s.storeId === user.store);
          }
        }
        return scoped;
      };

      const mapStaff = (s: any, isBin = false): Staff => ({
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
        active: isBin ? false : (s.isActive !== undefined ? s.isActive : (s.active !== undefined ? s.active : true)),
        isDeleted: isBin || Boolean(s.isDeleted),
        deletedAt: s.deletedAt,
        hasPin: s.hasPin,
        hasPassword: s.hasPassword,
        last: 'Never',
        sales: s.todayRevenue || 0,
        txCount: 0
      });

      this.staff.set(filterScoped(rawList).map(s => mapStaff(s, false)));
      this.binStaff.set(filterScoped(rawBinList).map(s => mapStaff(s, true)));
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

  canResetStaff(target: any): boolean {
    const me = this.currentUser();
    if (!me || target.isDeleted) return false;
    const targetRole = target.role;
    const isTargetSuper = targetRole === 'SuperAdmin' || targetRole === '0';
    const isTargetTenantAdmin = targetRole === 'TenantAdmin' || targetRole === '5';
    
    if (me.role === 'SUPER_ADMIN') {
      return isTargetTenantAdmin;
    }
    if (me.role === 'TENANT_ADMIN' || me.role === 'MANAGER') {
      return !isTargetSuper;
    }
    if (me.role === 'STORE_MANAGER') {
      return !isTargetSuper && !isTargetTenantAdmin && (target.storeId === me.store);
    }
    return false;
  }

  async resetStaffPassword(staff: any) {
    if (!confirm(`Generate a new temporary password for ${staff.n}?\n\nThey will be required to change their credentials on their next login.`)) {
      return;
    }

    try {
      const res = await this.staffService.generatePassword(staff.id);
      this.generatedCredentials.set({
        fullName: res.fullName || staff.n,
        email: res.email || staff.email,
        employeeNo: res.employeeNo || staff.no,
        password: res.generatedPassword,
        pin: res.generatedPin
      });
    } catch (error: any) {
      console.error('Failed to generate staff credentials', error);
      alert(error?.error?.message || 'Failed to generate temporary credentials.');
    }
  }

  copyCredentials() {
    const creds = this.generatedCredentials();
    if (!creds) return;
    let text = `RetailOS Staff Credentials\n` +
      `Staff Member: ${creds.fullName}\n` +
      `Employee ID: ${creds.employeeNo}\n` +
      `Login Email: ${creds.email}\n` +
      `Temporary Web Password: ${creds.password}\n`;
    if (creds.pin) {
      text += `Temporary POS Register PIN: ${creds.pin}\n`;
    }
    text += `\n* Note: You will be required to change your credentials upon first login.`;
    navigator.clipboard.writeText(text);
    this.copiedNotice.set(true);
    setTimeout(() => this.copiedNotice.set(false), 3000);
  }

  closeCredentialsModal() {
    this.generatedCredentials.set(null);
  }

  async deleteStaff(id: string | undefined) {
    if (!id) return;
    if (!confirm('Move this staff member to the Recycle Bin?\n\nTheir login credentials will be deactivated. You can restore or permanently delete them from the Staff Bin.')) return;

    try {
      await this.staffService.deleteStaff(id);
      this.loadStaff();
    } catch (error: any) {
      console.error('Failed to move staff to bin', error);
      alert(`Error: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async restoreStaff(id: string | undefined) {
    if (!id) return;
    if (!confirm('Restore this staff member from the Recycle Bin?\n\nTheir account will be restored to active status.')) return;

    try {
      await this.staffService.restoreStaff(id);
      this.loadStaff();
    } catch (error: any) {
      console.error('Failed to restore staff', error);
      alert(`Error restoring staff: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  async purgeStaff(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to permanently delete this staff member?\n\nThis action cannot be undone and permanently deletes the record.')) return;

    try {
      await this.staffService.purgeStaff(id);
      this.loadStaff();
    } catch (error: any) {
      console.error('Failed to purge staff', error);
      alert(`Error purging staff: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }
}
