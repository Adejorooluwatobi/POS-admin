import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { LivenessModal, LivenessResult } from '../../../components/liveness-modal/liveness-modal';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LivenessModal],
  templateUrl: './customer-form.html'
})
export class CustomerFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public customerId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public showLivenessModal = signal<boolean>(false);
  public stores = signal<any[]>([]);

  public customer = signal<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loyaltyCardNo: '',
    registeredStoreId: '',
    identityType: 'NIN',
    identityNumber: '',
    photoUrl: '',
    isIdentityVerified: false,
    isActive: true
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private storeService: StoreService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadStores();
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.customerId.set(id);
      await this.loadCustomer(id);
    } else {
      const userStoreId = this.authService.currentUser()?.store || '';
      if (userStoreId) {
        this.customer.update(c => ({ ...c, registeredStoreId: userStoreId }));
      }
      await this.generateLoyaltyNo();
    }
  }

  async loadStores() {
    try {
      const res = await this.storeService.getStores(1, 100);
      this.stores.set(res?.items || res || []);
    } catch (e) {
      console.warn('Failed to load stores for customer onboarding', e);
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
        registeredStoreId: data.registeredStoreId || '',
        identityType: data.identityType || 'NIN',
        identityNumber: data.maskedIdentityNumber || '',
        photoUrl: data.photoUrl || '',
        isIdentityVerified: data.isIdentityVerified || false,
        isActive: data.isActive !== undefined ? data.isActive : true
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load customer profile.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateLoyaltyNo() {
    try {
      const res = await this.customerService.generateLoyaltyNumber();
      if (res?.loyaltyCardNo) {
        this.customer.update(c => ({ ...c, loyaltyCardNo: res.loyaltyCardNo }));
      }
    } catch (err) {
      console.warn('Failed to generate loyalty number from backend', err);
    }
  }

  openCameraVerification() {
    this.showLivenessModal.set(true);
  }

  closeCameraVerification() {
    this.showLivenessModal.set(false);
  }

  onFaceVerified(result: LivenessResult) {
    this.customer.update(c => ({
      ...c,
      photoUrl: result.photoUrl,
      livenessAuditLog: result.auditLog,
      isIdentityVerified: true
    }));
    this.showLivenessModal.set(false);
  }

  handlePhotoUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.customer.update(c => ({
          ...c,
          photoUrl: reader.result as string,
          livenessAuditLog: 'ManualUpload',
          isIdentityVerified: true
        }));
      };
      reader.readAsDataURL(file);
    }
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
      registeredStoreId: c.registeredStoreId || null,
      isSelfRegistered: false,
      identityType: c.identityType || 'NIN',
      identityNumber: c.identityNumber && !c.identityNumber.includes('*') ? c.identityNumber.trim() : undefined,
      photoUrl: c.photoUrl || undefined,
      livenessVerified: !!c.photoUrl,
      livenessAuditLog: c.livenessAuditLog || undefined,
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
