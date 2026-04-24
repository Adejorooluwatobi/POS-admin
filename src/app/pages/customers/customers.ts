import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/pos.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './customers.html'
})
export class CustomersComponent implements OnInit {
  public customers = signal<Customer[]>([]);
  public isLoading = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedCustomer = signal<Partial<Customer>>({
    firstName: '',
    lastName: '',
    e: '',
    ph: '',
    loy: '',
    tier: 'BRONZE'
  });

  constructor(private customerService: CustomerService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading.set(true);
    try {
      const data = await this.customerService.getCustomers();
      const items = data.items || data;
      this.customers.set(items.map((c: any) => ({
        ...c,
        n: `${c.firstName} ${c.lastName}`,
        e: c.email,
        ph: c.phone,
        loy: c.loyaltyCardNo || 'N/A',
        tier: 'BRONZE', // Placeholder
        pts: 0,
        spend: 0,
        last: 'Never'
      })));
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedCustomer.set({
      firstName: '',
      lastName: '',
      e: '',
      ph: '',
      loy: '',
      tier: 'BRONZE'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(customer: Customer) {
    this.modalMode.set('edit');
    this.selectedCustomer.set({ ...customer });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveCustomer() {
    const c = this.selectedCustomer();
    const dto = {
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.e,
      phone: c.ph,
      loyaltyCardNo: c.loy
    };

    try {
      if (this.modalMode() === 'create') {
        await this.customerService.createCustomer(dto);
      } else if (this.modalMode() === 'edit' && c.id) {
        await this.customerService.updateCustomer(c.id, { ...dto, id: c.id, isActive: true });
      }
      this.closeModal();
      this.loadCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
    }
  }
}
