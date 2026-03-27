import { Component, ChangeDetectorRef, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api';
import { UIStore, NetworkStatus } from '../../services/ui-store';
import { ToastListComponent } from '../toast-list/toast-list';
import { IconComponent } from '../icon/icon';
import { BasketSearchComponent } from './basket-search';
import { ProductResultCardComponent } from '../product-result-card/product-result-card';
import { BasketOverviewComponent } from '../basket-overview/basket-overview';
import { Store, Region, ProductMatch } from '../../models/types';

@Component({
  selector: 'app-basket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastListComponent,
    IconComponent,
    BasketSearchComponent,
    ProductResultCardComponent,
    BasketOverviewComponent,
  ],
  templateUrl: './basket.html',
  styleUrl: './basket.scss',
})
export class BasketComponent implements OnInit {
  public ui = inject(UIStore);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  // Basket state delegated to UIStore so it survives navigation
  get itemsInput() {
    return this.ui.basketItemsInput;
  }
  get selectedStores() {
    return this.ui.basketSelectedStores;
  }
  get results() {
    return this.ui.basketResults;
  }
  get selectedItems() {
    return this.ui.basketSelectedItems;
  }

  stores = signal<Store[]>([]);
  regions = signal<Region[]>([]);

  // Track what was last searched (for display in results header)
  lastSearchQuery = signal('');

  // Auto-collapse cart when browsing search results
  cartCollapsed = signal(false);

  totalPrice = computed(() =>
    Object.values(this.selectedItems()).reduce(
      (acc, matches) =>
        acc + matches.reduce((sum, m) => sum + (m.price || 0) * (m.quantity || 1), 0),
      0.0,
    ),
  );

  isSaving = signal(false);
  listName = signal('');

  totalItemsCount = computed(() =>
    Object.values(this.selectedItems()).reduce(
      (acc, matches) => acc + matches.reduce((sum, m) => sum + (m.quantity || 1), 0),
      0,
    ),
  );

  /** Flat list of all cart items with their search term attached. */
  cartItems = computed(() =>
    Object.entries(this.selectedItems()).flatMap(([userInput, matches]) =>
      matches.map((match) => ({ ...match, userInput })),
    ),
  );

  // Expose UI states
  isLoading = computed(() => this.ui.isLoading());

  /** Currency symbol derived from the active region (e.g. '$', '£', '€'). */
  currencySymbol = computed(() => this.ui.activeRegion()?.currency?.symbol ?? '$');

  addExampleItem(item: string) {
    this.ui.setBasketItemsInput(item);
    this.calculate();
  }

  clearSearch() {
    this.ui.setBasketItemsInput('');
    this.ui.setBasketResults([]);
    this.lastSearchQuery.set('');
    this.cartCollapsed.set(false);
    this.cdr.detectChanges();
  }

  removeCartItem(userInput: string, matchId: string) {
    this.ui.updateBasketSelectedItems((current) => {
      const selections = (current[userInput] || []).filter((m) => m.id !== matchId);
      if (selections.length === 0) {
        const { [userInput]: _removed, ...rest } = current;
        void _removed;
        return rest;
      }
      return { ...current, [userInput]: selections };
    });
    this.cdr.detectChanges();
  }

  constructor() {
    this.loadRegions();
  }

  ngOnInit() {
    // Check for incoming search queries from Saved Lists
    this.route.queryParams.subscribe((params) => {
      const query = params['search'];
      if (query && query !== this.itemsInput()) {
        this.ui.setBasketItemsInput(query);
        // Automatically trigger calculation if a query is present
        // Shift to macro task to ensure stores and other state are ready
        setTimeout(() => {
          if (this.stores().length > 0) {
            this.calculate();
          } else {
            // Wait for stores to load if they aren't ready yet
            const timer = setInterval(() => {
              if (this.stores().length > 0) {
                this.calculate();
                clearInterval(timer);
              }
            }, 500);
          }
        }, 100);
      }
    });
  }

  // ── Region ──────────────────────────────────────────────────────────────────

  loadRegions() {
    this.api.getRegions().subscribe({
      next: (regions) => {
        this.regions.set(regions);
        // Set the active region from the API data to ensure consistency
        const current = this.ui.activeRegion();
        const matched = regions.find((r: Region) => r.id === current.id);
        if (matched) this.ui.setRegion(matched);
        this.loadStores();
        this.cdr.detectChanges();
      },
      error: () => {
        // Silently fall back — the default 'us' region is already set in ui-store
        this.loadStores();
      },
    });
  }

