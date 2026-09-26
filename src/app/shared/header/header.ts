import { Component, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ContextService } from '../../services/context.service';
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
    public contextService: ContextService,
    public themeService: ThemeService,
    private router: Router
  ) {
    this.startClock();
    
    // Automatically keep subtitle in sync with selected tenant/store context
    effect(() => {
      this.updateTitles();
    });
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

    if (this.contextService.isSuperAdmin()) {
      const tenant = this.contextService.selectedTenant();
      const store = this.contextService.selectedStore();
      if (tenant && store) {
        this.pageSubtitle.set(`${tenant.businessName} · ${store.name}`);
      } else if (tenant) {
        this.pageSubtitle.set(`${tenant.businessName} · All Stores`);
      } else {
        this.pageSubtitle.set('Global Network · All Tenants');
      }
    } else if (this.contextService.isTenantAdmin()) {
      const store = this.contextService.selectedStore();
      const bizName = user.businessName || 'Business';
      if (store) {
        this.pageSubtitle.set(`${bizName} · ${store.name}`);
      } else {
        this.pageSubtitle.set(`${bizName} · All Stores`);
      }
    } else {
      const storeName = this.contextService.selectedStoreName();
      this.pageSubtitle.set(`${storeName} · Store Operations`);
    }
  }

  getUserDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'User';
    if (user.name) return user.name;
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

  onTenantChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.contextService.switchTenant(value === 'all' ? null : value);
  }

  onStoreChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.contextService.switchStore(value === 'all' ? null : value);
  }

  onSearch(event: any) {
    const q = event.target.value;
    this.searchQuery.set(q);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
