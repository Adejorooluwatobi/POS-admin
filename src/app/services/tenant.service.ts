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
}
