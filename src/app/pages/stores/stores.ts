import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Store } from '../../models/pos.models';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './stores.html'
})
export class StoresComponent {
  public stores = signal<(Store & { code: string })[]>([]);
  public isOwner = signal<boolean>(false);

  constructor(private dataService: DataService, private authService: AuthService) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
    if (this.isOwner()) {
      this.stores.set(Object.entries(this.dataService.stores).map(([code, data]) => ({ code, ...data })));
    }
  }

  getManagerName(storeCode: string): string {
    const manager = this.dataService.staff.find(s => s.store === storeCode && s.role === 'MANAGER');
    return manager ? manager.n : 'None Assigned';
  }

  openAddStore() { console.log('Open add store'); }
}
