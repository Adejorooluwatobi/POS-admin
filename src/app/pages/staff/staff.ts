import { Component, signal, OnInit } from '@angular/core';
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
  public isLoading = signal<boolean>(false);

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
    hiredAt: new Date().toISOString().split('T')[0]
  });

  constructor(
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    private authService: AuthService
  ) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
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
      this.staff.set(items.map((s: any) => ({
        ...s,
        n: `${s.firstName} ${s.lastName}`,
        no: s.employeeNo,
        role: s.systemRole,
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
      storeId: '',
      hiredAt: new Date().toISOString().split('T')[0]
    });
    this.isModalOpen.set(true);
  }

  openEditModal(staff: Staff) {
    this.modalMode.set('edit');
    this.selectedStaff.set({ ...staff });
    this.isModalOpen.set(true);
  }

  openViewModal(staff: Staff) {
    this.modalMode.set('view');
    this.selectedStaff.set({ ...staff });
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
      pin: '1234' // Default PIN for new staff
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
}
