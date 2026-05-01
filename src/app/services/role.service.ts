import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Role } from '../models/pos.models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'https://pos-saas-cl9g.onrender.com/api/roles';

  constructor(private http: HttpClient) {}

  async getRoles(page: number = 1, size: number = 100): Promise<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return await firstValueFrom(this.http.get<any>(this.apiUrl, { params }));
  }

  async getRoleById(id: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async createRole(role: any): Promise<any> {
    return await firstValueFrom(this.http.post<any>(this.apiUrl, role));
  }

  async updateRole(id: string, role: any): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, role));
  }

  async deleteRole(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }
}
