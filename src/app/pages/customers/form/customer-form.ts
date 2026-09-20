import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer-form.html'
})
export class CustomerFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public customerId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public customer = signal<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loyaltyCardNo: '',
    isActive: true
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.customerId.set(id);
      await this.loadCustomer(id);
    }
  }

  async loadCustomer(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.customerService.getCustomerById(id);
      this.customer.set({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || '',
        phone: data.phone || '',
        loyaltyCardNo: data.loyaltyCardNo || '',
        isActive: data.isActive !== undefined ? data.isActive : true
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load customer profile.');
    } finally {
      this.isLoading.set(false);
    }
  }

  generateLoyaltyNo() {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.customer.update(c => ({ ...c, loyaltyCardNo: `LOY-${random}` }));
  }

  async saveCustomer() {
    const c = this.customer();
    if (!c.firstName || !c.firstName.trim()) {
      this.errorMessage.set('First Name is required.');
      return;
    }
    if (!c.lastName || !c.lastName.trim()) {
      this.errorMessage.set('Last Name is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const dto = {
      firstName: c.firstName.trim(),
      lastName: c.lastName.trim(),
      email: c.email ? c.email.trim() : null,
      phone: c.phone ? c.phone.trim() : null,
      loyaltyCardNo: c.loyaltyCardNo ? c.loyaltyCardNo.trim() : null,
      isActive: Boolean(c.isActive)
    };

    try {
      if (this.isEditMode()) {
        await this.customerService.updateCustomer(this.customerId()!, { ...dto, id: this.customerId()! });
      } else {
        await this.customerService.createCustomer(dto);
      }
      this.router.navigate(['/app/customers']);
    } catch (err: any) {
      console.error('Failed to save customer', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save customer.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/customers']);
  }
}
