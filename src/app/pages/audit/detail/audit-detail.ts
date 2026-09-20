import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './audit-detail.html'
})
export class AuditDetailComponent implements OnInit {
  public logId = signal<string | null>(null);
  public log = signal<any | null>(null);
  public parsedChanges = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auditService: AuditService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/audit']);
      return;
    }
    this.logId.set(id);
    await this.loadAuditLog(id);
  }

  async loadAuditLog(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.auditService.getAuditLogById(id);
      this.log.set(data);

      if (data.changes) {
        if (typeof data.changes === 'string') {
          try {
            this.parsedChanges.set(JSON.parse(data.changes));
          } catch {
            this.parsedChanges.set(data.changes);
          }
        } else {
          this.parsedChanges.set(data.changes);
        }
      }
    } catch (err: any) {
      console.error('Failed to load audit log', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load audit entry details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  isUpdateAction(): boolean {
    const action = String(this.log()?.action || '');
    return action.toUpperCase().includes('UPDATE') || action === '1';
  }

  formatValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  getActionClass(): string {
    const action = String(this.log()?.action || '').toUpperCase();
    if (action.includes('DELETE') || action.includes('VOID')) return 'badge-danger';
    if (action.includes('UPDATE')) return 'badge-warning';
    if (action.includes('INSERT') || action.includes('CREATE')) return 'badge-success';
    return 'badge-info';
  }
}
