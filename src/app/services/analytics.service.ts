import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../src/environments/environment';

export interface TopSellingProduct {
  variantId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface BusiestHour {
  hourOfDay: number;
  transactionCount: number;
  totalRevenue: number;
}

export interface ProfitMarginReport {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  profitMarginPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = environment?.apiUrl || 'https://localhost:7119/api';

  constructor(private http: HttpClient) {}

  getTopSellingProducts(storeId?: string, startDate?: string, endDate?: string, limit: number = 10): Observable<TopSellingProduct[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (storeId) params = params.set('storeId', storeId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<TopSellingProduct[]>(`${this.apiUrl}/analytics/top-products`, { params });
  }

  getBusiestHours(storeId?: string, startDate?: string, endDate?: string): Observable<BusiestHour[]> {
    let params = new HttpParams();
    if (storeId) params = params.set('storeId', storeId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<BusiestHour[]>(`${this.apiUrl}/analytics/busiest-hours`, { params });
  }

  getProfitMarginReport(storeId?: string, startDate?: string, endDate?: string): Observable<ProfitMarginReport> {
    let params = new HttpParams();
    if (storeId) params = params.set('storeId', storeId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ProfitMarginReport>(`${this.apiUrl}/analytics/profit-margin`, { params });
  }
}
