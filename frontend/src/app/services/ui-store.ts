import { signal, computed } from '@angular/core';

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

/**
 * Global UI state management for loadings, notifications, and user status
 */
export class UIStore {
  // Global Loading State
  private _status = signal<NetworkStatus>(NetworkStatus.IDLE);
  readonly status = this._status.asReadonly();
  readonly isLoading = computed(() => this._status() === NetworkStatus.LOADING);

  // Global user state (Moved here to avoid circular dependency)
  readonly user = signal<any>(null);

  // Notifications
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  setStatus(status: NetworkStatus) {
    this._status.set(status);
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

// Export singleton instance
export const uiStore = new UIStore();
