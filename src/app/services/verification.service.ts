import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/verification`;

  startLivenessSession(customerId?: string, purpose: string = 'FaceVerification'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/liveness/start`, {
      customerId: customerId || null,
      purpose
    });
  }

  verifyLivenessStep(sessionId: string, step: string, telemetry?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/liveness/step`, {
      sessionId,
      step,
      telemetry: telemetry || `Completed step ${step} at ${new Date().toISOString()}`
    });
  }

  completeLiveness(sessionId: string, photoBase64: string, auditLog: string, customerId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/liveness/complete`, {
      sessionId,
      photoBase64,
      auditLog,
      customerId: customerId || null
    });
  }
}
