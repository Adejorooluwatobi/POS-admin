import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LoyaltyLedgerEntry } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/loyalty';

  constructor(private http: HttpClient) {}

  async getCustomerLedger(customerId: string): Promise<LoyaltyLedgerEntry[]> {
    return await firstValueFrom(this.http.get<LoyaltyLedgerEntry[]>(`${this.apiUrl}/ledger/${customerId}`));
  }

  async getGlobalLedger(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/ledger`, { params }));
  }
}
