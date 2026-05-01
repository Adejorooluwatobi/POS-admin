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
  public selectedLoginRole = signal<'owner' | 'manager'>('owner');
  public email = '';
  public password = '';
  public selectedStore = 'LG-01';
  public loginError = signal<string | null>(null);
  public isLoading = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  selectRole(role: 'owner' | 'manager') {
    this.selectedLoginRole.set(role);
  }

  async doLogin() {
    this.isLoading.set(true);
    this.loginError.set(null);
    try {
      const error = await this.authService.login(this.email, this.password, this.selectedLoginRole());
      if (error) {
        this.loginError.set(error);
      } else {
        this.router.navigate(['/app/dashboard']);
      }
    } catch (e) {
      this.loginError.set('An unexpected error occurred during login.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
