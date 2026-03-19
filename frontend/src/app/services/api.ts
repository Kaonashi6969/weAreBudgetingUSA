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

  /** Returns stores available for the given region (defaults to 'us'). */
  getStores(region = 'us'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stores`, { params: { region } });
  }

  /** Returns all supported regions for the region selector. */
  getRegions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/regions`);
  }

  /** Calculates the cheapest basket, scoped to the user’s current region. */
  calculateBasket(items: string[], selectedStores: string[], region = 'us'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/basket`, { items, selectedStores, region });
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

  /** Persists the user’s preferred region on the server. */
  updateUserRegion(regionId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/auth/region`, { region: regionId });
  }
}
