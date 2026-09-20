import { Injectable } from '@angular/core';

export interface VisionMetrics {
  faceDetected: boolean;
  isCentered: boolean;
  headYaw: number; // degrees: positive = turning right, negative = turning left
  direction: 'Center' | 'Right' | 'Left';
  blinkDetected: boolean;
  eyeClosureScore: number; // 0.0 (open) to 1.0 (closed)
  smileDetected: boolean;
  smileScore: number; // 0.0 to 1.0
  confidence: number;
  feedbackMessage: string;
  isWrongDirection: boolean;
  telemetry: string;
}

@Injectable({
  providedIn: 'root'
})
export class FaceVisionService {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  // Analysis buffer resolution (optimized for 30-60 FPS real-time processing)
  private readonly PROC_WIDTH = 160;
  private readonly PROC_HEIGHT = 120;

  // Motion & temporal tracking state
  private prevFrameData: Uint8ClampedArray | null = null;
  private prevFeatureCenter = 0.5;
  private cumulativeMotionX = 0;
  private motionHistory: number[] = [];

  // Blink state machine
  private eyeEnergyBaseline = 0;
  private isEyeClosed = false;
  private eyeClosedFrames = 0;
  private blinkSuccess = false;

  // Smile baseline & tracking
  private neutralMouthWidth = 0;
  private smileSuccess = false;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.PROC_WIDTH;
    this.offscreenCanvas.height = this.PROC_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  reset() {
    this.prevFrameData = null;
    this.prevFeatureCenter = 0.5;
    this.cumulativeMotionX = 0;
    this.motionHistory = [];
    this.eyeEnergyBaseline = 0;
    this.isEyeClosed = false;
    this.eyeClosedFrames = 0;
    this.blinkSuccess = false;
    this.neutralMouthWidth = 0;
    this.smileSuccess = false;
  }

