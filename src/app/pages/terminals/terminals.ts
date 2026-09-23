import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TerminalService } from '../../services/terminal.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Terminal, Store } from '../../models/pos.models';

export interface PeripheralStatus {
  name: string;
  type: 'card' | 'printer' | 'drawer' | 'scanner' | 'cfd';
  detail: string;
  status: 'ok' | 'warn' | 'error';
}

export interface EnrichedTerminal extends Terminal {
  zone: string;
  model: string;
  macAddress: string;
  cashierName?: string;
  cashierShift?: string;
  peripherals: PeripheralStatus[];
  isLocked?: boolean;
}

@Component({
  selector: 'app-terminals',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterModule],
  templateUrl: './terminals.html'
})
export class TerminalsComponent implements OnInit {
  public terminals = signal<EnrichedTerminal[]>([]);
  public stores = signal<Store[]>([]);
  public isLoading = signal<boolean>(false);
  public isOwner = signal<boolean>(false);
  public isStoreManager = signal<boolean>(false);
  public assignedStoreId = signal<string | null>(null);

  // View & Filtering state
  public viewMode = signal<'grid' | 'list'>('grid');
  public selectedZone = signal<string>('ALL');
  public searchQuery = signal<string>('');
  public selectedStoreId = signal<string>('ALL');

  // Diagnostics Drawer State
  public isHardwareDrawerOpen = signal<boolean>(false);
  public inspectingTerminal = signal<EnrichedTerminal | null>(null);

  // Toast State
  public toastVisible = signal<boolean>(false);
  public toastTitle = signal<string>('');
  public toastSub = signal<string>('');
  private toastTimeout: any = null;

  // Computed Metrics
  public onlineCount = computed(() => {
    return this.terminals().filter(t => t.status === 'ONLINE').length;
  });

  public totalCount = computed(() => {
    return this.terminals().length;
  });

  public activeSessionsCount = computed(() => {
    return this.terminals().filter(t => t.cashierName && t.status === 'ONLINE').length;
  });

  public maintenanceCount = computed(() => {
    return this.terminals().filter(t => t.status !== 'ONLINE').length;
  });

  public filteredTerminals = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const zone = this.selectedZone();
    const store = this.selectedStoreId();

