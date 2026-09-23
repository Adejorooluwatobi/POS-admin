import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StaffService } from '../../../services/staff.service';
import { StoreService } from '../../../services/store.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';

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
    public authService: AuthService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadStores(), this.loadRoles()]);
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.staffId.set(id);
      await this.loadStaffMember(id);
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

    let finalPin = undefined;
    if (!this.isEditMode()) {
      finalPin = s.pin ? s.pin : '1234';
    } else {
      finalPin = (s.pin && s.pin !== '****') ? s.pin : undefined;
    }

    let finalPassword = undefined;
    if (s.password === '********') {
      finalPassword = undefined;
    } else if (s.password === '') {
      finalPassword = '';
    } else {
      finalPassword = s.password;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();
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
      if (this.isEditMode()) {
        await this.staffService.updateStaff(this.staffId()!, { ...dto, id: this.staffId()! });
      } else {
        await this.staffService.createStaff(dto);
      }
      this.router.navigate(['/app/staff']);
    } catch (err: any) {
      console.error('Failed to save staff member', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save staff member.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/staff']);
  }
}
