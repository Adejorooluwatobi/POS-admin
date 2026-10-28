import { Injectable, signal } from '@angular/core';
import { Account } from '../models/pos.models';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthResponseDto {
  token: string;
  role: string;
  tenantId: string | null;
  fullName: string;
  userId: string;
  email: string;
  storeId: string | null;
  businessName: string | null;
  mustChangePassword?: boolean;
  mustChangePin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<Account | null>(null);
  public currentUser = this.currentUserSignal.asReadonly();
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {
    // Attempt to hydrate from localStorage
    const savedUser = localStorage.getItem('retail_os_user');
    if (savedUser) {
      try {
        this.currentUserSignal.set(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user session', e);
      }
    }
  }

  async login(email: string, pass: string): Promise<string | null> {
    // Clear any existing session to avoid interceptor/stale data issues
    localStorage.removeItem('retail_os_token');
    localStorage.removeItem('retail_os_user');

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiUrl}/login-admin`, { 
          email: email.trim().toLowerCase(), 
          password: pass 
        })
      );

      const role = response.role;

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
        store: response.storeId,
        initials: response.fullName ? response.fullName.substring(0, 2).toUpperCase() : 'U',
        tenantId: response.tenantId,
        businessName: response.businessName,
        mustChangePassword: Boolean(response.mustChangePassword),
        mustChangePin: Boolean(response.mustChangePin)
      };

      this.currentUserSignal.set(acct);
      localStorage.setItem('retail_os_user', JSON.stringify(acct));
      localStorage.setItem('retail_os_token', response.token);
      return null;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          return 'Invalid email or password';
        }
        if (error.status === 403) {
          return 'Access forbidden. You may not have permission to access the admin portal.';
        }
        return error.error?.message || 'Login failed. Please try again later.';
      }
      return 'An unexpected error occurred';
    }
  }

  async changePassword(currentPassword: string, newPassword: string, newPin?: string): Promise<{ success: boolean; message: string }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/change-password`, {
        currentPassword,
        newPassword,
        newPin: newPin || null
      })
    );

    // Update locally stored user state to clear mustChange flags
    const current = this.currentUserSignal();
    if (current) {
      const updated: Account = {
        ...current,
        mustChangePassword: false,
        mustChangePin: false
      };
      this.currentUserSignal.set(updated);
      localStorage.setItem('retail_os_user', JSON.stringify(updated));
    }

    return res;
  }

  updateSessionCredentials(mustChangePassword: boolean = false, mustChangePin: boolean = false) {
    const current = this.currentUserSignal();
    if (current) {
      const updated: Account = {
        ...current,
        mustChangePassword,
        mustChangePin
      };
      this.currentUserSignal.set(updated);
      localStorage.setItem('retail_os_user', JSON.stringify(updated));
    }
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('retail_os_user');
    localStorage.removeItem('retail_os_token');
    localStorage.removeItem('retail_os_is_demo');
    localStorage.removeItem('retail_os_tour_active');
    localStorage.removeItem('retail_os_tour_step');
    this.router.navigate(['/login']);
  }

  setGuestSession() {
    const guestAcct: Account = {
      sub: 'demo-visitor-id',
      email: 'visitor@retailos.demo',
      pass: '',
      role: 'TENANT_ADMIN',
      name: 'Demo Visitor',
      store: 'demo-store-001',
      initials: 'DV',
      tenantId: 'demo-tenant-001',
      businessName: 'Sandbox Enterprise Store',
      mustChangePassword: false,
      mustChangePin: false
    };
    this.currentUserSignal.set(guestAcct);
    localStorage.setItem('retail_os_user', JSON.stringify(guestAcct));
    localStorage.setItem('retail_os_token', 'demo-sandbox-token');
    localStorage.setItem('retail_os_is_demo', 'true');
  }

  isDemoSession(): boolean {
    return localStorage.getItem('retail_os_is_demo') === 'true';
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  getSystemRole(): string {
    const user = this.currentUser();
    if (!user) return '';
    if (user.role === 'SUPER_ADMIN') return 'SuperAdmin';
    if (user.role === 'TENANT_ADMIN') return 'TenantAdmin';
    if (user.role === 'MANAGER') return 'Manager';
    if (user.role === 'STORE_MANAGER') return 'StoreManager';
    if (user.role === 'SUPERVISOR') return 'Supervisor';
    return 'Cashier';
  }

  isSuperAdmin(): boolean {
    return this.currentUser()?.role === 'SUPER_ADMIN';
  }

  isTenantAdmin(): boolean {
    return this.currentUser()?.role === 'TENANT_ADMIN';
  }

  getStoreId(): string | null {
    return this.currentUser()?.store || null;
  }
}