  analyzeFrame(
    video: HTMLVideoElement,
    currentStepKey: string,
    isMirrored: boolean = true
  ): VisionMetrics {
    if (!this.offscreenCtx || video.readyState < 2 || video.videoWidth === 0) {
      return this.defaultMetrics('Initializing camera stream...');
    }

    // 1. Draw scaled down frame
    this.offscreenCtx.drawImage(video, 0, 0, this.PROC_WIDTH, this.PROC_HEIGHT);
    const imgData = this.offscreenCtx.getImageData(0, 0, this.PROC_WIDTH, this.PROC_HEIGHT);
    const data = imgData.data;

    // 2. Skin tone segmentation & Face Bounding Box detection
    // Using standard YCbCr skin clustering (robust across all skin complexions)
    let minX = this.PROC_WIDTH;
    let maxX = 0;
    let minY = this.PROC_HEIGHT;
    let maxY = 0;
    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;

    // Central oval guide normalized bounds: x in [0.22, 0.78], y in [0.15, 0.85]
    const guideMinX = Math.floor(this.PROC_WIDTH * 0.18);
    const guideMaxX = Math.floor(this.PROC_WIDTH * 0.82);
    const guideMinY = Math.floor(this.PROC_HEIGHT * 0.12);
    const guideMaxY = Math.floor(this.PROC_HEIGHT * 0.88);

    for (let y = guideMinY; y < guideMaxY; y++) {
      for (let x = guideMinX; x < guideMaxX; x++) {
        const idx = (y * this.PROC_WIDTH + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Convert RGB to YCbCr
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Human skin tone cluster
        if (cb >= 77 && cb <= 135 && cr >= 130 && cr <= 175) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const minRequiredSkinPixels = (this.PROC_WIDTH * this.PROC_HEIGHT) * 0.04;
    if (skinPixelCount < minRequiredSkinPixels) {
      return this.defaultMetrics('⚠️ Position your face inside the oval guide');
    }

    const faceCenterX = sumX / skinPixelCount;
    const faceCenterY = sumY / skinPixelCount;
    const faceWidth = Math.max(20, maxX - minX);
    const faceHeight = Math.max(25, maxY - minY);

    // Check centering
    const normCenterX = faceCenterX / this.PROC_WIDTH;
    const normCenterY = faceCenterY / this.PROC_HEIGHT;
    const isCentered = normCenterX >= 0.38 && normCenterX <= 0.62 && normCenterY >= 0.35 && normCenterY <= 0.65;

    // 3. Feature Gradient & Dark Feature Point Tracking (Eyes, Nose, Mouth)
    let darkFeatureSumX = 0;
    let darkFeatureWeight = 0;

    for (let y = Math.floor(minY + faceHeight * 0.2); y < Math.floor(minY + faceHeight * 0.85); y++) {
      for (let x = Math.floor(minX + faceWidth * 0.15); x < Math.floor(minX + faceWidth * 0.85); x++) {
        const idx = (y * this.PROC_WIDTH + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        // Dark facial features (pupils, nostrils, lips) have lower luminance
        const weight = Math.max(0, 160 - lum);
        darkFeatureSumX += x * weight;
        darkFeatureWeight += weight;
      }
    }

    const featureCenterX = darkFeatureWeight > 0 ? (darkFeatureSumX / darkFeatureWeight) : faceCenterX;
    const normalizedFeatureX = (featureCenterX - minX) / faceWidth; // 0.5 is center

    // 4. Optical Flow & Motion Vector Estimation
    let frameMotionX = 0;
    if (this.prevFrameData) {
      let flowSum = 0;
      let flowSamples = 0;
      const step = 4;
      for (let y = Math.floor(minY); y < Math.floor(maxY); y += step) {
        for (let x = Math.floor(minX + 2); x < Math.floor(maxX - 2); x += step) {
          const idx = (y * this.PROC_WIDTH + x) * 4;
          const prevIdx = (y * this.PROC_WIDTH + x) * 4;
          const currLum = data[idx];
          const prevLum = this.prevFrameData[prevIdx];
          const diffT = currLum - prevLum;
          const gradX = data[idx + 4] - data[idx - 4];

          if (Math.abs(gradX) > 12 && Math.abs(diffT) > 3) {
            // Lucas-Kanade 1D flow component: v_x = -diffT / gradX
            const vx = -diffT / gradX;
            if (Math.abs(vx) < 8) {
              flowSum += vx;
              flowSamples++;
            }
          }
        }
      }
      if (flowSamples > 10) {
        frameMotionX = flowSum / flowSamples;
      }
    }

    // Save current frame for next optical flow step
    this.prevFrameData = new Uint8ClampedArray(data);

    // In mirrored webcam mode (standard in browsers):
    // When the user physically turns to their RIGHT (towards screen right):
    // The image flow is directed towards the screen's right.
    const screenMotionX = isMirrored ? frameMotionX : -frameMotionX;
    this.motionHistory.push(screenMotionX);
    if (this.motionHistory.length > 8) this.motionHistory.shift();

    const avgMotionX = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;
    this.cumulativeMotionX = Math.max(-50, Math.min(50, this.cumulativeMotionX + avgMotionX));

    // Calculate Head Yaw in degrees (combines feature asymmetry + optical flow)
    // When user turns right: asymmetry > 0.54, yaw is positive (+15 to +40 deg)
    // When user turns left: asymmetry < 0.46, yaw is negative (-15 to -40 deg)
    const asymmetryOffset = (normalizedFeatureX - 0.5) * 100; // -50 to +50
    const calculatedYaw = Math.round((asymmetryOffset * 0.9) + (this.cumulativeMotionX * 0.4));

    let detectedDirection: 'Center' | 'Right' | 'Left' = 'Center';
    if (calculatedYaw > 14 || (normalizedFeatureX > 0.55 && this.cumulativeMotionX > 4)) {
      detectedDirection = 'Right';
    } else if (calculatedYaw < -14 || (normalizedFeatureX < 0.45 && this.cumulativeMotionX < -4)) {
      detectedDirection = 'Left';
    }

    // 5. Eye Blink Classification (Upper Face Region)
    // Measures contrast energy in the eye band
    const eyeBandMinY = Math.floor(minY + faceHeight * 0.22);
    const eyeBandMaxY = Math.floor(minY + faceHeight * 0.44);
    let eyeEdgeEnergy = 0;
    let eyePixels = 0;

    for (let y = eyeBandMinY; y < eyeBandMaxY; y += 2) {
      for (let x = Math.floor(minX + faceWidth * 0.2); x < Math.floor(minX + faceWidth * 0.8); x += 2) {
        const idx = (y * this.PROC_WIDTH + x) * 4;
        const downIdx = ((y + 2) * this.PROC_WIDTH + x) * 4;
        const diffY = Math.abs(data[idx] - data[downIdx]);
        eyeEdgeEnergy += diffY;
        eyePixels++;
      }
    }

    const currentEyeEnergy = eyePixels > 0 ? (eyeEdgeEnergy / eyePixels) : 0;
    if (this.eyeEnergyBaseline === 0) {
      this.eyeEnergyBaseline = currentEyeEnergy;
    } else {
      // Exponential moving average for baseline open eyes
      if (!this.isEyeClosed) {
        this.eyeEnergyBaseline = this.eyeEnergyBaseline * 0.92 + currentEyeEnergy * 0.08;
      }
    }

    // Eye closure ratio: when eyes close, high-contrast iris/pupil edges disappear
    const energyRatio = this.eyeEnergyBaseline > 0 ? (currentEyeEnergy / this.eyeEnergyBaseline) : 1;
    const eyeClosureScore = Math.max(0, Math.min(1, (1 - energyRatio) * 2.2));

    if (eyeClosureScore > 0.45) {
      this.isEyeClosed = true;
      this.eyeClosedFrames++;
    } else if (this.isEyeClosed && eyeClosureScore < 0.25) {
      // Eye closed then reopened within 1 to 15 frames -> TRUE BLINK!
      if (this.eyeClosedFrames >= 1 && this.eyeClosedFrames <= 18) {
        this.blinkSuccess = true;
      }
      this.isEyeClosed = false;
      this.eyeClosedFrames = 0;
    }

    // 6. Smile Classification (Mouth Region)
    // Measures horizontal expansion of dark oral cavity / lip contrast in the lower third
    const mouthMinY = Math.floor(minY + faceHeight * 0.65);
    const mouthMaxY = Math.floor(minY + faceHeight * 0.88);
    let mouthLeft = maxX;
    let mouthRight = minX;
    let mouthPoints = 0;

    for (let y = mouthMinY; y < mouthMaxY; y++) {
      for (let x = Math.floor(minX + faceWidth * 0.25); x < Math.floor(minX + faceWidth * 0.75); x++) {
        const idx = (y * this.PROC_WIDTH + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 95) {
          mouthPoints++;
          if (x < mouthLeft) mouthLeft = x;
          if (x > mouthRight) mouthRight = x;
        }
      }
    }

    const currentMouthWidth = Math.max(1, mouthRight - mouthLeft);
    const mouthWidthRatio = currentMouthWidth / faceWidth;

    if (this.neutralMouthWidth === 0 && mouthWidthRatio > 0.2) {
      this.neutralMouthWidth = mouthWidthRatio;
    }

    const smileRatio = this.neutralMouthWidth > 0 ? (mouthWidthRatio / this.neutralMouthWidth) : 1;
    const smileScore = Math.max(0, Math.min(1, (smileRatio - 1.05) * 3.5));
    if (smileScore > 0.50 || mouthWidthRatio > 0.46) {
      this.smileSuccess = true;
    }

    // 7. Contextual Challenge Evaluation (Strict Biometric Enforcement)
    let feedback = '';
    let isWrongDirection = false;

    if (currentStepKey === 'Align') {
      if (!isCentered) {
        feedback = 'Center your face directly inside the oval guide';
      } else if (Math.abs(calculatedYaw) > 10) {
        feedback = 'Hold head straight, look directly at camera';
      } else {
        feedback = 'Face centered! Hold steady...';
      }
    } else if (currentStepKey === 'TurnRight') {
      if (detectedDirection === 'Left') {
        isWrongDirection = true;
        feedback = '❌ You turned Left! Please turn Right ➡️';
      } else if (detectedDirection === 'Right') {
        feedback = `✓ Right turn detected! (${calculatedYaw}°)`;
      } else {
        feedback = 'Slowly turn your head to the Right ➡️';
      }
    } else if (currentStepKey === 'TurnLeft') {
      if (detectedDirection === 'Right') {
        isWrongDirection = true;
        feedback = '❌ You turned Right! Please turn Left ⬅️';
      } else if (detectedDirection === 'Left') {
        feedback = `✓ Left turn detected! (${calculatedYaw}°)`;
      } else {
        feedback = 'Slowly turn your head to the Left ⬅️';
      }
    } else if (currentStepKey === 'Blink') {
      if (this.blinkSuccess) {
        feedback = '✓ Blink detected!';
      } else if (this.isEyeClosed) {
        feedback = 'Eyes closed, now open your eyes...';
      } else {
        feedback = 'Blink both eyes naturally 👁️';
      }
    } else if (currentStepKey === 'Smile') {
      if (this.smileSuccess || smileScore > 0.5) {
        feedback = '✓ Smile verified! Keep smiling 😊';
      } else {
        feedback = 'Please smile at the camera 😊';
      }
    }

    const telemetry = `yaw:${calculatedYaw}deg, dir:${detectedDirection}, blink:${(eyeClosureScore * 100).toFixed(0)}%, smile:${(smileScore * 100).toFixed(0)}%`;

    return {
      faceDetected: true,
      isCentered,
      headYaw: calculatedYaw,
      direction: detectedDirection,
      blinkDetected: this.blinkSuccess,
      eyeClosureScore,
      smileDetected: this.smileSuccess || smileScore > 0.5,
      smileScore,
      confidence: Math.min(0.99, skinPixelCount / (this.PROC_WIDTH * this.PROC_HEIGHT * 0.2)),
      feedbackMessage: feedback,
      isWrongDirection,
      telemetry
    };
  }

  private defaultMetrics(message: string): VisionMetrics {
    return {
      faceDetected: false,
      isCentered: false,
      headYaw: 0,
      direction: 'Center',
      blinkDetected: false,
      eyeClosureScore: 0,
      smileDetected: false,
      smileScore: 0,
      confidence: 0,
      feedbackMessage: message,
      isWrongDirection: false,
      telemetry: 'no_face'
    };
  }
}
