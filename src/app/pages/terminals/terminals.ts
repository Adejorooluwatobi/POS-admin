import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TerminalService } from '../../services/terminal.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Terminal, Store } from '../../models/pos.models';

@Component({
  selector: 'app-terminals',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule],
  templateUrl: './terminals.html'
})
export class TerminalsComponent implements OnInit {
  public terminals = signal<Terminal[]>([]);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);

  // Modal State
  public isModalOpen = signal<boolean>(false);
  public modalMode = signal<'create' | 'edit' | 'view'>('create');
  public selectedTerminal = signal<Partial<Terminal>>({
    terminalNo: '',
    name: '',
    ipAddress: '',
    status: 'ONLINE',
    storeId: ''
  });

  constructor(
    private terminalService: TerminalService,
    private storeService: StoreService,
    private authService: AuthService
  ) {
    this.isOwner.set(this.authService.currentUser()?.role === 'SUPER_ADMIN');
  }

  ngOnInit() {
    this.loadTerminals();
    this.loadStores();
  }

  async loadTerminals() {
    this.isLoading.set(true);
    try {
      const data = await this.terminalService.getTerminals();
      this.terminals.set(data.items || data);
    } catch (error) {
      console.error('Failed to load terminals', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (error) {
      console.error('Failed to load stores', error);
    }
  }

  openCreateModal() {
    this.modalMode.set('create');
    this.selectedTerminal.set({
      terminalNo: '',
      name: '',
      ipAddress: '',
      status: 'ONLINE',
      storeId: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(terminal: Terminal) {
    this.modalMode.set('edit');
    this.selectedTerminal.set({ ...terminal });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async saveTerminal() {
    const t = this.selectedTerminal();
    const user = this.authService.currentUser();
    const payload = {
      ...t,
      tenantId: user?.tenantId
    };

    try {
      if (this.modalMode() === 'create') {
        await this.terminalService.createTerminal(payload);
      } else if (this.modalMode() === 'edit' && t.id) {
        await this.terminalService.updateTerminal(t.id, payload);
      }
      this.closeModal();
      this.loadTerminals();
    } catch (error: any) {
      console.error('Failed to save terminal', error);
      alert(`Error saving terminal: ${error.error?.message || error.message || 'Unknown error'}`);
    }
  }

  getStoreName(storeId: string) {
    return this.stores().find(s => s.id === storeId)?.name || 'Unknown Store';
  }
}
