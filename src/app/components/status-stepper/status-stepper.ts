import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex; align-items:center; width:100%; max-width:800px; margin:0 auto; padding:40px 20px;">
      <div *ngFor="let step of steps; let i = index; let last = last" 
           style="display:flex; align-items:center;" 
           [style.flex]="last ? '0 0 auto' : '1'">
        
        <!-- Step Circle -->
        <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
          <div [style.background-color]="i <= currentStepIndex ? '#4f46e5' : '#ffffff'"
               [style.color]="i <= currentStepIndex ? '#ffffff' : '#94a3b8'"
               [style.border-color]="i <= currentStepIndex ? '#4f46e5' : '#e2e8f0'"
               [style.box-shadow]="i <= currentStepIndex ? '0 10px 15px -3px rgba(79, 70, 229, 0.2)' : 'none'"
               style="width:36px; height:36px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; transition:all 0.3s ease; z-index:10;">
            <span *ngIf="i < currentStepIndex">✓</span>
            <span *ngIf="i >= currentStepIndex">{{ i + 1 }}</span>
          </div>
          
          <!-- Label -->
          <div style="position:absolute; bottom:-24px; width:max-content; font-size:9px; font-weight:800; text-transform:uppercase; tracking:0.1em; white-space:nowrap;"
               [style.color]="i <= currentStepIndex ? '#4f46e5' : '#94a3b8'">
            {{ formatLabel(step) }}
          </div>
        </div>

        <!-- Connector Line -->
        <div *ngIf="!last" 
             style="flex:1; height:2px; margin:0 12px; transition:all 0.3s ease;"
             [style.background-color]="i < currentStepIndex ? '#4f46e5' : '#f1f5f9'">
        </div>
      </div>
    </div>
  `
})
export class StatusStepperComponent {
  @Input() steps: string[] = [];
  @Input() currentStatus: string = '';

  get currentStepIndex(): number {
    return this.steps.indexOf(this.currentStatus);
  }

  formatLabel(step: string): string {
    // Add spaces between camelCase words
    return step.replace(/([A-Z])/g, ' $1').trim();
  }
}
