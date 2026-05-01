import { Component, EventEmitter, Output, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var ZXing: any;

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-container">
      <div class="scanner-header">
        <div style="font-weight: 800; font-size: 14px;">Scan Barcode</div>
        <button (click)="close()" class="close-btn">&times;</button>
      </div>
      <div class="video-wrapper">
        <video #video autoplay style="width: 100%; border-radius: 8px;"></video>
        <div class="scanner-overlay">
          <div class="scan-line"></div>
        </div>
      </div>
      <div class="scanner-footer">
        <div style="font-size: 11px; color: var(--text3); text-align: center;">
          Center the barcode within the window to scan
        </div>
      </div>
    </div>

    <style>
      .scanner-container {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 20px 50px rgba(0,0,0,.3);
      }
      .scanner-header {
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text3);
        cursor: pointer;
      }
      .video-wrapper {
        position: relative;
        padding: 16px;
        background: #000;
      }
      .scanner-overlay {
        position: absolute;
        inset: 16px;
        border: 2px solid var(--accent);
        border-radius: 8px;
        pointer-events: none;
        opacity: 0.5;
      }
      .scan-line {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--accent);
        box-shadow: 0 0 8px var(--accent);
        animation: scan 2s linear infinite;
      }
      @keyframes scan {
        0% { top: 10%; }
        50% { top: 90%; }
        100% { top: 10%; }
      }
      .scanner-footer {
        padding: 16px;
        border-top: 1px solid var(--border);
      }
    </style>
  `
})
export class BarcodeScannerComponent implements OnInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;

  private codeReader: any;
  private selectedDeviceId: string | null = null;

  ngOnInit() {
    this.initScanner();
  }

  ngOnDestroy() {
    if (this.codeReader) {
      this.codeReader.reset();
    }
  }

  async initScanner() {
    try {
      this.codeReader = new ZXing.BrowserMultiFormatReader();
      const videoInputDevices = await this.codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length > 0) {
        // Prefer back camera if available
        const backCamera = videoInputDevices.find((device: any) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        this.selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        
        this.codeReader.decodeFromVideoDevice(
          this.selectedDeviceId, 
          this.videoElement.nativeElement, 
          (result: any, err: any) => {
            if (result) {
              this.scanned.emit(result.text);
              this.close();
            }
          }
        );
      } else {
        alert('No camera found on this device.');
        this.close();
      }
    } catch (err) {
      console.error('Scanner init error:', err);
      alert('Could not initialize camera. Please check permissions.');
      this.close();
    }
  }

  close() {
    if (this.codeReader) {
      this.codeReader.reset();
    }
    this.closed.emit();
  }
}
