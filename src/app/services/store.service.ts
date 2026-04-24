import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Store } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/stores';

  constructor(private http: HttpClient) {}

  async getStores(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getStoreById(id: string): Promise<Store> {
    return await firstValueFrom(this.http.get<Store>(`${this.apiUrl}/${id}`));
  }

  async createStore(store: Partial<Store>): Promise<Store> {
    return await firstValueFrom(this.http.post<Store>(this.apiUrl, store));
  }

  async updateStore(id: string, store: Partial<Store>): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, store));
  }

  async deleteStore(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
