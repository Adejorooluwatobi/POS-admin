import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StaffService } from '../../../services/staff.service';
import { StoreService } from '../../../services/store.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-detail.html'
})
export class StaffDetailComponent implements OnInit {
  public staffId = signal<string | null>(null);
  public staff = signal<any | null>(null);
  public store = signal<any | null>(null);
  public role = signal<any | null>(null);
  public stats = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private staffService: StaffService,
    private storeService: StoreService,
    private roleService: RoleService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/staff']);
      return;
    }
    this.staffId.set(id);
    await this.loadStaffData(id);
  }

  async loadStaffData(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [s, storesData, rolesData, statsData] = await Promise.all([
        this.staffService.getStaffById(id),
        this.storeService.getStores().catch(() => ({ items: [] })),
        this.roleService.getRoles().catch(() => ({ items: [] })),
        this.staffService.getStaffStats(id).catch(() => null)
      ]);

      this.staff.set(s);
      this.stats.set(statsData);

      const storesList = storesData.items || storesData || [];
      if (s.storeId) {
        this.store.set(storesList.find((st: any) => st.id === s.storeId) || null);
      }

      const rolesList = rolesData.items || rolesData || [];
      if (s.roleId) {
        this.role.set(rolesList.find((r: any) => r.id === s.roleId) || null);
      }
    } catch (err: any) {
      console.error('Failed to load staff detail', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load staff details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getSystemRoleName(systemRole: number | undefined): string {
    switch (systemRole) {
      case 0: return 'System Admin';
      case 1: return 'Manager';
      case 2: return 'Store Manager';
      case 3: return 'Cashier';
      case 4: return 'Supervisor';
      case 5: return 'Tenant Admin';
      default: return 'Staff';
    }
  }
}
