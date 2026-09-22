import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TillService } from '../../../services/till.service';
import { TerminalService } from '../../../services/terminal.service';
import { StaffService } from '../../../services/staff.service';

@Component({
  selector: 'app-till-session-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './till-session-detail.html'
})
export class TillSessionDetailComponent implements OnInit {
  public sessionId = signal<string | null>(null);
  public session = signal<any | null>(null);
  public progress = signal<any | null>(null);
  public terminal = signal<any | null>(null);
  public staffMember = signal<any | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tillService: TillService,
    private terminalService: TerminalService,
    private staffService: StaffService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/app/till-sessions']);
      return;
    }
    this.sessionId.set(id);
    await this.loadSessionData(id);
  }

  async loadSessionData(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [sessionData, progressData, terminalsData, staffData] = await Promise.all([
        this.tillService.getTillSessionById(id),
        this.tillService.getTillSessionProgress(id).catch(() => null),
        this.terminalService.getTerminals().catch(() => ({ items: [] })),
        this.staffService.getStaff().catch(() => ({ items: [] }))
      ]);

      this.session.set(sessionData);
      this.progress.set(progressData);

      const termsList = terminalsData.items || terminalsData || [];
      const stList = staffData.items || staffData || [];

      if (sessionData.terminalId) {
        this.terminal.set(termsList.find((t: any) => t.id === sessionData.terminalId) || null);
      }
      if (sessionData.staffId) {
        this.staffMember.set(stList.find((s: any) => s.id === sessionData.staffId) || null);
      }
    } catch (err: any) {
      console.error('Failed to load till session details', err);
      this.errorMessage.set(err?.error?.message || 'Failed to load till session details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  isSessionOpen(): boolean {
    const status = this.session()?.status;
    return status === 'OPEN' || status === 'Open' || status === 0;
  }

  getStaffName(staffId?: string): string {
    const s = this.staffMember();
    if (s?.fullName) return s.fullName;
    if (s?.firstName || s?.lastName) return `${s.firstName || ''} ${s.lastName || ''}`.trim();
    if (this.session()?.staffName) return this.session().staffName;
    return 'Frontline Cashier';
  }

  printReport() {
    window.print();
  }
}