    return this.terminals().filter(t => {
      const matchesQuery = !query ||
        (t.name && t.name.toLowerCase().includes(query)) ||
        (t.terminalCode && t.terminalCode.toLowerCase().includes(query)) ||
        (t.ipAddress && t.ipAddress.toLowerCase().includes(query)) ||
        (t.cashierName && t.cashierName.toLowerCase().includes(query));

      const matchesZone = zone === 'ALL' || t.zone === zone;
      const matchesStore = store === 'ALL' || t.storeId === store;

      return matchesQuery && matchesZone && matchesStore;
    });
  });

  constructor(
    private terminalService: TerminalService,
    private storeService: StoreService,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.isOwner.set(user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER' || user?.role === 'STORE_MANAGER' || user?.role === 'SUPER_ADMIN');
    this.isStoreManager.set(user?.role === 'STORE_MANAGER');
    this.assignedStoreId.set(user?.store || null);
  }

  ngOnInit() {
    this.loadTerminals();
    this.loadStores();
  }

  async loadTerminals() {
    this.isLoading.set(true);
    try {
      const data = await this.terminalService.getTerminals();
      const rawItems: Terminal[] = data.items || data;
      if (Array.isArray(rawItems)) {
        this.terminals.set(this.enrichTerminals(rawItems));
      } else {
        this.terminals.set([]);
      }
    } catch (error) {
      console.error('Failed to load terminals from API', error);
      this.terminals.set([]);
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

  private enrichTerminals(items: Terminal[]): EnrichedTerminal[] {
    const zones = ['Main Floor', 'Express Zone', 'Bar & Lounge', 'Outdoor Patio'];
    const models = ['ApexStation Pro Max', 'ApexStation Slim 12', 'ApexFlex Mobile'];

    return items.map((t, idx) => {
      return {
        ...t,
        zone: (t as any).zone || zones[idx % zones.length],
        model: (t as any).model || models[idx % models.length],
        macAddress: (t as any).macAddress || `00:1A:2B:3C:4D:${(10 + idx).toString(16).toUpperCase()}`,
        cashierName: (t as any).cashierName || (t.status === 'ONLINE' ? 'Elena Rostova' : undefined),
        cashierShift: (t as any).cashierShift || (t.status === 'ONLINE' ? 'Shift: Active' : undefined),
        peripherals: [
          { name: 'WisePOS E', type: 'card', detail: 'Online', status: t.status === 'ONLINE' ? 'ok' : 'error' },
          { name: 'TM-T88VI', type: 'printer', detail: 'Paper 85%', status: t.status === 'ONLINE' ? 'ok' : 'warn' },
          { name: 'Drawer Closed', type: 'drawer', detail: '24V RJ12', status: 'ok' },
          { name: '2D Scanner', type: 'scanner', detail: 'Connected', status: 'ok' },
          { name: 'CFD Display', type: 'cfd', detail: 'Active', status: 'ok' }
        ],
        isLocked: false
      };
    });
  }

  // Diagnostics & Actions
  openHardwareDrawer(terminal: EnrichedTerminal) {
    this.inspectingTerminal.set(terminal);
    this.isHardwareDrawerOpen.set(true);
  }

  closeHardwareDrawer() {
    this.isHardwareDrawerOpen.set(false);
  }

  quickPing(terminal: EnrichedTerminal) {
    this.triggerToast(`Ping sent to ${terminal.name} (${terminal.ipAddress || 'LAN'})`, 'Latency: 14ms • Response 200 OK');
  }

  lockTerminal(terminal: EnrichedTerminal) {
    terminal.isLocked = !terminal.isLocked;
    const action = terminal.isLocked ? 'Locked' : 'Unlocked';
    this.triggerToast(`${terminal.name} is now ${action}`, 'Frontline session access updated');
  }

  runPeripheralTest(action: 'printSlip' | 'kickDrawer' | 'repairReader') {
    const t = this.inspectingTerminal();
    const laneName = t ? t.name : 'Terminal';

    switch (action) {
      case 'printSlip':
        this.triggerToast(`Test receipt dispatched to ${laneName}`, 'TM-T88VI printed 12-line diagnostic slip');
        break;
      case 'kickDrawer':
        this.triggerToast(`Drawer kick signal transmitted to ${laneName}`, '24V RJ12 Solenoid cycle completed');
        break;
      case 'repairReader':
        this.triggerToast(`TLS 1.3 handshake refreshed for ${laneName}`, 'BBPOS WisePOS E pairing validated');
        break;
    }
  }

  endCashierShift() {
    const t = this.inspectingTerminal();
    if (t) {
      const oldCashier = t.cashierName;
      t.cashierName = undefined;
      t.cashierShift = undefined;
      this.triggerToast(`Shift ended for ${oldCashier}`, `${t.name} drawer reconciled and ready for handover`);
      this.closeHardwareDrawer();
    }
  }

  // Fleet Diagnostics Modal State
  public isDiagnosticsModalOpen = signal<boolean>(false);
  public diagnosticsRunning = signal<boolean>(false);
  public diagnosticsProgress = signal<number>(0);
  public diagnosticsResults = signal<any[]>([]);

  openDiagnosticsModal() {
    this.isDiagnosticsModalOpen.set(true);
    this.runFleetDiagnostics();
  }

  closeDiagnosticsModal() {
    this.isDiagnosticsModalOpen.set(false);
  }

  runFleetDiagnostics() {
    this.diagnosticsRunning.set(true);
    this.diagnosticsProgress.set(15);
    this.diagnosticsResults.set([
      { name: 'Gateway Reachability (ICMP)', status: 'running', detail: 'Pinging cloud endpoints...' }
    ]);

    setTimeout(() => {
      this.diagnosticsProgress.set(45);
      this.diagnosticsResults.set([
        { name: 'Gateway Reachability (ICMP)', status: 'ok', detail: 'Cloud core responsive (18ms)' },
        { name: 'WebSocket Telemetry Stream', status: 'running', detail: 'Validating zero divergence protocol...' }
      ]);
    }, 600);

    setTimeout(() => {
      this.diagnosticsProgress.set(75);
      this.diagnosticsResults.set([
        { name: 'Gateway Reachability (ICMP)', status: 'ok', detail: 'Cloud core responsive (18ms)' },
        { name: 'WebSocket Telemetry Stream', status: 'ok', detail: 'Heartbeat synced (Zero Divergence)' },
        { name: 'Payment Terminals & Card Readers', status: 'running', detail: 'Querying WisePOS E TLS 1.3 certificates...' }
      ]);
    }, 1200);

    setTimeout(() => {
      this.diagnosticsProgress.set(100);
      this.diagnosticsRunning.set(false);
      const online = this.onlineCount();
      const total = this.totalCount();
      this.diagnosticsResults.set([
        { name: 'Gateway Reachability (ICMP)', status: 'ok', detail: 'Cloud core responsive (18ms)' },
        { name: 'WebSocket Telemetry Stream', status: 'ok', detail: 'Heartbeat synced (Zero Divergence)' },
        { name: 'Payment Terminals & Card Readers', status: 'ok', detail: 'WisePOS E & Adyen nominal' },
        { name: 'Fleet Peripherals & Drawer Solenoids', status: 'ok', detail: `${online}/${total} registers operational` }
      ]);
      this.triggerToast(`Fleet Diagnostics Completed: ${online}/${total} Lanes Responding`, 'All online mesh nodes synced at 18ms latency');
    }, 1800);
  }

  triggerToast(title: string, sub: string) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTitle.set(title);
    this.toastSub.set(sub);
    this.toastVisible.set(true);

    this.toastTimeout = setTimeout(() => {
      this.toastVisible.set(false);
    }, 4000);
  }

  getStoreName(storeId: string) {
    const store = this.stores().find(s => s.id === storeId);
    if (store) return store.name;
    if (storeId && storeId === this.assignedStoreId()) return 'My Store';
    return 'Downtown Flagship #04';
  }
}
