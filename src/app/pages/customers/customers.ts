import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Customer } from '../../models/pos.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './customers.html'
})
export class CustomersComponent {
  public customers = signal<Customer[]>([]);

  constructor(private dataService: DataService) {
    this.customers.set(this.dataService.customers);
  }

  openAddCustomer() { console.log('Open add customer'); }
}
