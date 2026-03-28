import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProductMatch,
  Store,
  Region,
  BasketResult,
  SavedList,
  User,
  SavedListItem,
} from '../models/types';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = '/api';
  private http = inject(HttpClient);

  getProducts(): Observable<ProductMatch[]> {
    return this.http.get<ProductMatch[]>(`${this.apiUrl}/products`);
  }

  /** Returns stores available for the given region (defaults to 'us'). */
  getStores(region = 'us'): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.apiUrl}/stores`, { params: { region } });
  }

  /** Returns all supported regions for the region selector. */
  getRegions(): Observable<Region[]> {
    return this.http.get<Region[]>(`${this.apiUrl}/regions`);
  }

  /** Calculates the cheapest basket, scoped to the user’s current region. */
  calculateBasket(
    items: string[],
    selectedStores: string[],
    region = 'us',
  ): Observable<BasketResult[]> {
    return this.http.post<BasketResult[]>(`${this.apiUrl}/basket`, {
      items,
      selectedStores,
      region,
    });
  }

  saveList(items: SavedListItem[], name: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/lists`, { items, name });
  }

  getSavedLists(): Observable<SavedList[]> {
    return this.http.get<SavedList[]>(`${this.apiUrl}/lists`);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  deleteList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/lists/${id}`);
  }

  updateList(id: number, name: string, items: SavedListItem[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/lists/${id}`, { name, items });
  }

  /** Persists the user’s preferred region on the server. */
  updateUserRegion(regionId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/auth/region`, { region: regionId });
  }
}
