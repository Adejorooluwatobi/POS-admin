import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { GiftCard } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GiftCardService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/gift-cards';

  constructor(private http: HttpClient) {}

  async getGiftCards(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getGiftCardById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async issueGiftCard(dto: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrl}/issue`, dto));
  }

  async redeemGiftCard(dto: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrl}/redeem`, dto));
  }
}
