import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { InventoryItem } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/inventory';

  constructor(private http: HttpClient) {}

  async getInventory(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getInventoryById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async createInventory(inventory: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, inventory));
  }

  async updateInventory(id: string, inventory: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, inventory));
  }
}
