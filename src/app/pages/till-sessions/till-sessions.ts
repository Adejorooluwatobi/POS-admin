import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TillService } from '../../services/till.service';
import { TerminalService } from '../../services/terminal.service';
import { StaffService } from '../../services/staff.service';
import { TillSession, Terminal, Staff } from '../../models/pos.models';

@Component({
  selector: 'app-till-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, DatePipe],
  templateUrl: './till-sessions.html'
})
export class TillSessionsComponent implements OnInit {
  public sessions = signal<TillSession[]>([]);
  public terminals = signal<Terminal[]>([]);
  public staff = signal<Staff[]>([]);
  public isLoading = signal<boolean>(false);

  // Filters & Search
  public searchTerm = signal<string>('');
  public filterStatus = signal<'ALL' | 'OPEN' | 'CLOSED' | 'DISCREPANCY'>('ALL');

  // Quick Slide-out Drawer State
  public inspectingSession = signal<TillSession | null>(null);

  // Computed Forensic KPIs
  public activeShiftsCount = computed(() => {
    return this.sessions().filter(s => this.isOpen(s)).length;
  });

  public totalFloatInDrawers = computed(() => {
    return this.sessions()
      .filter(s => this.isOpen(s))
      .reduce((sum, s) => sum + (s.openingFloat || s.openBalance || 0), 0);
  });

  public discrepancyCount = computed(() => {
    return this.sessions().filter(s => (s.variance || 0) !== 0).length;
  });

  public netDiscrepancy = computed(() => {
    return this.sessions().reduce((sum, s) => sum + (s.variance || 0), 0);
  });

  // Filtered Sessions Stream
  public filteredSessions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.filterStatus();
    let list = this.sessions();

    if (status === 'OPEN') {
      list = list.filter(s => this.isOpen(s));
    } else if (status === 'CLOSED') {
      list = list.filter(s => !this.isOpen(s));
    } else if (status === 'DISCREPANCY') {
      list = list.filter(s => (s.variance || 0) !== 0);
    }

    if (!term) return list;

    return list.filter(s => {
      const termName = this.getTerminalName(s.terminalId).toLowerCase();
      const staffName = this.getStaffName(s.staffId).toLowerCase();
      const idMatch = (s.id || '').toLowerCase().includes(term);
      return termName.includes(term) || staffName.includes(term) || idMatch;
    });
  });

  constructor(
    private tillService: TillService,
    private terminalService: TerminalService,
    private staffService: StaffService
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  async loadAll() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadSessions(),
        this.loadTerminals(),
        this.loadStaff()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSessions() {
    try {
      const data = await this.tillService.getTillSessions(1, 100);
      const items = data.items || data || [];
      this.sessions.set(items);
    } catch (error) {
      console.error('Failed to load till sessions', error);
      this.sessions.set([]);
    }
  }

  async loadTerminals() {
    try {
      const data = await this.terminalService.getTerminals(1, 100);
      this.terminals.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load terminals', error);
    }
  }

  async loadStaff() {
    try {
      const data = await this.staffService.getStaff(1, 100);
      this.staff.set(data.items || data || []);
    } catch (error) {
      console.error('Failed to load staff', error);
    }
  }

  isOpen(s: TillSession): boolean {
    const st = (s.status || '').toUpperCase();
    return st === 'OPEN';
  }

  getTerminalName(terminalId: string): string {
    const t = this.terminals().find(term => term.id === terminalId);
    return t ? t.name : (terminalId ? `Terminal #${terminalId.substring(0, 8)}` : 'Main Counter');
  }

  getTerminalCode(terminalId: string): string {
    const t = this.terminals().find(term => term.id === terminalId);
    return t ? t.terminalCode : 'POS-01';
  }

  getStaffName(staffId: string): string {
    const s = this.staff().find(st => st.id === staffId);
    if (!s) return 'Frontline Cashier';
    if (s.firstName || s.lastName) {
      return `${s.firstName || ''} ${s.lastName || ''}`.trim();
    }
    return s.n || 'Frontline Cashier';
  }

  getStaffRole(staffId: string): string {
    const s = this.staff().find(st => st.id === staffId);
    return s?.role || 'Cashier';
  }

  inspect(session: TillSession) {
    this.inspectingSession.set(session);
  }

  closeDrawer() {
    this.inspectingSession.set(null);
  }
}