  changeRegion(regionId: string) {
    const region = this.regions().find((r: Region) => r.id === regionId);
    if (!region) return;
    this.ui.setRegion(region);
    this.ui.setBasketSelectedStores([]);
    this.ui.setBasketResults([]);
    this.ui.setBasketSelectedItems({});
    this.loadStores();

    // Persist the chosen region to the user’s profile
    this.api.updateUserRegion(regionId).subscribe({
      error: (err) => console.warn('Could not save region preference:', err.message),
    });

    this.cdr.detectChanges();
  }

  // ── Stores ──────────────────────────────────────────────────────────────────

  loadStores() {
    const regionId = this.ui.activeRegion().id;
    this.api.getStores(regionId).subscribe({
      next: (stores) => {
        this.stores.set(stores);
        this.cdr.detectChanges();
      },
      error: () => this.ui.showToast(this.ui.translate('failed_load_stores'), 'error'),
    });
  }

  toggleStore(storeId: string) {
    this.ui.setBasketSelectedStores(
      this.selectedStores().includes(storeId)
        ? this.selectedStores().filter((id) => id !== storeId)
        : [...this.selectedStores(), storeId],
    );
    this.cdr.detectChanges();
  }

  // ── Basket Calculation ───────────────────────────────────────────────────────

  calculate() {
    const query = this.itemsInput().trim();

    if (!query) {
      this.ui.showToast(this.ui.translate('enter_at_least_one'), 'warning');
      return;
    }

    this.lastSearchQuery.set(query);
    this.ui.setStatus(NetworkStatus.LOADING);
    // Don't clear previous results — they stay visible until the new ones arrive
    // Collapse cart so new results are immediately visible
    if (this.cartItems().length > 0) {
      this.cartCollapsed.set(true);
    }
    this.cdr.detectChanges();

    const regionId = this.ui.activeRegion().id;

    this.api.calculateBasket([query], this.selectedStores(), regionId).subscribe({
      next: (res) => {
        // Merge new results with existing ones (replace if same userInput, prepend otherwise)
        const existing = this.results().filter(
          (r) => !res.some((nr) => nr.userInput === r.userInput),
        );
        this.ui.setBasketResults([...res, ...existing]);
        // Don't clear selectedItems — cart persists across searches
        this.ui.setStatus(NetworkStatus.SUCCESS);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.ui.setStatus(NetworkStatus.ERROR);
        this.ui.showToast(this.ui.translate('failed_calculate'), 'error');
        this.cdr.detectChanges();
      },
    });
  }

  selectMatch(userInput: string, match: ProductMatch) {
    this.ui.updateBasketSelectedItems((current) => {
      const selections = current[userInput] || [];
      const index = selections.findIndex((m) => m.id === match.id);

      if (index > -1) {
        // If already selected, don't auto-increment on click
        // This prevents double-increment if the user clicks an already-selected (auto-highlighted) item
        return current;
      } else {
        // Add new selection
        return {
          ...current,
          [userInput]: [...selections, { ...match, quantity: 1 }],
        };
      }
    });
    this.cdr.detectChanges();
  }

  updateQuantity(userInput: string, matchId: string, delta: number) {
    this.ui.updateBasketSelectedItems((current) => {
      const selections = current[userInput] || [];
      const updated = selections
        .map((m) => {
          if (m.id === matchId) {
            const newQty = (m.quantity || 1) + delta;
            return newQty > 0 ? { ...m, quantity: newQty } : null;
          }
          return m;
        })
        .filter((m): m is ProductMatch => m !== null);

      return { ...current, [userInput]: updated };
    });
    this.cdr.detectChanges();
  }

  isSelected(userInput: string, matchId: string): boolean {
    return (this.selectedItems()[userInput] || []).some((m) => m.id === matchId);
  }

  // ── List Saving (PRO) ────────────────────────────────────────────────────────

  saveBasketToList() {
    if (!this.listName().trim()) {
      const name = prompt(
        'Give a name to your grocery list:',
        `My List ${new Date().toLocaleDateString()}`,
      );
      if (!name) return;
      this.listName.set(name);
    }

    const selected = Object.entries(this.selectedItems()).flatMap(([userInput, matches]) =>
      matches.map((match) => ({
        userInput,
        productName: match.name,
        price: match.price,
        store: match.store_name || match.store,
        url: match.url,
        id: match.id,
      })),
    );

    if (selected.length === 0) {
      this.ui.showToast(this.ui.translate('select_items_first'), 'warning');
      return;
    }

    this.isSaving.set(true);
    this.api.saveList(selected, this.listName()).subscribe({
      next: () => {
        this.ui.showToast(this.ui.translate('list_saved', { name: this.listName() }), 'success');
        this.isSaving.set(false);
        this.listName.set('');
        this.cdr.detectChanges();
      },
      error: () => {
        this.ui.showToast(this.ui.translate('login_to_save'), 'error');
        this.isSaving.set(false);
        this.cdr.detectChanges();
      },
    });
  }
}
