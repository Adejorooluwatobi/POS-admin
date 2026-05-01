import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './audit.html'
})
export class AuditComponent implements OnInit {
  public logs = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  constructor(
    private auditService: AuditService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadLogs();
  }

  async loadLogs() {
    const user = this.authService.currentUser();
    if (!user?.tenantId) return;

    this.isLoading.set(true);
    try {
      const data = await this.auditService.getAuditLogs(user.tenantId);
      const items = data.items || data;
      this.logs.set(items.map((l: any) => ({
        ts: new Date(l.createdAt).toLocaleString(),
        staff: l.staffName || 'System',
        action: l.action,
        entity: l.entityType,
        store: l.storeName || 'Global'
      })));
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
