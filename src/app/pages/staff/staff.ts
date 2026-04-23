import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Staff } from '../../models/pos.models';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './staff.html'
})
export class StaffComponent {
  public staff = signal<Staff[]>([]);
  public isOwner = signal<boolean>(false);

  constructor(public dataService: DataService, public authService: AuthService) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'SUPER_ADMIN');
    this.staff.set(this.dataService.staff.filter(s =>
      this.isOwner() || s.store === user?.store
    ));
  }

  getStoreName(code: string) {
    return this.dataService.stores[code]?.name || '';
  }

  openAddStaff() { console.log('Open add staff'); }
}
