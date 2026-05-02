import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import { Staff, Store, Role } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
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

  public filteredRoles = computed(() => {
    const roles = this.roles();
    const user = this.currentUser();
    if (!user) return [];

    // SUPER_ADMIN can create everything
    if (user.role === 'SUPER_ADMIN') return roles;

    // TENANT_ADMIN can create everything in tenant except SuperAdmin (0)
    if (user.role === 'TENANT_ADMIN') {
      return roles.filter(r => r.systemRole !== 0);
    }

    // MANAGER (General Manager) can create Store Manager (2), Cashier (3), Supervisor (4)
    if (user.role === 'MANAGER') {
      return roles.filter(r => r.systemRole === 2 || r.systemRole === 3 || r.systemRole === 4);
    }

    // STORE_MANAGER can create Supervisor (4), Cashier (3)
    if (user.role === 'STORE_MANAGER') {
      return roles.filter(r => r.systemRole === 3 || r.systemRole === 4);
    }

    // SUPERVISOR can only create Cashier (3)
    if (user.role === 'SUPERVISOR') {
      return roles.filter(r => r.systemRole === 3);
    }

    return [];
  });

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedStaff = signal<Partial<Staff>>({
    firstName: '',
    lastName: '',
    email: '',
    no: '',
    roleId: '',
    active: true,
    hiredAt: new Date().toISOString().split('T')[0],
    pin: ''
  });

  constructor(
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
    this.isOwner.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN');
    this.canDelete.set(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER');
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
          // Supervisors see themselves and Cashiers in their store
          filteredItems = items.filter((s: any) => 
            (s.id === user.sub || s.email === user.email) || 
            (s.storeId === user.store && s.systemRole === 3)
          );
        } else if (user.role === 'STORE_MANAGER') {
          // Store Managers see everyone in their store
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
        last: 'Never', // Placeholder
        sales: 0,
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
      const data = await this.roleService.getRoles();
      this.roles.set(data.items || data);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedStaff.set({
      firstName: '',
      lastName: '',
      email: '',
      no: '',
      roleId: '',
      active: true,
      storeId: this.currentUser()?.store || '', // Use 'store' property which contains the storeId
      hiredAt: new Date().toISOString().split('T')[0],
      pin: '',
      password: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(staff: Staff) {
    this.modalMode.set('edit');
    this.selectedStaff.set({ 
      ...staff, 
      pin: staff.hasPin ? '****' : '', 
      password: staff.hasPassword ? '********' : '' 
    });
    this.isModalOpen.set(true);
  }

  openViewModal(staff: Staff) {
    this.modalMode.set('view');
    this.selectedStaff.set({ 
      ...staff, 
      pin: staff.hasPin ? '****' : '', 
      password: staff.hasPassword ? '********' : '' 
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveStaff() {
    const s = this.selectedStaff();
    const user = this.authService.currentUser();
    
    // Find systemRole from selected roleId
    const selectedRole = this.roles().find(r => r.id === s.roleId);
    
    let finalPin = undefined;
    if (this.modalMode() === 'create') {
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

    const dto = {
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      employeeNo: s.no,
      roleId: s.roleId,
      systemRole: selectedRole?.systemRole || 3, // Fallback to Cashier if not found
      storeId: s.storeId,
      isActive: s.active,
      hiredAt: s.hiredAt,
      tenantId: user?.tenantId,
      pin: finalPin,
      password: finalPassword
    };

    try {
      if (this.modalMode() === 'create') {
        await this.staffService.createStaff(dto);
      } else if (this.modalMode() === 'edit' && s.id) {
        await this.staffService.updateStaff(s.id, { ...dto, id: s.id });
      }
      this.closeModal();
      this.loadStaff();
    } catch (error: any) {
      console.error('Failed to save staff', error);
      alert(`Error saving staff: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  getStoreName(storeId: string) {
    return this.stores().find(st => st.id === storeId)?.name || 'Unknown';
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
