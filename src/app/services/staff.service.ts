import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Staff } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/staff';

  constructor(private http: HttpClient) {}

  async getStaff(page: number = 1, size: number = 20): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getStaffById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async createStaff(staff: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, staff));
  }

  async updateStaff(id: string, staff: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, staff));
  }

  async deleteStaff(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
