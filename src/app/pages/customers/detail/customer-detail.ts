import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { LoyaltyService } from '../../../services/loyalty.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, NgClass, RouterModule],
  templateUrl: './customer-detail.html'
})
export class CustomerDetailComponent implements OnInit {
  public customer = signal<any>(null);
  public loyaltyLedger = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private loyaltyService: LoyaltyService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      await this.loadCustomerData(id);
    }
  }

  async loadCustomerData(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.customerService.getCustomerById(id);
      this.customer.set(data);

      try {
        const ledger = await this.loyaltyService.getCustomerLedger(id);
        this.loyaltyLedger.set(ledger || []);
      } catch (e) {
        // ledger may be empty
        this.loyaltyLedger.set([]);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load customer profile.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val || 0);
  }

  goBack() {
    this.router.navigate(['/app/customers']);
  }
}
