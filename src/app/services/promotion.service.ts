import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Promotion } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/promotions';

  constructor(private http: HttpClient) {}

  async getPromotions(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getPromotionById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async createPromotion(promotion: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, promotion));
  }

  async updatePromotion(id: string, promotion: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, promotion));
  }

  async deletePromotion(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
