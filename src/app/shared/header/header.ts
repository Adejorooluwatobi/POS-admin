import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html'
})
export class HeaderComponent implements OnDestroy {
  public currentTime = signal<string>('');
  public pageTitle = signal<string>('Dashboard');
  public pageSubtitle = signal<string>('');
  private timer: any;

  constructor(
    public authService: AuthService,
    public dataService: DataService,
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
    // This could be improved by listening to router events
    const user = this.authService.currentUser();
    if (!user) return;

    if (user.role === 'SUPER_ADMIN') {
      this.pageSubtitle.set('All Stores · Super Admin');
    } else {
      const storeName = this.dataService.stores[user.store!]?.name || '';
      this.pageSubtitle.set(`${storeName} · Store Manager`);
    }
  }

  switchStore(v: string) {
    // Placeholder for store switching logic
    console.log('Switching to store:', v);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
