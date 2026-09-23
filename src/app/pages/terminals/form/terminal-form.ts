import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TerminalService } from '../../../services/terminal.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { Store } from '../../../models/pos.models';

@Component({
  selector: 'app-terminal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './terminal-form.html'
})
export class TerminalFormComponent implements OnInit {
  public isEditMode = signal<boolean>(false);
  public terminalId = signal<string | null>(null);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public stores = signal<Store[]>([]);
  public isStoreManager = signal<boolean>(false);
  public assignedStoreId = signal<string | null>(null);

  // Terminal Form Model
  public terminal = signal({
    label: '',
    storeId: '',
    ipAddress: '',
    status: 'ONLINE',
    model: 'ApexStation Pro Max',
    zone: 'Main Floor',
    hasPrinter: true,
    hasCashDrawer: true,
    hasCardReader: true,
    hasScanner: true,
    hasCfd: true
  });

  // Pairing Code Success Card
  public showPairingSuccess = signal<boolean>(false);
  public generatedPairingCode = signal<string>('');
  public registeredTerminalName = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private terminalService: TerminalService,
    private storeService: StoreService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isStoreManager.set(user?.role === 'STORE_MANAGER');
    this.assignedStoreId.set(user?.store || null);
  }

  async ngOnInit() {
    await this.loadStores();

    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.terminalId.set(id);
      await this.loadTerminal(id);
    } else {
      // Default store assignment
      const defaultStore = this.isStoreManager() ? (this.assignedStoreId() || '') : (this.stores()[0]?.id || '');
      this.terminal.update(t => ({ ...t, storeId: defaultStore }));
    }
  }

  async loadStores() {
    try {
      const data = await this.storeService.getStores();
      this.stores.set(data.items || data);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  }

  async loadTerminal(id: string) {
    this.isLoading.set(true);
    try {
      const t = await this.terminalService.getTerminalById(id);
      this.terminal.set({
        label: t.name || t.label || '',
        storeId: t.storeId || '',
        ipAddress: t.ipAddress || '',
        status: t.status || 'ONLINE',
        model: t.model || 'ApexStation Pro Max',
        zone: t.zone || 'Main Floor',
        hasPrinter: true,
        hasCashDrawer: true,
        hasCardReader: true,
        hasScanner: true,
        hasCfd: true
      });
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Failed to load terminal details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveTerminal() {
    const t = this.terminal();
    if (!t.label || !t.label.trim()) {
      this.errorMessage.set('Terminal Label / Lane Name is required.');
      return;
    }
    if (!t.storeId) {
      this.errorMessage.set('Please select an assigned store branch.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      label: t.label.trim(),
      name: t.label.trim(),
      storeId: t.storeId,
      ipAddress: t.ipAddress.trim() || undefined,
      status: t.status
    };

    try {
      if (this.isEditMode() && this.terminalId()) {
        await this.terminalService.updateTerminal(this.terminalId()!, payload);
        this.router.navigate(['/app/terminals']);
      } else {
        const response = await this.terminalService.createTerminal(payload);
        if (response && response.pairingCode) {
          this.generatedPairingCode.set(response.pairingCode);
          this.registeredTerminalName.set(response.label || response.name || t.label);
          this.showPairingSuccess.set(true);
        } else {
          this.router.navigate(['/app/terminals']);
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || err?.message || 'Failed to save terminal.');
    } finally {
      this.isSaving.set(false);
    }
  }

  finishPairing() {
    this.router.navigate(['/app/terminals']);
  }
}
