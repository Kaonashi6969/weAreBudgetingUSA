import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products`);
  }

  getStores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stores`);
  }

  calculateBasket(items: string[], selectedStores: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/basket`, { items, selectedStores });
  }

  saveList(items: any[], name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lists`, { items, name });
  }

  getSavedLists(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lists`);
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`);
  }

  deleteList(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lists/${id}`);
  }
}
