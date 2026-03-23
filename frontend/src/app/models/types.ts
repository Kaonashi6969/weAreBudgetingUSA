export interface Currency {
  code: string;
  symbol: string;
}

export interface Region {
  id: string;
  name: string;
  currency: Currency;
}

export interface Store {
  id: string;
  name: string;
  region?: string;
}

export enum NetworkStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  tier: 'free' | 'pro';
  region?: string;
}

export interface ProductMatch {
  id: string;
  name: string;
  price: number;
  store: string;
  store_name?: string;
  url: string;
  image_url?: string;
  score?: number;
  quantity?: number;
}

export interface BasketResult {
  userInput: string;
  matches: ProductMatch[];
}

export interface SavedListItem {
  id: string;
  productName: string;
  price: number;
  store: string;
  url?: string;
}

export interface SavedList {
  id: number;
  name: string;
  items: SavedListItem[];
  created_at: string;
  user_id: number;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
