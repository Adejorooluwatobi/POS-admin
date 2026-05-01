import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/audit-logs';

  constructor(private http: HttpClient) {}

  async getAuditLogs(tenantId: string, page: number = 1, size: number = 50): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${tenantId}`, { params }));
  }
}
