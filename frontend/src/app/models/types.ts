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
  brand?: string;
  dietary_tags?: string | string[];
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

export interface RecipeIngredient {
  name: string;
  qty: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  category?: string;
  region?: string;
  servings?: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
}

export interface ProportionalInfo {
  recipeCost: number;
  packagesNeeded: number;
  usageRatio: number;
  packageSize: number;
  packageUnit: string;
}

export interface RecipeIngredientEstimate {
  name: string;
  searchName?: string;
  qty?: number | null;
  unit?: string | null;
  avgPrice: number | null;
  bestPrice?: number;
  bestStore?: string;
  url?: string | null;
  status: 'found' | 'not_found';
  proportional?: ProportionalInfo | null;
}

export interface StoreTotal {
  id: string;
  name: string;
  total: number;
  itemsFound: number;
}

export interface RecipePriceInfo {
  recipeId: string;
  name: string;
  ingredientCount: number;
  averageTotal: number;
  cheapestStore: StoreTotal | null;
  ingredients: RecipeIngredientEstimate[];
  allStoreTotals: StoreTotal[];
}
