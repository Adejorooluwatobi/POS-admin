import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  public email = '';
  public password = '';
  public showPassword = signal<boolean>(false);
  public rememberMe = signal<boolean>(true);
  public loginError = signal<string | null>(null);
  public isLoading = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  quickFill(role: 'admin' | 'manager' | 'cashier') {
    if (role === 'admin') {
      this.email = 'owner@retailos.ng';
      this.password = 'owner123';
    } else if (role === 'manager') {
      this.email = 'vi@retailos.ng';
      this.password = 'store123';
    } else if (role === 'cashier') {
      this.email = 'cashier@retailos.ng';
      this.password = 'pin123';
    }
    this.loginError.set(null);
  }

  async doLogin() {
    if (!this.email || !this.password) {
      this.loginError.set('Please enter both your work email and password.');
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);
    try {
      const error = await this.authService.login(this.email, this.password);
      if (error) {
        this.loginError.set(error);
      } else {
        this.router.navigate(['/app/dashboard']);
      }
    } catch (e) {
      this.loginError.set('An unexpected error occurred during authentication.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
