import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TillService } from '../../services/till.service';
import { TerminalService } from '../../services/terminal.service';
import { StaffService } from '../../services/staff.service';
import { TillSession, Terminal, Staff } from '../../models/pos.models';

@Component({
  selector: 'app-till-sessions',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './till-sessions.html'
})
export class TillSessionsComponent implements OnInit {
  public sessions = signal<TillSession[]>([]);
  public terminals = signal<Terminal[]>([]);
  public staff = signal<Staff[]>([]);
  public isLoading = signal<boolean>(false);

  constructor(
    private tillService: TillService,
    private terminalService: TerminalService,
    private staffService: StaffService
  ) {}

  ngOnInit() {
    this.loadSessions();
    this.loadTerminals();
    this.loadStaff();
  }

  async loadSessions() {
    this.isLoading.set(true);
    try {
      const data = await this.tillService.getTillSessions();
      this.sessions.set(data.items || data);
    } catch (error) {
      console.error('Failed to load till sessions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadTerminals() {
    try {
      const data = await this.terminalService.getTerminals();
      this.terminals.set(data.items || data);
    } catch (error) {
      console.error('Failed to load terminals', error);
    }
  }

  async loadStaff() {
    try {
      const data = await this.staffService.getStaff();
      this.staff.set(data.items || data);
    } catch (error) {
      console.error('Failed to load staff', error);
    }
  }

  getTerminalName(terminalId: string) {
    return this.terminals().find(t => t.id === terminalId)?.name || 'Unknown Terminal';
  }

  getStaffName(staffId: string) {
    const s = this.staff().find(st => st.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : 'Unknown Staff';
  }
}
