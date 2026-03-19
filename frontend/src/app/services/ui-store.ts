import { signal, computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService, Translation } from '@ngneat/transloco';

export enum NetworkStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
  SUCCESS = 'success'
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Region {
  id: string;
  name: string;
  currency: { code: string; symbol: string };
}

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
  readonly user = signal<any>(null);

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

  // Active region (defaults to USA until the API responds)
  readonly activeRegion = signal<Region>({
    id: 'us',
    name: 'United States',
    currency: { code: 'USD', symbol: '$' }
  });

  // Notifications
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  setStatus(status: NetworkStatus) {
    this._status.set(status);
  }

  setRegion(region: Region) {
    this.activeRegion.set(region);
    this.transloco.setActiveLang(region.id.toLowerCase());
  }

  showToast(message: string, type: ToastMessage['type'] = 'info') {
    const id = Date.now();
    this._toasts.update(t => [...t, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: number) {
    this._toasts.update(t => t.filter(toast => toast.id !== id));
  }
}

