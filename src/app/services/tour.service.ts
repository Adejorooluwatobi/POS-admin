import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface TourStep {
  number: number;
  id: string;
  badge: string;
  module: string;
  title: string;
  route: string;
  description: string;
  actionText?: string;
  isExternal?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  public isTourActive = signal<boolean>(false);
  public currentStepIndex = signal<number>(0);
  public isDockCollapsed = signal<boolean>(false);

  public readonly steps: TourStep[] = [
    {
      number: 1,
      id: 'dashboard',
      badge: 'OVERVIEW',
      module: 'Command Center',
      title: 'Executive Dashboard & Telemetry',
      route: '/app/dashboard',
      description: 'Real-time enterprise metrics, live cashier register statuses, sales velocity, and multi-store revenue intelligence.'
    },
    {
      number: 2,
      id: 'products',
      badge: 'CATALOG',
      module: 'Merchandise & Pricing',
      title: 'Products, Variants & SKUs',
      route: '/app/products',
      description: 'Manage master SKUs, barcode identifiers, pricing tiers (single/roll/pack), categories, and tax rates across all branches.'
    },
    {
      number: 3,
      id: 'inventory',
      badge: 'INVENTORY',
      module: 'Stock & Logistics',
      title: 'Multi-Store Inventory Matrix',
      route: '/app/inventory',
      description: 'Live quantity-on-hand tracking, inter-branch movement orders, stock requisitions, and automatic reorder thresholds.'
    },
    {
      number: 4,
      id: 'stores',
      badge: 'BRANCHES',
      module: 'Store Infrastructure',
      title: 'Stores & Branch Governance',
      route: '/app/stores',
      description: 'Configure branch stores, assign store managers, authorize licensed POS terminals, and enforce cash float limits.'
    },
    {
      number: 5,
      id: 'staff',
      badge: 'WORKFORCE',
      module: 'People & Access',
      title: 'Staff, Roles & Cashier PINs',
      route: '/app/staff',
      description: 'Role-based access control (RBAC), auto-generated temporary credentials, and 4-digit POS register PIN management.'
    },
    {
      number: 6,
      id: 'reports',
      badge: 'COMPLIANCE',
      module: 'Fiscal Intelligence',
      title: 'Analytics & Audit Compliance',
      route: '/app/reports',
      description: 'Non-resettable fiscal audit logs, shift reconciliation Z-reports, and statutory FIRS 7.5% VAT compliance.'
    },
    {
      number: 7,
      id: 'terminal',
      badge: 'POS REGISTER',
      module: 'Register Checkout',
      title: 'Frontline Cashier POS Terminal',
      route: 'pos-terminal-v2.html',
      description: 'Sub-20ms offline checkout engine, barcode scanner ingestion, split tender (Cash, Card, NFC), and digital thermal receipts.',
      actionText: 'Launch Cashier POS ↗',
      isExternal: true
    }
  ];

  public currentStep = computed(() => this.steps[this.currentStepIndex()]);
  public isFirstStep = computed(() => this.currentStepIndex() === 0);
  public isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  public progressPercent = computed(() => Math.round(((this.currentStepIndex() + 1) / this.steps.length) * 100));

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Check if URL has ?tour=true or if demo mode is active
    if (localStorage.getItem('retail_os_tour_active') === 'true') {
      this.isTourActive.set(true);
      const savedStep = parseInt(localStorage.getItem('retail_os_tour_step') || '0', 10);
      if (!isNaN(savedStep) && savedStep >= 0 && savedStep < this.steps.length) {
        this.currentStepIndex.set(savedStep);
      }
    }
  }

  startTour(initialStepIndex: number = 0) {
    // Ensure visitor is authenticated into guest sandbox if not logged in
    if (!this.authService.isLoggedIn()) {
      this.authService.setGuestSession();
    }

    this.isTourActive.set(true);
    this.isDockCollapsed.set(false);
    this.currentStepIndex.set(initialStepIndex);

    localStorage.setItem('retail_os_tour_active', 'true');
    localStorage.setItem('retail_os_tour_step', String(initialStepIndex));

    const step = this.steps[initialStepIndex];
    if (step && !step.isExternal) {
      this.router.navigate([step.route]);
    }
  }

  nextStep() {
    if (this.currentStepIndex() < this.steps.length - 1) {
      const nextIndex = this.currentStepIndex() + 1;
      this.goToStep(nextIndex);
    } else {
      // Completed last step: open POS terminal or finish
      this.openPosTerminal();
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.goToStep(this.currentStepIndex() - 1);
    }
  }

  goToStep(index: number) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex.set(index);
      localStorage.setItem('retail_os_tour_step', String(index));

      const step = this.steps[index];
      if (step.isExternal) {
        this.openPosTerminal();
      } else {
        this.router.navigate([step.route]);
      }
    }
  }

  openPosTerminal() {
    window.open('pos-terminal-v2.html', '_blank');
  }

  toggleDock() {
    this.isDockCollapsed.update(c => !c);
  }

  endTour() {
    this.isTourActive.set(false);
    localStorage.removeItem('retail_os_tour_active');
    localStorage.removeItem('retail_os_tour_step');
  }

  exitSandboxAndLogout() {
    this.endTour();
    this.authService.logout();
  }
}
