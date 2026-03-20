import { Component, ChangeDetectorRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { UIStore, NetworkStatus } from '../../services/ui-store';
import { ToastListComponent } from '../toast-list/toast-list';
import { IconComponent } from '../icon/icon';
import { BasketSearchComponent } from './basket-search';
import { ProductResultCardComponent } from '../product-result-card/product-result-card';
import { BasketOverviewComponent } from '../basket-overview/basket-overview';
import { Store, Region, BasketResult, ProductMatch } from '../../models/types';

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
export class BasketComponent {
  public ui = inject(UIStore);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  // Use Signals for performance and reactivity
  itemsInput = signal('');
  selectedStores = signal<string[]>([]);
  stores = signal<Store[]>([]);
  regions = signal<Region[]>([]);
  results = signal<BasketResult[]>([]);

  // Map: userInput -> selected matches (array for multiple selection)
  selectedItems = signal<Record<string, ProductMatch[]>>({});

  // Pagination state
  displayLimit = signal(3);
  canLoadMore = computed(() => this.results().some((res) => res.matches.length > this.displayLimit()));
  visibleResults = computed(() => this.results().slice(0, this.displayLimit()));

  totalPrice = computed(() =>
    Object.values(this.selectedItems()).reduce(
      (acc, matches) => acc + matches.reduce((sum, m) => sum + (m.price || 0) * (m.quantity || 1), 0),
      0.0,
    ),
  );

  isSaving = signal(false);
  listName = signal('');

  totalItemsCount = computed(() => 
    Object.values(this.selectedItems()).reduce((acc, matches) => acc + matches.reduce((sum, m) => sum + (m.quantity || 1), 0), 0)
  );
  missingItemsCount = computed(() => this.results().length - this.totalItemsCount());

  // Expose UI states
  isLoading = computed(() => this.ui.isLoading());

  /** Currency symbol derived from the active region (e.g. '$', '£', '€'). */
  currencySymbol = computed(() => this.ui.activeRegion()?.currency?.symbol ?? '$');

  addExampleItem(item: string) {
    const current = this.itemsInput();
    const newVal = current ? (current.endsWith('\n') ? current + item : current + '\n' + item) : item;
    this.itemsInput.set(newVal);
  }

  constructor() {
    this.loadRegions();
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
    this.selectedStores.set([]);
    this.results.set([]);
    this.selectedItems.set({});
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
      error: () => this.ui.showToast('Failed to load stores', 'error'),
    });
  }

  toggleStore(storeId: string) {
    this.selectedStores.update((current) => {
      const idx = current.indexOf(storeId);
      if (idx > -1) return current.filter((id) => id !== storeId);
      return [...current, storeId];
    });
    this.cdr.detectChanges();
  }

  // ── Basket Calculation ───────────────────────────────────────────────────────

  calculate() {
    const items = this.itemsInput()
      .split('\n')
      .filter((i) => i.trim());

    if (items.length === 0) {
      this.ui.showToast('Please enter at least one product name', 'warning');
      return;
    }

    this.ui.setStatus(NetworkStatus.LOADING);
    this.results.set([]);
    this.cdr.detectChanges();

    const regionId = this.ui.activeRegion().id;

    this.api.calculateBasket(items, this.selectedStores(), regionId).subscribe({
      next: (res) => {
        this.results.set(res);
        // Auto-select the best match per row
        const initialSelections: Record<string, ProductMatch[]> = {};
        res.forEach((item: BasketResult) => {
          if (item.matches?.length > 0) {
            initialSelections[item.userInput] = [item.matches[0]];
          }
        });
        this.selectedItems.set(initialSelections);
        this.displayLimit.set(3);
        this.ui.setStatus(NetworkStatus.SUCCESS);
        this.ui.showToast(`Found ${res.length} items for your basket!`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.ui.setStatus(NetworkStatus.ERROR);
        this.ui.showToast('Failed to calculate basket. Please try again.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  loadMore() {
    this.displayLimit.update((n) => n + 10);
    this.cdr.detectChanges();
  }

  selectMatch(userInput: string, match: ProductMatch) {
    this.selectedItems.update((current) => {
      const selections = current[userInput] || [];
      const index = selections.findIndex((m) => m.id === match.id);

      if (index > -1) {
        // Increment quantity if already selected
        const updatedSelections = [...selections];
        updatedSelections[index] = {
          ...updatedSelections[index],
          quantity: (updatedSelections[index].quantity || 1) + 1,
        };
        return { ...current, [userInput]: updatedSelections };
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
    this.selectedItems.update((current) => {
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
      matches.map(match => ({
        userInput,
        productName: match.name,
        price: match.price,
        store: match.store_name || match.store,
        url: match.url,
        id: match.id,
      }))
    );

    if (selected.length === 0) {
      this.ui.showToast('Please select items first', 'warning');
      return;
    }

    this.isSaving.set(true);
    this.api.saveList(selected, this.listName()).subscribe({
      next: () => {
        this.ui.showToast(`'${this.listName()}' saved to your profile!`, 'success');
        this.isSaving.set(false);
        this.listName.set('');
        this.cdr.detectChanges();
      },
      error: () => {
        this.ui.showToast('Please login to save lists', 'error');
        this.isSaving.set(false);
        this.cdr.detectChanges();
      },
    });
  }
}
