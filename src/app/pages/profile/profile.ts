import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StaffService } from '../../services/staff.service';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  public user = signal<any>(null);
  public isEditing = signal<boolean>(false);
  public isChangingPin = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);

  public profileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };

  public pinForm = {
    currentPin: '',
    newPin: '',
    confirmPin: ''
  };

  public statusMsg = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  constructor(
    private authService: AuthService,
    private staffService: StaffService,
    private storeService: StoreService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  async loadProfile() {
    this.isLoading.set(true);
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.isLoading.set(false);
      return;
    }

    try {
      let staff: any = null;
      try {
        staff = await this.staffService.getStaffById(currentUser.sub);
      } catch (err) {
        console.warn('Could not fetch staff record by sub ID, using token auth details', err);
      }

      const combined = { ...currentUser, ...(staff || {}) };

      const names = (combined.name || '').split(' ');
      this.profileForm.firstName = combined.firstName || names[0] || '';
      this.profileForm.lastName = combined.lastName || names.slice(1).join(' ') || '';
      this.profileForm.email = combined.email || '';
      this.profileForm.phone = combined.phone || '';

      if (combined.storeId) {
        try {
          const store = await this.storeService.getStoreById(combined.storeId);
          combined.storeName = store?.name || combined.storeId;
        } catch (e) {
          console.warn('Could not fetch assigned store name', e);
        }
      }

      this.user.set(combined);
    } catch (e) {
      console.error('Failed to load profile details', e);
      this.user.set(currentUser);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProfile() {
    this.isSaving.set(true);
    this.statusMsg.set(null);
    try {
      const u = this.user();
      if (u && u.sub) {
        await this.staffService.updateStaff(u.sub, {
          firstName: this.profileForm.firstName,
          lastName: this.profileForm.lastName,
          email: this.profileForm.email,
          phone: this.profileForm.phone
        });
      }

      this.user.update(current => ({
        ...current,
        name: `${this.profileForm.firstName} ${this.profileForm.lastName}`.trim(),
        email: this.profileForm.email,
        phone: this.profileForm.phone
      }));

      this.statusMsg.set({ text: 'Personal profile credentials updated successfully!', type: 'success' });
      this.isEditing.set(false);
    } catch (e: any) {
      this.statusMsg.set({ text: e?.error?.message || 'Failed to update profile credentials.', type: 'error' });
    } finally {
      this.isSaving.set(false);
    }
  }

  generateRandomPin() {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    this.pinForm.newPin = random;
    this.pinForm.confirmPin = random;
  }

  async changePin() {
    if (!this.pinForm.newPin || this.pinForm.newPin.length !== 4) {
      this.statusMsg.set({ text: 'New PIN must be exactly 4 digits.', type: 'error' });
      return;
    }

    if (this.pinForm.newPin !== this.pinForm.confirmPin) {
      this.statusMsg.set({ text: 'New PIN and confirmation PIN do not match.', type: 'error' });
      return;
    }

    this.isSaving.set(true);
    this.statusMsg.set(null);
    try {
      const u = this.user();
      if (u && u.sub) {
        await this.staffService.updateStaff(u.sub, {
          pin: this.pinForm.newPin
        });
      }

      this.statusMsg.set({ text: 'POS Terminal Quick PIN updated successfully!', type: 'success' });
      this.isChangingPin.set(false);
      this.pinForm = { currentPin: '', newPin: '', confirmPin: '' };
    } catch (e: any) {
      this.statusMsg.set({ text: e?.error?.message || 'Failed to update POS PIN.', type: 'error' });
    } finally {
      this.isSaving.set(false);
    }
  }
}
