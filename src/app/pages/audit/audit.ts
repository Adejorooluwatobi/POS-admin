import { Component, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './audit.html'
})
export class AuditComponent {
  public logs = signal([
    { ts: 'Jun 1 08:12', staff: 'Gold (EMP-001)', action: 'OPEN_TILL', entity: 'TillSession', store: 'LG-01' },
    { ts: 'Jun 1 10:11', staff: 'Sola (EMP-002)', action: 'VOID_TRANSACTION', entity: 'LG01-006', store: 'LG-01' },
    { ts: 'Jun 1 11:30', staff: 'Gold (EMP-001)', action: 'APPLY_MANUAL_DISCOUNT', entity: 'LG01-010', store: 'LG-01' },
    { ts: 'Jun 1 12:00', staff: 'Gold (EMP-001)', action: 'ADJUST_STOCK', entity: 'DAI-001', store: 'LG-01' },
    { ts: 'Jun 1 14:22', staff: 'Temi (EMP-004)', action: 'DEACTIVATE_STAFF', entity: 'EMP-006', store: 'LG-01' },
  ]);
}
