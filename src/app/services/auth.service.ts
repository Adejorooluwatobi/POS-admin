import { Injectable, signal } from '@angular/core';
import { Account } from '../models/pos.models';
import { DataService } from './data.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<Account | null>(null);
  public currentUser = this.currentUserSignal.asReadonly();

  constructor(private dataService: DataService, private router: Router) {
    // Attempt to hydrate from localStorage
    const saved = localStorage.getItem('retail_os_user');
    if (saved) {
      this.currentUserSignal.set(JSON.parse(saved));
    }
  }

  login(email: string, pass: string, selectedRole: string): string | null {
    const acct = this.dataService.accounts[email.toLowerCase()];
    
    if (!acct || acct.pass !== pass) {
      return 'Invalid email or password';
    }

    if (selectedRole === 'manager' && acct.role === 'SUPER_ADMIN') {
      return 'Use Super Admin role for this account';
    }
    if (selectedRole === 'owner' && acct.role === 'STORE_MANAGER') {
      return 'Use Store Manager role for this account';
    }

    this.currentUserSignal.set(acct);
    localStorage.setItem('retail_os_user', JSON.stringify(acct));
    return null;
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('retail_os_user');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
