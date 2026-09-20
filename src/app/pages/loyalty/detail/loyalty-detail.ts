import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LoyaltyService } from '../../../services/loyalty.service';

@Component({
  selector: 'app-loyalty-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './loyalty-detail.html'
})
export class LoyaltyDetailComponent implements OnInit {
  public entryId = signal<string | null>(null);
  public entry = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loyaltyService: LoyaltyService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/loyalty']);
      return;
    }
    this.entryId.set(id);
    await this.loadEntry(id);
  }

  async loadEntry(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.loyaltyService.getLoyaltyEntryById(id);
      this.entry.set(data);
    } catch (err: any) {
      console.error('Failed to load loyalty ledger entry', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load loyalty entry details.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
