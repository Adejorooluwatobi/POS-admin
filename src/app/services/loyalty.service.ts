import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LoyaltyLedgerEntry, LoyaltySettings } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private apiUrl = `${environment.apiUrl}/loyalty`;

  constructor(private http: HttpClient) {}

  async getCustomerLedger(customerId: string): Promise<LoyaltyLedgerEntry[]> {
    return await firstValueFrom(this.http.get<LoyaltyLedgerEntry[]>(`${this.apiUrl}/ledger/${customerId}`));
  }

  async getGlobalLedger(page: number = 1, size: number = 50): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/ledger`, { params }));
  }

  async getLoyaltyEntryById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/entry/${id}`));
  }

  async getLoyaltySettings(): Promise<LoyaltySettings> {
    return await firstValueFrom(this.http.get<LoyaltySettings>(`${this.apiUrl}/settings`));
  }

  async updateLoyaltySettings(dto: LoyaltySettings): Promise<LoyaltySettings> {
    return await firstValueFrom(this.http.put<LoyaltySettings>(`${this.apiUrl}/settings`, dto));
  }
}
