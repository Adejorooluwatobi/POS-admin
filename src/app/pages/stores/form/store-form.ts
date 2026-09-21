import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { TenantService } from '../../../services/tenant.service';

@Component({
  selector: 'app-store-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './store-form.html'
})
export class StoreFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public storeId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  // Form Model
  public store = signal<any>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    phone: '',
    timezone: 'Africa/Lagos',
    active: true
  });

  public tenants = signal<any[]>([]);
  public selectedTenantId = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    public authService: AuthService,
    private tenantService: TenantService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.storeId.set(id);
      await this.loadStore(id);
    }

    if (this.authService.isSuperAdmin()) {
      await this.loadTenants();
    }
  }

  async loadTenants() {
    try {
      const data = await this.tenantService.getTenants();
      this.tenants.set(data);
    } catch (e) {
      console.error('Failed to load tenants', e);
    }
  }

  async loadStore(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.storeService.getStoreById(id);
      this.store.set({
        ...data,
        active: data.isActive !== undefined ? data.isActive : data.active
      });
      if ((data as any).tenantId) {
        this.selectedTenantId.set((data as any).tenantId);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load store information.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveStore() {
    const s = this.store();
    if (!s.name || !s.name.trim()) {
      this.errorMessage.set('Store Name is required.');
      return;
    }
    if (!this.isEditMode() && (!s.code || !s.code.trim())) {
      this.errorMessage.set('Store Code is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...s,
      isActive: s.active,
      tenantId: this.authService.isSuperAdmin() ? this.selectedTenantId() : undefined
    };

    try {
      if (this.isEditMode()) {
        await this.storeService.updateStore(this.storeId()!, payload);
      } else {
        await this.storeService.createStore(payload);
      }
      this.router.navigate(['/app/stores']);
    } catch (err: any) {
      console.error('Save store failed', err);
      this.errorMessage.set(err?.error?.message || 'Failed to save store. Please check the fields and try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/app/stores']);
  }
}
