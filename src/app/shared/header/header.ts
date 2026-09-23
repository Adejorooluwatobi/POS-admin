import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html'
})
export class HeaderComponent implements OnDestroy {
  public currentTime = signal<string>('');
  public pageTitle = signal<string>('Dashboard');
  public pageSubtitle = signal<string>('');
  public searchQuery = signal<string>('');
  private timer: any;

  constructor(
    public authService: AuthService,
    public dataService: DataService,
    public themeService: ThemeService,
    private router: Router
  ) {
    this.startClock();
    this.updateTitles();
  }

  startClock() {
    const tick = () => {
      this.currentTime.set(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }

  updateTitles() {
    const user = this.authService.currentUser();
    if (!user) return;

    if (user.role === 'SUPER_ADMIN') {
      this.pageSubtitle.set('All Stores · Super Admin');
    } else {
      const storeName = this.dataService.stores[user.store!]?.name || '';
      this.pageSubtitle.set(`${storeName} · Store Manager`);
    }
  }

  getUserDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'User';
    if (user.email) {
      const namePart = user.email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return user.role ? user.role.replace('_', ' ') : 'Staff';
  }

  getUserRoleLabel(): string {
    const role = this.authService.currentUser()?.role;
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin Lead';
      case 'TENANT_ADMIN': return 'Tenant Admin';
      case 'STORE_MANAGER':
      case 'MANAGER': return 'Store Operations Lead';
      case 'SUPERVISOR': return 'Shift Supervisor';
      default: return 'Store Associate';
    }
  }

  getUserInitials(): string {
    const name = this.getUserDisplayName();
    return name.slice(0, 2).toUpperCase();
  }

  switchStore(v: string) {
    console.log('Switching to store:', v);
  }

  onSearch(event: any) {
    const q = event.target.value;
    this.searchQuery.set(q);
    // Future expansion: navigate or filter based on query
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
