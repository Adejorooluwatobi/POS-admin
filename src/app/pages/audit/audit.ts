import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './audit.html'
})
export class AuditComponent implements OnInit {
  public logs = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  public searchTerm = signal<string>('');
  public filterAction = signal<string>('');

  public filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const action = this.filterAction();
    const allLogs = this.logs();

    return allLogs.filter(l => {
      const matchesSearch = !term || 
        l.staff.toLowerCase().includes(term) || 
        l.entity.toLowerCase().includes(term) || 
        l.action.toLowerCase().includes(term) ||
        l.terminal.toLowerCase().includes(term) ||
        l.ip.toLowerCase().includes(term);
      
      const matchesAction = !action || l.action.toUpperCase().includes(action.toUpperCase());

      return matchesSearch && matchesAction;
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
      const data = await this.auditService.getAuditLogs(user.tenantId);
      const items = data.items || data;
      this.logs.set(items.map((l: any) => ({
        id: l.id,
        ts: new Date(l.createdAt).toLocaleString(),
        staff: l.staffName || 'System',
        action: l.action,
        entity: l.entityType,
        store: l.storeName || 'Global',
        ip: l.ipAddress || '—',
        terminal: l.terminalName || 'Portal',
        path: l.requestPath || '—'
      })));
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
