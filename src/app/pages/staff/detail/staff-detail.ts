import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StaffService } from '../../../services/staff.service';
import { StoreService } from '../../../services/store.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-detail.html'
})
export class StaffDetailComponent implements OnInit {
  public staffId = signal<string | null>(null);
  public staff = signal<any | null>(null);
  public store = signal<any | null>(null);
  public role = signal<any | null>(null);
  public stats = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  // Credentials generation
  public generatedCredentials = signal<{
    fullName: string;
    email: string;
    employeeNo: string;
    password: string;
    pin?: string;
  } | null>(null);
  public isGeneratingPassword = signal<boolean>(false);
  public copiedNotice = signal<boolean>(false);

  public canResetPassword = computed(() => {
    const s = this.staff();
    const me = this.authService.currentUser();
    if (!s || !me || s.isDeleted) return false;
    const sysRole = s.systemRole;
    if (me.role === 'SUPER_ADMIN') {
      return sysRole === 5; // TenantAdmin only
    }
    if (me.role === 'TENANT_ADMIN' || me.role === 'MANAGER') {
      return sysRole !== 0;
    }
    if (me.role === 'STORE_MANAGER') {
      return (s.storeId === me.store) && sysRole !== 0 && sysRole !== 5;
    }
    return false;
  });

  public canDeleteStaff = computed(() => {
    const s = this.staff();
    const me = this.authService.currentUser();
    if (!s || !me || s.isDeleted) return false;
    if (me.role === 'SUPER_ADMIN') return false;
    if (me.role === 'TENANT_ADMIN' || me.role === 'MANAGER') {
      return s.systemRole !== 0;
    }
    if (me.role === 'STORE_MANAGER') {
      return (s.storeId === me.store) && s.systemRole !== 0 && s.systemRole !== 5;
    }
    return false;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/staff']);
      return;
    }
    this.staffId.set(id);
    await this.loadStaffData(id);
  }

  async loadStaffData(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [s, storesData, rolesData, statsData] = await Promise.all([
        this.staffService.getStaffById(id),
        this.storeService.getStores().catch(() => ({ items: [] })),
        this.roleService.getRoles().catch(() => ({ items: [] })),
        this.staffService.getStaffStats(id).catch(() => null)
      ]);

      this.staff.set(s);
      this.stats.set(statsData);

      const storesList = storesData.items || storesData || [];
      if (s.storeId) {
        this.store.set(storesList.find((st: any) => st.id === s.storeId) || null);
      }

      const rolesList = rolesData.items || rolesData || [];
      if (s.roleId) {
        this.role.set(rolesList.find((r: any) => r.id === s.roleId) || null);
      }
    } catch (err: any) {
      console.error('Failed to load staff detail', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load staff details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateStaffPassword() {
    const s = this.staff();
    if (!s) return;

    if (!confirm(`Generate a new temporary password for ${s.firstName} ${s.lastName}?\n\nThey will be required to change their credentials on their next login.`)) {
      return;
    }

    this.isGeneratingPassword.set(true);
    try {
      const res = await this.staffService.generatePassword(s.id);
      this.generatedCredentials.set({
        fullName: res.fullName || `${s.firstName} ${s.lastName}`,
        email: res.email || s.email,
        employeeNo: res.employeeNo || s.employeeNo || 'N/A',
        password: res.generatedPassword,
        pin: res.generatedPin
      });
    } catch (error: any) {
      console.error('Failed to generate staff credentials', error);
      alert(error?.error?.message || 'Failed to generate temporary credentials.');
    } finally {
      this.isGeneratingPassword.set(false);
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

  async moveToBin() {
    const s = this.staff();
    if (!s) return;

    if (!confirm(`Move ${s.firstName} ${s.lastName} to the Recycle Bin?\n\nTheir login and terminal access will be deactivated. You can restore or permanently delete them from the Staff Bin.`)) {
      return;
    }

    try {
      await this.staffService.deleteStaff(s.id);
      this.router.navigate(['/app/staff']);
    } catch (error: any) {
      console.error('Failed to move staff to bin', error);
      alert(error?.error?.message || 'Failed to move staff to bin.');
    }
  }

  async restoreStaff() {
    const s = this.staff();
    if (!s) return;

    if (!confirm(`Restore ${s.firstName} ${s.lastName} from the Recycle Bin?\n\nTheir account will be restored to active status.`)) {
      return;
    }

    try {
      await this.staffService.restoreStaff(s.id);
      await this.loadStaffData(s.id);
    } catch (error: any) {
      console.error('Failed to restore staff', error);
      alert(error?.error?.message || 'Failed to restore staff.');
    }
  }

  async purgeStaff() {
    const s = this.staff();
    if (!s) return;

    if (!confirm(`Permanently purge ${s.firstName} ${s.lastName} from the database?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await this.staffService.purgeStaff(s.id);
      this.router.navigate(['/app/staff']);
    } catch (error: any) {
      console.error('Failed to purge staff', error);
      alert(error?.error?.message || 'Failed to permanently delete staff.');
    }
  }

  getSystemRoleName(systemRole: number | undefined): string {
    switch (systemRole) {
      case 0: return 'System Admin';
      case 1: return 'Manager';
      case 2: return 'Store Manager';
      case 3: return 'Cashier';
      case 4: return 'Supervisor';
      case 5: return 'Tenant Admin';
      default: return 'Staff';
    }
  }
}
