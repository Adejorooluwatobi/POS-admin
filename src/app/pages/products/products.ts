import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/pos.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './products.html'
})
export class ProductsComponent {
  public products = signal<Product[]>([]);
  public isOwner = signal<boolean>(false);

  constructor(private dataService: DataService, public authService: AuthService) {
    this.products.set(this.dataService.products);
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
  }

  openAddProduct() { console.log('Open add product modal'); }
}
