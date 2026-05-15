import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/tenants';

  constructor(private http: HttpClient) {}

  async getTenants(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async setTenantStatus(id: string, isActive: boolean): Promise<void> {
    // We send the boolean directly as the body for PATCH status
    await firstValueFrom(this.http.patch<void>(`${this.apiUrl}/${id}/status`, isActive, {
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  async getTenantDetails(id: string, year?: number, month?: number): Promise<any> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}/details`, { params }));
  }

  async createTenant(dto: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, dto));
  }

  async updateSubscription(tenantId: string, dto: any): Promise<any> {
    // Note: This uses the /api/subscriptions endpoint
    const subUrl = 'https://pos-saas-cl9g.onrender.com/api/subscriptions';
    return await firstValueFrom(this.http.put<any>(`${subUrl}/${tenantId}`, dto));
  }
}
