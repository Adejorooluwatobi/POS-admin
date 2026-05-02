import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StaffService } from '../../services/staff.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  public user = signal<any>(null);
  public isEditing = signal(false);
  public isChangingPin = signal(false);
  
  public profileForm = {
    firstName: '',
    lastName: '',
    email: ''
  };

  public pinForm = {
    currentPin: '',
    newPin: '',
    confirmPin: ''
  };

  public statusMsg = signal<{text: string, type: 'success' | 'error'} | null>(null);

  constructor(
    private authService: AuthService,
    private staffService: StaffService
  ) {}

  ngOnInit() {
    const currentUser = this.authService.currentUser();
    this.user.set(currentUser);
    if (currentUser) {
      const names = currentUser.name.split(' ');
      this.profileForm.firstName = names[0] || '';
      this.profileForm.lastName = names.slice(1).join(' ') || '';
      this.profileForm.email = currentUser.email;
    }
  }

  async updateProfile() {
    this.statusMsg.set(null);
    try {
      // Logic to update profile via staff service
      // await this.staffService.updateStaff(this.user().sub, { ... });
      this.statusMsg.set({ text: 'Profile updated successfully!', type: 'success' });
      this.isEditing.set(false);
    } catch (e) {
      this.statusMsg.set({ text: 'Failed to update profile.', type: 'error' });
    }
  }

  async changePin() {
    if (this.pinForm.newPin !== this.pinForm.confirmPin) {
      this.statusMsg.set({ text: 'New PINs do not match.', type: 'error' });
      return;
    }

    this.statusMsg.set(null);
    try {
      // Verify current PIN and update to new PIN
      // await this.staffService.changePin(this.user().sub, this.pinForm.currentPin, this.pinForm.newPin);
      this.statusMsg.set({ text: 'PIN changed successfully!', type: 'success' });
      this.isChangingPin.set(false);
      this.pinForm = { currentPin: '', newPin: '', confirmPin: '' };
    } catch (e: any) {
      this.statusMsg.set({ text: e.error?.message || 'Failed to change PIN.', type: 'error' });
    }
  }
}
