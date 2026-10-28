import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TourService } from '../../services/tour.service';

@Component({
  selector: 'app-tour-dock',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (tourService.isTourActive()) {
      <aside class="tour-dock-container" [class.collapsed]="tourService.isDockCollapsed()" role="region" aria-label="Interactive Product Tour">
        
        <!-- COLLAPSED PILL STATE -->
        @if (tourService.isDockCollapsed()) {
          <div class="tour-pill" (click)="tourService.toggleDock()">
            <div class="pulse-indicator"></div>
            <span class="pill-label">🚀 Tour: Step {{ tourService.currentStep().number }} of {{ tourService.steps.length }}</span>
            <span class="pill-title">{{ tourService.currentStep().title }}</span>
            <button type="button" class="btn-icon-sm" title="Expand Tour Dock" (click)="$event.stopPropagation(); tourService.toggleDock()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
          </div>
        } @else {
          <!-- FULL FLOATING EXPANDED DOCK -->
          <div class="tour-card">
            
            <!-- Top Bar: Badge, Progress, & Control Buttons -->
            <div class="tour-header">
              <div class="tour-header-left">
                <span class="tour-live-tag">
                  <span class="pulse-dot"></span>
                  DEMO SANDBOX TOUR
                </span>
                <span class="tour-step-counter">STEP {{ tourService.currentStep().number }} OF {{ tourService.steps.length }}</span>
                <span class="tour-badge">{{ tourService.currentStep().badge }}</span>
              </div>

              <div class="tour-header-right">
                <!-- Jump straight to POS terminal button -->
                <button type="button" (click)="tourService.openPosTerminal()" class="btn-tour-pos" title="Launch POS Terminal in demo sandbox mode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <span>Open POS Register ↗</span>
                </button>

                <!-- Minimize Button -->
                <button type="button" (click)="tourService.toggleDock()" class="tour-action-btn" title="Minimize Dock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>

                <!-- Exit Tour Button -->
                <button type="button" (click)="tourService.endTour()" class="tour-action-btn tour-exit-btn" title="Close Product Tour">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <!-- Middle: Title & Descriptive Summary -->
            <div class="tour-content">
              <div class="tour-title-row">
                <h3 class="tour-title">{{ tourService.currentStep().title }}</h3>
                <span class="tour-module-name">{{ tourService.currentStep().module }}</span>
              </div>
              <p class="tour-description">{{ tourService.currentStep().description }}</p>
            </div>

            <!-- Bottom: Interactive Step Dots & Navigation Buttons -->
            <div class="tour-footer">
              <!-- Clickable Step Navigation Dots -->
              <div class="tour-dots">
                @for (step of tourService.steps; track step.id; let idx = $index) {
                  <button type="button"
                          class="tour-dot"
                          [class.active]="idx === tourService.currentStepIndex()"
                          [class.completed]="idx < tourService.currentStepIndex()"
                          [title]="'Go to Step ' + (idx + 1) + ': ' + step.title"
                          (click)="tourService.goToStep(idx)">
                    <span class="dot-inner"></span>
                  </button>
                }
              </div>

              <!-- Previous / Next Action Buttons -->
              <div class="tour-nav-btns">
                <button type="button"
                        (click)="tourService.prevStep()"
                        [disabled]="tourService.isFirstStep()"
                        class="btn-tour-nav btn-tour-prev">
                  ← Back
                </button>

                @if (!tourService.isLastStep()) {
                  <button type="button"
                          (click)="tourService.nextStep()"
                          class="btn-tour-nav btn-tour-next">
                    <span>Next: {{ tourService.steps[tourService.currentStepIndex() + 1].module }}</span>
                    <span>→</span>
                  </button>
                } @else {
                  <button type="button"
                          (click)="tourService.openPosTerminal()"
                          class="btn-tour-nav btn-tour-finish">
                    <span>Launch Cashier POS Register</span>
                    <span>🚀</span>
                  </button>
                }
              </div>
            </div>

          </div>
        }

      </aside>
    }
  `,
  styles: [`
    .tour-dock-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      width: 90%;
      max-width: 820px;
      pointer-events: auto;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
    }

    /* COLLAPSED PILL */
    .tour-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(99, 102, 241, 0.4);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      border-radius: 40px;
      padding: 8px 16px;
      cursor: pointer;
      color: #fff;
      margin: 0 auto;
      transition: all 0.15s ease;
    }
    .tour-pill:hover {
      border-color: #818cf8;
      transform: translateY(-2px);
      box-shadow: 0 14px 34px rgba(79, 70, 229, 0.25);
    }
    .pill-label {
      font-size: 11px;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pill-title {
      font-size: 12px;
      font-weight: 600;
      color: #f1f5f9;
    }

    /* EXPANDED CARD */
    .tour-card {
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 20px;
      padding: 16px 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 25px rgba(79, 70, 229, 0.15);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* HEADER */
    .tour-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 10px;
    }
    .tour-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tour-live-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.06em;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
      animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .tour-step-counter {
      font-size: 10.5px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }
    .tour-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .tour-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-tour-pos {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-tour-pos:hover {
      background: rgba(16, 185, 129, 0.25);
      border-color: #34d399;
      transform: translateY(-1px);
    }
    .btn-tour-pos svg {
      width: 12px;
      height: 12px;
    }
    .tour-action-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: all 0.12s;
    }
    .tour-action-btn svg {
      width: 13px;
      height: 13px;
    }
    .tour-action-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .tour-exit-btn:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fca5a5;
    }

    /* CONTENT */
    .tour-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tour-title-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .tour-title {
      font-size: 16px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .tour-module-name {
      font-size: 11px;
      font-weight: 600;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .tour-description {
      font-size: 12.5px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.45;
    }

    /* FOOTER */
    .tour-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 4px;
    }

    /* DOTS */
    .tour-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tour-dot {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tour-dot:hover .dot-inner {
      background: rgba(255, 255, 255, 0.5);
      transform: scale(1.2);
    }
    .tour-dot.completed .dot-inner {
      background: #4f46e5;
    }
    .tour-dot.active .dot-inner {
      width: 22px;
      border-radius: 6px;
      background: linear-gradient(90deg, #6366f1, #38bdf8);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
    }

    /* NAVIGATION BUTTONS */
    .tour-nav-btns {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-tour-nav {
      font-size: 11.5px;
      font-weight: 700;
      border-radius: 8px;
      padding: 6px 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-tour-prev {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-tour-prev:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }
    .btn-tour-prev:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .btn-tour-next {
      background: linear-gradient(135deg, #4f46e5, #0ea5e9);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
    }
    .btn-tour-next:hover {
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.5);
      transform: translateY(-1px);
    }
    .btn-tour-finish {
      background: linear-gradient(135deg, #059669, #10b981);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    .btn-tour-finish:hover {
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
      transform: translateY(-1px);
    }

    .btn-icon-sm {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0;
    }
    .btn-icon-sm svg {
      width: 14px;
      height: 14px;
    }
    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseDot 1.5s infinite;
    }
  `]
})
export class TourDockComponent {
  constructor(public tourService: TourService) {}
}
