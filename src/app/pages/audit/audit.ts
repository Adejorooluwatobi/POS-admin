import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './audit.html'
})
export class AuditComponent implements OnInit {
  public logs = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public searchTerm = signal<string>('');
  public filterAction = signal<string>('ALL');

  public totalEvents = computed(() => this.logs().length);
  public criticalActions = computed(() => this.logs().filter(l => {
    const act = (l.action || '').toUpperCase();
    return act.includes('DELETE') || act.includes('VOID') || act.includes('DEACTIVATE') || act.includes('SUSPEND');
  }).length);
  public mutationActions = computed(() => this.logs().filter(l => {
    const act = (l.action || '').toUpperCase();
    return act.includes('UPDATE') || act.includes('ADJUST') || act.includes('PATCH');
  }).length);
  public creationActions = computed(() => this.logs().filter(l => {
    const act = (l.action || '').toUpperCase();
    return act.includes('CREATE') || act.includes('INSERT') || act.includes('OPEN') || act.includes('ADD');
  }).length);

  public filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const actionF = this.filterAction();
    const allLogs = this.logs();

    return allLogs.filter(l => {
      const act = (l.action || '').toUpperCase();
      let matchesFilter = true;
      if (actionF === 'CREATE') {
        matchesFilter = act.includes('CREATE') || act.includes('INSERT') || act.includes('OPEN') || act.includes('ADD');
      } else if (actionF === 'UPDATE') {
        matchesFilter = act.includes('UPDATE') || act.includes('ADJUST') || act.includes('PATCH');
      } else if (actionF === 'CRITICAL') {
        matchesFilter = act.includes('DELETE') || act.includes('VOID') || act.includes('DEACTIVATE') || act.includes('SUSPEND');
      }

      if (!matchesFilter) return false;

      if (!term) return true;

      return (
        (l.staff && l.staff.toLowerCase().includes(term)) || 
        (l.entity && l.entity.toLowerCase().includes(term)) || 
        (l.action && l.action.toLowerCase().includes(term)) ||
        (l.terminal && l.terminal.toLowerCase().includes(term)) ||
        (l.store && l.store.toLowerCase().includes(term)) ||
        (l.ip && l.ip.toLowerCase().includes(term))
      );
    });
  });

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
      const data = await this.auditService.getAuditLogs(user.tenantId, 1, 100);
      const items = data.items || data;
      const rawList = Array.isArray(items) ? items : [];
      this.logs.set(rawList.map((l: any) => ({
        id: l.id,
        ts: new Date(l.createdAt).toLocaleString(),
        staff: l.staffName || 'System Service',
        action: l.action || 'Unknown',
        entity: l.entityType || 'Record',
        store: l.storeName || 'Global HQ',
        ip: l.ipAddress || '127.0.0.1',
        terminal: l.terminalName || 'Web Portal',
        path: l.requestPath || '—'
      })));
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setActionFilter(filter: string) {
    this.filterAction.set(filter);
  }
}
