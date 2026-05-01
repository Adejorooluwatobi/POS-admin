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
    name: '',
    ipAddress: '',
    status: 'ONLINE',
    storeId: ''
  });

  // Pairing Modal State
  public showPairingCode = signal<boolean>(false);
  public latestPairingCode = signal<string>('');
  public latestTerminalName = signal<string>('');

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
      name: '',
      ipAddress: '',
      status: 'ONLINE',
      storeId: ''
    });
    this.isModalOpen.set(true);
  }

  openViewModal(terminal: Terminal) {
    this.modalMode.set('view');
    this.selectedTerminal.set({ ...terminal });
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
  
  closePairingModal() {
    this.showPairingCode.set(false);
  }

  async saveTerminal() {
    const t = this.selectedTerminal();
    const payload = {
      label: t.name,
      ipAddress: t.ipAddress,
      status: t.status,
      storeId: t.storeId
    };

    try {
      if (this.modalMode() === 'create') {
        const response = await this.terminalService.createTerminal(payload);
        
        // Show the pairing code to the admin
        if (response && response.pairingCode) {
          this.latestPairingCode.set(response.pairingCode);
          this.latestTerminalName.set(response.label || 'New Terminal');
          this.showPairingCode.set(true);
        }
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
