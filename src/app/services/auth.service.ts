import { Injectable, signal } from '@angular/core';
import { Account } from '../models/pos.models';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface AuthResponseDto {
  token: string;
  role: string;
  tenantId: string | null;
  fullName: string;
  userId: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<Account | null>(null);
  public currentUser = this.currentUserSignal.asReadonly();
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/auth';

  constructor(private http: HttpClient, private router: Router) {
    // Attempt to hydrate from localStorage
    const savedUser = localStorage.getItem('retail_os_user');
    if (savedUser) {
      this.currentUserSignal.set(JSON.parse(savedUser));
    }
  }

  async login(email: string, pass: string, selectedRole: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiUrl}/login-admin`, { email, password: pass })
      );

      const role = response.role;

      if (selectedRole === 'manager' && role === 'SuperAdmin') {
        return 'Use Super Admin role for this account';
      }
      if (selectedRole === 'owner' && role === 'StoreManager') {
        return 'Use Store Manager role for this account';
      }

      let mappedRole: any = 'CASHIER';
      if (role === 'SuperAdmin') mappedRole = 'SUPER_ADMIN';
      else if (role === 'TenantAdmin') mappedRole = 'TENANT_ADMIN';
      else if (role === 'StoreManager') mappedRole = 'STORE_MANAGER';
      else if (role === 'Manager') mappedRole = 'MANAGER';
      else if (role === 'Supervisor') mappedRole = 'SUPERVISOR';

      const acct: Account = {
        sub: response.userId,
        email: response.email,
        pass: '',
        role: mappedRole,
        name: response.fullName,
        store: null,
        initials: response.fullName ? response.fullName.substring(0, 2).toUpperCase() : 'U',
        tenantId: response.tenantId
      };

      this.currentUserSignal.set(acct);
      localStorage.setItem('retail_os_user', JSON.stringify(acct));
      localStorage.setItem('retail_os_token', response.token);
      return null;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          return 'Invalid email or password';
        }
        return error.error?.message || 'Login failed. Please try again later.';
      }
      return 'An unexpected error occurred';
    }
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('retail_os_user');
    localStorage.removeItem('retail_os_token');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
