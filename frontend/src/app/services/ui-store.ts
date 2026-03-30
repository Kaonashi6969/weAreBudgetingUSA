import { signal, computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@ngneat/transloco';
import {
  NetworkStatus,
  ToastMessage,
  Region,
  User,
  BasketResult,
  ProductMatch,
} from '../models/types';

export type { ToastMessage, Region, User };
export { NetworkStatus };

/**
 * Global UI state: loading, toasts, current user, and active region.
 * Region state lives here so any component can read it without prop-drilling.
 */
@Injectable({ providedIn: 'root' })
export class UIStore {
  private transloco = inject(TranslocoService);

  // Global Loading State
  private _status = signal<NetworkStatus>(NetworkStatus.IDLE);
  readonly status = this._status.asReadonly();
  readonly isLoading = computed(() => this._status() === NetworkStatus.LOADING);

  // Global user state
  readonly user = signal<User | null>(null);

  // Translation signal from Transloco
  private _t = toSignal(this.transloco.selectTranslation());

  readonly translation = computed(() => {
    const val = this._t();
    if (!val || Object.keys(val).length === 0) {
      // Fallback to the current translation state while loading
      return this.transloco.getTranslation(this.transloco.getActiveLang()) || {};
    }
    return val;
  });

  // Active region (restored from localStorage, defaults to USA)
  readonly activeRegion = signal<Region>(UIStore._restoreRegion());

  // Dark mode — starts from OS preference, can be overridden manually
  private _darkMode = signal(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  readonly darkMode = this._darkMode.asReadonly();

  setDarkMode(value: boolean) {
    this._darkMode.set(value);
  }

  // ── Basket state (persists across navigation) ─────────────────────────────
  readonly basketItemsInput = signal<string>('');
  readonly basketSelectedStores = signal<string[]>([]);
  readonly basketResults = signal<BasketResult[]>([]);
  readonly basketSelectedItems = signal<Record<string, ProductMatch[]>>({});
  readonly basketDietaryFilters = signal<string[]>([]);

  setBasketItemsInput(v: string) {
    this.basketItemsInput.set(v);
  }
  setBasketSelectedStores(v: string[]) {
    this.basketSelectedStores.set(v);
  }
  setBasketResults(v: BasketResult[]) {
    this.basketResults.set(v);
  }
  toggleBasketDietaryFilter(filterId: string) {
    this.basketDietaryFilters.update((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
    );
  }
  setBasketSelectedItems(v: Record<string, ProductMatch[]>) {
    this.basketSelectedItems.set(v);
  }
  updateBasketSelectedItems(
    fn: (cur: Record<string, ProductMatch[]>) => Record<string, ProductMatch[]>,
  ) {
    this.basketSelectedItems.update(fn);
  }

  // Notifications
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  setStatus(status: NetworkStatus) {
    this._status.set(status);
  }

  setRegion(region: Region) {
    this.activeRegion.set(region);
    this.transloco.setActiveLang(region.id.toLowerCase());
    UIStore._persistRegion(region);
  }

  private static _defaultRegion: Region = {
    id: 'us',
    name: 'United States',
    currency: { code: 'USD', symbol: '$' },
  };

  private static _persistRegion(region: Region): void {
    try {
      localStorage.setItem('activeRegion', JSON.stringify(region));
    } catch { /* quota exceeded or SSR — ignore */ }
  }

  private static _restoreRegion(): Region {
    try {
      const raw = localStorage.getItem('activeRegion');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id && parsed?.currency?.code) return parsed as Region;
      }
    } catch { /* corrupted or SSR — ignore */ }
    return UIStore._defaultRegion;
  }

  translate(key: string, params: Record<string, unknown> = {}): string {
    return this.transloco.translate(key, params);
  }

  showToast(message: string, type: ToastMessage['type'] = 'info', duration = 4000) {
    const id = Date.now() + Math.random();
    this._toasts.update((t) => [...t.slice(-4), { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => this.removeToast(id), duration);
    }
  }

  removeToast(id: number) {
    this._toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
