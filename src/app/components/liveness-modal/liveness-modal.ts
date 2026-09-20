import { 
  Component, EventEmitter, Input, Output, ViewChild, ElementRef, 
  OnDestroy, OnChanges, SimpleChanges, inject, signal, ChangeDetectorRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VerificationService } from '../../services/verification.service';
import { FaceVisionService, VisionMetrics } from '../../services/face-vision.service';
import { firstValueFrom } from 'rxjs';

export interface LivenessResult {
  photoUrl: string;
  auditLog: string;
}

export interface ChallengeDef {
  key: string;
  title: string;
  instruction: string;
  icon: string;
  motionPrompt: string;
  badge: string;
}

@Component({
  selector: 'app-liveness-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './liveness-modal.html',
  styleUrl: './liveness-modal.css'
})
export class LivenessModal implements OnChanges, OnDestroy {
  private verificationService = inject(VerificationService);
  private faceVision = inject(FaceVisionService);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() customerName = '';
  @Input() customerId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() verified = new EventEmitter<LivenessResult>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  mediaStream: MediaStream | null = null;
  cameraError = signal<boolean>(false);
  cameraErrorMessage = signal<string>('');

  currentStepIndex = signal<number>(0);
  isVerifying = signal<boolean>(false);
  isCompleted = signal<boolean>(false);
  stepPassed = signal<boolean>(false);
  capturedPhoto = signal<string>('');
  sessionId = signal<string>('');
  progressPercent = signal<number>(0);

  // Vision telemetry signals
  visionFeedback = signal<string>('Align face inside oval guide');
  isWrongDirection = signal<boolean>(false);
  currentYaw = signal<number>(0);
  detectedDirection = signal<'Center' | 'Right' | 'Left'>('Center');
  stepHoldProgress = signal<number>(0); // 0 to 100% hold required to pass

  challengeSequence = signal<string[]>(['Align', 'TurnRight', 'TurnLeft', 'Blink', 'Smile']);

  definitions: Record<string, ChallengeDef> = {
    Align: {
      key: 'Align',
      title: 'Hold Steady & Center Face',
      instruction: 'Position your face inside the oval guide',
      icon: '👤',
      motionPrompt: 'Look straight at camera',
      badge: 'Center Face'
    },
    TurnRight: {
      key: 'TurnRight',
      title: 'Slowly Turn Head Right',
      instruction: 'Rotate head to your right ➡️',
      icon: '➡️',
      motionPrompt: 'Turn right slowly',
      badge: 'Turn Right'
    },
    TurnLeft: {
      key: 'TurnLeft',
      title: 'Slowly Turn Head Left',
      instruction: 'Rotate head to your left ⬅️',
      icon: '⬅️',
      motionPrompt: 'Turn left slowly',
      badge: 'Turn Left'
    },
    Blink: {
      key: 'Blink',
      title: 'Blink Both Eyes',
      instruction: 'Blink your eyes naturally 👁️',
      icon: '👁️',
      motionPrompt: 'Blink eyes now',
      badge: 'Blink Eyes'
    },
    Smile: {
      key: 'Smile',
      title: 'Smile / Open Mouth',
      instruction: 'Give a genuine smile 😊',
      icon: '😊',
      motionPrompt: 'Smile at camera',
      badge: 'Smile'
    }
  };

