import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Product } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/products';

  constructor(private http: HttpClient) {}

  async getProducts(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getProductById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async getProductByBarcode(barcode: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/barcode/${barcode}`));
  }

  async createProduct(product: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, product));
  }

  async updateProduct(id: string, product: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, product));
  }

  async deleteProduct(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
