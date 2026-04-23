import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html'
})
export class SettingsComponent {
  public store = signal<Store | null>(null);
  public isOwner = signal<boolean>(false);

  constructor(private authService: AuthService, private dataService: DataService) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');
    if (user?.store) {
      this.store.set(this.dataService.stores[user.store]);
    }
  }

  saveChanges() {
    console.log('Save settings');
  }
}