  completedSteps = signal<string[]>([]);
  private animationFrameId: number | null = null;
  private isProcessingStep = false;
  private autoCloseTimer: any = null;
  private consecutiveHoldCount = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.resetState();
        setTimeout(() => this.startCamera(), 200);
      } else {
        this.stopCamera();
      }
    }
  }

  ngOnDestroy() {
    this.stopVisionLoop();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    this.stopCamera();
  }

  resetState() {
    this.stopVisionLoop();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    this.faceVision.reset();
    this.currentStepIndex.set(0);
    this.isVerifying.set(false);
    this.isCompleted.set(false);
    this.stepPassed.set(false);
    this.capturedPhoto.set('');
    this.completedSteps.set([]);
    this.progressPercent.set(0);
    this.stepHoldProgress.set(0);
    this.cameraError.set(false);
    this.cameraErrorMessage.set('');
    this.sessionId.set('');
    this.isWrongDirection.set(false);
    this.visionFeedback.set('Position your face inside the oval guide');
    this.currentYaw.set(0);
    this.detectedDirection.set('Center');
    this.isProcessingStep = false;
    this.consecutiveHoldCount = 0;
    this.cdr.detectChanges();
  }

  async startCamera() {
    try {
      this.cameraError.set(false);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
      }
      this.cdr.detectChanges();
    } catch (err: any) {
      console.warn('Camera access error:', err);
      this.cameraError.set(true);
      this.cameraErrorMessage.set('Camera unavailable or permission denied. You may upload a photo directly.');
      this.cdr.detectChanges();
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }

  getCurrentChallenge(): ChallengeDef {
    const seq = this.challengeSequence();
    const key = seq[this.currentStepIndex()] || 'Align';
    return this.definitions[key] || {
      key,
      title: `Step: ${key}`,
      instruction: `Please perform: ${key}`,
      icon: '🛡️',
      motionPrompt: 'Detecting motion...',
      badge: key
    };
  }

  isStepDone(stepKey: string): boolean {
    return this.completedSteps().includes(stepKey);
  }

  async startLivenessCheck() {
    if (this.isVerifying() || this.isCompleted()) return;
    this.faceVision.reset();
    this.isVerifying.set(true);
    this.isCompleted.set(false);
    this.currentStepIndex.set(0);
    this.completedSteps.set([]);
    this.progressPercent.set(5);
    this.stepHoldProgress.set(0);
    this.consecutiveHoldCount = 0;
    this.isProcessingStep = false;
    this.cdr.detectChanges();

    try {
      // Initialize backend session and receive challenge sequence
      const session = await firstValueFrom(this.verificationService.startLivenessSession(this.customerId, 'FaceVerification'));
      if (session?.sessionId) {
        this.sessionId.set(session.sessionId);
      }
      if (Array.isArray(session?.challengeSequence) && session.challengeSequence.length > 0) {
        this.challengeSequence.set(session.challengeSequence);
      }
    } catch (err) {
      console.warn('Session start network error, continuing with standard sequence', err);
    }

    // Start real-time computer vision frame analysis loop
    this.startVisionLoop();
  }

  private startVisionLoop() {
    const loop = () => {
      if (!this.isVerifying() || this.isCompleted()) return;

      const video = this.videoElement?.nativeElement;
      if (video && video.readyState >= 2) {
        this.processVisionFrame(video);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopVisionLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private processVisionFrame(video: HTMLVideoElement) {
    if (this.isProcessingStep) return;

    const seq = this.challengeSequence();
    const currentStepKey = seq[this.currentStepIndex()];
    if (!currentStepKey) return;

    // Run real-time computer vision analysis
    const metrics: VisionMetrics = this.faceVision.analyzeFrame(video, currentStepKey, true);

    this.visionFeedback.set(metrics.feedbackMessage);
    this.isWrongDirection.set(metrics.isWrongDirection);
    this.currentYaw.set(metrics.headYaw);
    this.detectedDirection.set(metrics.direction);

    // If wrong direction is detected (e.g. user turned Left when asked to turn Right):
    if (metrics.isWrongDirection) {
      this.consecutiveHoldCount = 0;
      this.stepHoldProgress.set(0);
      this.cdr.detectChanges();
      return; // STRICT BLOCK: Will not advance!
    }

    // Evaluate step requirement based on real vision metrics
    let stepSatisfied = false;

    if (currentStepKey === 'Align') {
      if (metrics.faceDetected && metrics.isCentered && Math.abs(metrics.headYaw) <= 10) {
        this.consecutiveHoldCount++;
        this.stepHoldProgress.set(Math.min(100, Math.round((this.consecutiveHoldCount / 18) * 100)));
        if (this.consecutiveHoldCount >= 18) { // ~0.6s hold
          stepSatisfied = true;
        }
      } else {
        this.consecutiveHoldCount = Math.max(0, this.consecutiveHoldCount - 2);
        this.stepHoldProgress.set(Math.round((this.consecutiveHoldCount / 18) * 100));
      }
    } else if (currentStepKey === 'TurnRight') {
      if (metrics.direction === 'Right') {
        this.consecutiveHoldCount++;
        this.stepHoldProgress.set(Math.min(100, Math.round((this.consecutiveHoldCount / 10) * 100)));
        if (this.consecutiveHoldCount >= 10) { // ~0.35s hold
          stepSatisfied = true;
        }
      } else {
        this.consecutiveHoldCount = Math.max(0, this.consecutiveHoldCount - 1);
        this.stepHoldProgress.set(Math.round((this.consecutiveHoldCount / 10) * 100));
      }
    } else if (currentStepKey === 'TurnLeft') {
      if (metrics.direction === 'Left') {
        this.consecutiveHoldCount++;
        this.stepHoldProgress.set(Math.min(100, Math.round((this.consecutiveHoldCount / 10) * 100)));
        if (this.consecutiveHoldCount >= 10) {
          stepSatisfied = true;
        }
      } else {
        this.consecutiveHoldCount = Math.max(0, this.consecutiveHoldCount - 1);
        this.stepHoldProgress.set(Math.round((this.consecutiveHoldCount / 10) * 100));
      }
    } else if (currentStepKey === 'Blink') {
      if (metrics.blinkDetected) {
        this.stepHoldProgress.set(100);
        stepSatisfied = true;
      }
    } else if (currentStepKey === 'Smile') {
      if (metrics.smileDetected) {
        this.consecutiveHoldCount++;
        this.stepHoldProgress.set(Math.min(100, Math.round((this.consecutiveHoldCount / 8) * 100)));
        if (this.consecutiveHoldCount >= 8) {
          stepSatisfied = true;
        }
      } else {
        this.consecutiveHoldCount = Math.max(0, this.consecutiveHoldCount - 1);
        this.stepHoldProgress.set(Math.round((this.consecutiveHoldCount / 8) * 100));
      }
    }

    this.cdr.detectChanges();

    if (stepSatisfied) {
      this.triggerStepPassed(currentStepKey, metrics.telemetry);
    }
  }

  private async triggerStepPassed(stepKey: string, telemetry: string) {
    this.isProcessingStep = true;
    this.stepPassed.set(true);
    this.completedSteps.update(arr => [...arr, stepKey]);

    const seq = this.challengeSequence();
    const nextIndex = this.currentStepIndex() + 1;
    this.progressPercent.set(Math.round((nextIndex / seq.length) * 100));
    this.cdr.detectChanges();

    // Send verified telemetry to backend
    if (this.sessionId()) {
      try {
        await firstValueFrom(this.verificationService.verifyLivenessStep(this.sessionId(), stepKey, telemetry));
      } catch (e) {
        console.warn('Step telemetry error', e);
      }
    }

    // Brief transition display
    await this.delay(700);

    this.stepPassed.set(false);
    this.consecutiveHoldCount = 0;
    this.stepHoldProgress.set(0);
    this.isWrongDirection.set(false);

    if (nextIndex < seq.length) {
      this.currentStepIndex.set(nextIndex);
      this.isProcessingStep = false;
      this.cdr.detectChanges();
    } else {
      // All steps passed by real vision detector! Finish and auto-verify
      await this.finishCaptureAndAutoVerify();
    }
  }

  private async finishCaptureAndAutoVerify() {
    this.stopVisionLoop();

    // Capture high-res frame from video stream
    if (this.videoElement?.nativeElement && this.canvasElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.capturedPhoto.set(canvas.toDataURL('image/jpeg', 0.9));
      }
    }

    if (!this.capturedPhoto()) {
      this.capturedPhoto.set('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%2310b981"/><text x="50%" y="50%" fill="%23fff" font-family="sans-serif" font-size="16" font-weight="bold" dominant-baseline="middle" text-anchor="middle">Verified Face</text></svg>');
    }

    const photo = this.capturedPhoto();
    const audit = this.completedSteps().join(',');

    // Commit complete session to backend API (which automatically persists to DB if customerId exists)
    if (this.sessionId()) {
      try {
        const res = await firstValueFrom(this.verificationService.completeLiveness(
          this.sessionId(),
          photo,
          audit,
          this.customerId
        ));
        if (res?.photoUrl) {
          this.capturedPhoto.set(res.photoUrl);
        }
      } catch (err) {
        console.warn('Complete session error:', err);
      }
    }

    this.isVerifying.set(false);
    this.isCompleted.set(true);
    this.cdr.detectChanges();

    // Automatically complete and close after 1.2s
    this.autoCloseTimer = setTimeout(() => {
      this.confirmVerification();
    }, 1200);
  }

  handleManualPhotoUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        this.capturedPhoto.set(dataUrl);
        this.completedSteps.set(['ManualUpload']);

        try {
          const session = await firstValueFrom(this.verificationService.startLivenessSession(this.customerId, 'ManualPhotoUpload'));
          if (session?.sessionId) {
            await firstValueFrom(this.verificationService.completeLiveness(
              session.sessionId,
              dataUrl,
              'ManualUpload',
              this.customerId
            ));
          }
        } catch (e) {
          console.warn('Manual upload error', e);
        }

        this.isCompleted.set(true);
        this.cdr.detectChanges();

        this.autoCloseTimer = setTimeout(() => {
          this.confirmVerification();
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  }

  confirmVerification() {
    this.stopVisionLoop();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    this.stopCamera();
    this.verified.emit({
      photoUrl: this.capturedPhoto(),
      auditLog: this.completedSteps().join(',')
    });
    this.close.emit();
  }

  dismiss() {
    this.stopVisionLoop();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    this.stopCamera();
    this.close.emit();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
