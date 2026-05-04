import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private ordersUrl = 'https://pos-saas-cl9g.onrender.com/api/inventory-orders';
  private requisitionsUrl = 'https://pos-saas-cl9g.onrender.com/api/stock-requisitions';
  private inventoryUrl = 'https://pos-saas-cl9g.onrender.com/api/inventory';

  constructor(private http: HttpClient) {}

  // ── Inventory Orders ──────────────────────────────────────────────
  async getOrders(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.ordersUrl, { params }));
  }

  async getOrderById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.ordersUrl}/${id}`));
  }

  async createOrder(order: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.ordersUrl, order));
  }

  async dispatchOrder(id: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/dispatch`, {}));
  }

  async receiveOrder(id: string, data: any): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/receive`, data));
  }

  async approveOrder(id: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/approve`, {}));
  }

  async disputeOrder(id: string, data: any): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/dispute`, data));
  }

  async resolveDispute(id: string, data: any): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/resolve`, data));
  }

  async acceptReferral(id: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/accept-referral`, {}));
  }

  async declineReferral(id: string, reason: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.ordersUrl}/${id}/decline-referral?reason=${reason}`, {}));
  }

  // ── Stock Requisitions ────────────────────────────────────────────
  async getRequisitions(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.requisitionsUrl, { params }));
  }

  async getRequisitionById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.requisitionsUrl}/${id}`));
  }

  async createRequisition(requisition: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.requisitionsUrl, requisition));
  }

  async approveRequisition(id: string, data: any): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.requisitionsUrl}/${id}/approve`, data));
  }

  async rejectRequisition(id: string, reason: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.requisitionsUrl}/${id}/reject?reason=${reason}`, {}));
  }

  // ── Inventory Insights ────────────────────────────────────────────
  async getLowStockAlerts(storeId: string): Promise<any[]> {
    return await firstValueFrom(this.http.get<any[]>(`${this.inventoryUrl}/low-stock/${storeId}`));
  }

  async getCrossStoreStock(variantId: string): Promise<any[]> {
    return await firstValueFrom(this.http.get<any[]>(`${this.inventoryUrl}/cross-store/${variantId}`));
  }
}
