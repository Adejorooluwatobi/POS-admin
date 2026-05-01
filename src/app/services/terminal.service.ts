import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Terminal } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TerminalService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/terminals';

  constructor(private http: HttpClient) {}

  async getTerminals(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getTerminalById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async createTerminal(terminal: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, terminal));
  }

  async updateTerminal(id: string, terminal: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, terminal));
  }

  async deleteTerminal(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
