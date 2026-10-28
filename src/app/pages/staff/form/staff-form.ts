import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StaffService } from '../../../services/staff.service';
import { StoreService } from '../../../services/store.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { ContextService } from '../../../services/context.service';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staff-form.html'
})
export class StaffFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public staffId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public stores = signal<any[]>([]);
  public roles = signal<any[]>([]);

  // Generated credentials modal on creation
  public generatedCredentials = signal<{
    fullName: string;
    email: string;
    employeeNo: string;
    password: string;
    pin?: string;
  } | null>(null);
  public copiedNotice = signal<boolean>(false);
  public showPassword = signal<boolean>(false);

  public staff = signal<any>({
    firstName: '',
    lastName: '',
    email: '',
    employeeNo: '',
    roleId: '',
    storeId: null,
    isActive: true,
    hiredAt: new Date().toISOString().split('T')[0],
    pin: '',
    password: ''
  });

  public filteredRoles = computed(() => {
    const roles = this.roles();
    const user = this.authService.currentUser();
    if (!user) return [];
    if (user.role === 'SUPER_ADMIN') return roles;
    if (user.role === 'TENANT_ADMIN') return roles.filter(r => r.systemRole !== 0);
    if (user.role === 'MANAGER') return roles.filter(r => r.systemRole !== 0 && r.systemRole !== 5);
    if (user.role === 'STORE_MANAGER') return roles.filter(r => r.systemRole !== 0 && r.systemRole !== 5 && r.systemRole !== 2);
    if (user.role === 'SUPERVISOR') return roles.filter(r => r.systemRole === 3);
    return [];
  });

  public selectedSystemRole = computed(() => {
    const rId = this.staff().roleId;
    if (!rId) return null;
    return this.roles().find(r => r.id === rId)?.systemRole ?? null;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    public authService: AuthService,
    public contextService: ContextService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadStores(), this.loadRoles()]);
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.staffId.set(id);
      await this.loadStaffMember(id);
    } else {
      const activeStore = this.contextService.selectedStoreId();
      if (activeStore) {
        this.staff.update(s => ({ ...s, storeId: activeStore }));
      }
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  }

  async loadRoles() {
    try {
      const data = await this.roleService.getRoles();
      this.roles.set(data.items || data);
    } catch (e) {
      console.error('Failed to load roles', e);
    }
  }

  async loadStaffMember(id: string) {
    this.isLoading.set(true);
    try {
      const s = await this.staffService.getStaffById(id);
      this.staff.set({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        employeeNo: s.employeeNo || s.no,
        roleId: s.roleId || '',
        storeId: s.storeId || null,
        isActive: s.isActive !== undefined ? s.isActive : s.active,
        hiredAt: s.hiredAt ? s.hiredAt.split('T')[0] : '',
        pin: s.hasPin ? '****' : '',
        password: s.hasPassword ? '********' : ''
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load staff details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  generateQuickPin() {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    this.staff.update(s => ({ ...s, pin: randomPin }));
  }

  async saveStaff() {
    const s = this.staff();
    if (!s.firstName || !s.firstName.trim()) {
      this.errorMessage.set('First Name is required.');
      return;
    }
    if (!s.lastName || !s.lastName.trim()) {
      this.errorMessage.set('Last Name is required.');
      return;
    }
    if (!s.email || !s.email.trim()) {
      this.errorMessage.set('Email is required.');
      return;
    }

    const selectedRole = this.roles().find(r => r.id === s.roleId);
    const systemRole = selectedRole?.systemRole || 3;
    const finalStoreId = (systemRole === 5) ? null : s.storeId;
    const finalRoleId = s.roleId?.startsWith('system-') ? null : s.roleId;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();

    if (this.isEditMode()) {
      let finalPin = (s.pin && s.pin !== '****') ? s.pin : undefined;
      let finalPassword = undefined;
      if (s.password === '********') {
        finalPassword = undefined;
      } else if (s.password === '') {
        finalPassword = '';
      } else {
        finalPassword = s.password;
      }

      const dto = {
        firstName: s.firstName.trim(),
        lastName: s.lastName.trim(),
        email: s.email.trim(),
        employeeNo: s.employeeNo ? s.employeeNo.trim() : null,
        roleId: finalRoleId,
        systemRole: systemRole,
        storeId: finalStoreId,
        isActive: Boolean(s.isActive),
        hiredAt: s.hiredAt,
        tenantId: user?.tenantId,
        pin: finalPin,
        password: finalPassword
      };

      try {
        await this.staffService.updateStaff(this.staffId()!, { ...dto, id: this.staffId()! });
        this.router.navigate(['/app/staff']);
      } catch (err: any) {
        console.error('Failed to update staff member', err);
        this.errorMessage.set(err?.error?.message || 'Failed to update staff member.');
      } finally {
        this.isSaving.set(false);
      }
    } else {
      // Creation mode: Backend auto-generates temporary password & cashier PIN!
      const createDto = {
        firstName: s.firstName.trim(),
        lastName: s.lastName.trim(),
        email: s.email.trim(),
        employeeNo: s.employeeNo ? s.employeeNo.trim() : null,
        roleId: finalRoleId,
        systemRole: systemRole,
        storeId: finalStoreId,
        isActive: Boolean(s.isActive),
        hiredAt: s.hiredAt,
        tenantId: user?.tenantId
      };

      try {
        const res = await this.staffService.createStaff(createDto);
        if (res && res.generatedPassword) {
          this.generatedCredentials.set({
            fullName: `${res.firstName} ${res.lastName}`,
            email: res.email,
            employeeNo: res.employeeNo || s.employeeNo || 'N/A',
            password: res.generatedPassword,
            pin: res.generatedPin
          });
        } else {
          this.router.navigate(['/app/staff']);
        }
      } catch (err: any) {
        console.error('Failed to create staff member', err);
        this.errorMessage.set(err?.error?.message || 'Failed to create staff member.');
      } finally {
        this.isSaving.set(false);
      }
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
    this.router.navigate(['/app/staff']);
  }

  goBack() {
    this.router.navigate(['/app/staff']);
  }
}
