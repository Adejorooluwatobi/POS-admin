import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Staff, Store } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './staff.html'
})
export class StaffComponent implements OnInit {
  public staff = signal<Staff[]>([]);
  public stores = signal<Store[]>([]);
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
    role: 'Cashier',
    active: true
  });

  constructor(
    private staffService: StaffService,
    private storeService: StoreService,
    private authService: AuthService
  ) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
  }

  ngOnInit() {
    this.loadStaff();
    this.loadStores();
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

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedStaff.set({
      firstName: '',
      lastName: '',
      email: '',
      no: '',
      role: 'Cashier',
      active: true,
      storeId: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(staff: Staff) {
    this.modalMode.set('edit');
    this.selectedStaff.set({ ...staff });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveStaff() {
    const s = this.selectedStaff();
    const dto = {
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      employeeNo: s.no,
      systemRole: s.role === 'MANAGER' ? 2 : s.role === 'CASHIER' ? 3 : 3, // Simplistic mapping
      storeId: s.storeId,
      isActive: s.active,
      pin: '1234' // Default PIN for new staff
    };

    try {
      if (this.modalMode() === 'create') {
        await this.staffService.createStaff(dto);
      } else if (this.modalMode() === 'edit' && s.id) {
        await this.staffService.updateStaff(s.id, dto);
      }
      this.closeModal();
      this.loadStaff();
    } catch (error) {
      console.error('Failed to save staff', error);
    }
  }

  getStoreName(storeId: string) {
    return this.stores().find(st => st.id === storeId)?.name || 'Unknown';
  }
}
