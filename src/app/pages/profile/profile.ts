import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  public isChangingPassword = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public isSavingPassword = signal<boolean>(false);

  // Password and PIN visibility state signals
  public showCurrentPassword = signal<boolean>(false);
  public showNewPassword = signal<boolean>(false);
  public showConfirmPassword = signal<boolean>(false);
  public showNewPin = signal<boolean>(false);
  public showConfirmPin = signal<boolean>(false);
  public showProfileCurrentPin = signal<boolean>(false);
  public showProfileNewPin = signal<boolean>(false);
  public showProfileConfirmPin = signal<boolean>(false);

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

  public passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    newPin: '',
    confirmPin: ''
  };

  public statusMsg = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  public passwordStatusMsg = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  public isMustChangePassword = computed(() => Boolean(this.user()?.mustChangePassword));
  public isMustChangePin = computed(() => Boolean(this.user()?.mustChangePin || this.user()?.role === 'CASHIER'));

  constructor(
    private authService: AuthService,
    private staffService: StaffService,
    private storeService: StoreService,
    private route: ActivatedRoute,
    private router: Router
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

      // If must change password, auto open password form
      if (combined.mustChangePassword) {
        this.isChangingPassword.set(true);
      }
    } catch (e) {
      console.error('Failed to load profile details', e);
      this.user.set(currentUser);
      if (currentUser.mustChangePassword) {
        this.isChangingPassword.set(true);
      }
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

  generatePasswordPin() {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    this.passwordForm.newPin = random;
    this.passwordForm.confirmPin = random;
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

  async changePassword() {
    if (!this.passwordForm.currentPassword) {
      this.passwordStatusMsg.set({ text: 'Please enter your current (temporary) password.', type: 'error' });
      return;
    }

    if (!this.passwordForm.newPassword || this.passwordForm.newPassword.length < 6) {
      this.passwordStatusMsg.set({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordStatusMsg.set({ text: 'New password and confirmation password do not match.', type: 'error' });
      return;
    }

    if (this.isMustChangePin()) {
      if (!this.passwordForm.newPin || this.passwordForm.newPin.length !== 4) {
        this.passwordStatusMsg.set({ text: 'As a Cashier, you must configure a 4-digit POS register PIN.', type: 'error' });
        return;
      }
      if (this.passwordForm.newPin !== this.passwordForm.confirmPin) {
        this.passwordStatusMsg.set({ text: 'New POS PIN and confirmation PIN do not match.', type: 'error' });
        return;
      }
    }

    this.isSavingPassword.set(true);
    this.passwordStatusMsg.set(null);

    try {
      const wasFirstTime = this.isMustChangePassword();
      const res = await this.authService.changePassword(
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword,
        this.isMustChangePin() ? this.passwordForm.newPin : undefined
      );

      this.user.update(curr => ({
        ...curr,
        mustChangePassword: false,
        mustChangePin: false
      }));

      this.passwordStatusMsg.set({
        text: res.message || 'Password updated successfully! Account credentials are now permanent.',
        type: 'success'
      });

      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        newPin: '',
        confirmPin: ''
      };
      this.isChangingPassword.set(false);

      if (wasFirstTime) {
        // Redirect to dashboard after brief pause
        setTimeout(() => {
          this.router.navigate(['/app/dashboard']);
        }, 1200);
      }
    } catch (e: any) {
      console.error('Password change error', e);
      this.passwordStatusMsg.set({
        text: e?.error?.message || 'Failed to change password. Please ensure your current password is correct.',
        type: 'error'
      });
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  proceedToDashboard() {
    this.router.navigate(['/app/dashboard']);
  }
}
