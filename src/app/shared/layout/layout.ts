import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { TourDockComponent } from '../../components/tour-dock/tour-dock.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, TourDockComponent],
  templateUrl: './layout.html'
})
export class LayoutComponent {
  constructor(public authService: AuthService) {}
}
