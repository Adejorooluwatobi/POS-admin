import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { GiftCard, GiftCardTransaction } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GiftCardService {
  private apiUrl = `${environment.apiUrl}/gift-cards`;

  constructor(private http: HttpClient) {}

  async getGiftCards(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getGiftCardById(id: string): Promise<GiftCard> {
    return await firstValueFrom(this.http.get<GiftCard>(`${this.apiUrl}/${id}`));
  }

  async getGiftCardByNumber(cardNumber: string): Promise<GiftCard> {
    return await firstValueFrom(this.http.get<GiftCard>(`${this.apiUrl}/by-number/${cardNumber}`));
  }

  async issueGiftCard(dto: any): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/issue`, dto));
  }

  async rechargeGiftCard(dto: {
    cardNumber: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    storeId?: string;
    notes?: string;
  }): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/recharge`, dto));
  }

  async transferBalance(dto: {
    sourceCardNumber: string;
    sourcePin?: string;
    destinationCardNumber: string;
    amount: number;
    notes?: string;
  }): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/transfer`, dto));
  }

  async linkCustomer(cardId: string, customerId: string): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/${cardId}/link-customer`, { customerId }));
  }

  async unlinkCustomer(cardId: string): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/${cardId}/unlink-customer`, {}));
  }

  async getCardTransactions(cardId: string): Promise<GiftCardTransaction[]> {
    return await firstValueFrom(this.http.get<GiftCardTransaction[]>(`${this.apiUrl}/${cardId}/transactions`));
  }

  async redeemGiftCard(dto: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrl}/redeem`, dto));
  }

  async updateGiftCard(id: string, dto: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, dto));
  }

  async setStatus(cardId: string, isActive: boolean, reason?: string): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/${cardId}/set-status`, { isActive, reason }));
  }

  async replaceLostCard(dto: {
    lostCardNumber: string;
    newCardNumber?: string;
    newCardPin?: string;
    activateNewCard?: boolean;
    reason?: string;
    verificationPin?: string;
    bypassVerification?: boolean;
    bypassReason?: string;
  }): Promise<GiftCard> {
    return await firstValueFrom(this.http.post<GiftCard>(`${this.apiUrl}/replace-lost`, dto));
  }

  async deleteGiftCard(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
