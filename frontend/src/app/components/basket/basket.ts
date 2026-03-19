import { Component, ChangeDetectorRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { uiStore, NetworkStatus } from '../../services/ui-store';

@Component({
  selector: 'app-basket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './basket.html',
  styleUrl: './basket.css'
})
export class BasketComponent {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  // Use Signals for performance and reactivity
  itemsInput = signal('');
  selectedStores = signal<string[]>([]);
  stores = signal<any[]>([]);
  results = signal<any[]>([]);
  
  // Calculate final totals and selected items logic
  selectedItems = signal<Record<string, any>>({}); // Map: userInput -> selected match

  totalPrice = computed(() => {
    return Object.values(this.selectedItems()).reduce((acc, item) => acc + (item.price || 0), 0.0);
  });

  isSaving = signal(false);
  listName = signal(''); // Store the custom name for saving

  totalItemsCount = computed(() => Object.keys(this.selectedItems()).length);
  missingItemsCount = computed(() => this.results().length - this.totalItemsCount());

  // Expose UI states
  ui = uiStore;
  isLoading = computed(() => this.ui.isLoading());

  constructor() {
    this.loadStores();
  }

  selectMatch(userInput: string, match: any) {
    this.selectedItems.update(current => ({
      ...current,
      [userInput]: match
    }));
    this.cdr.detectChanges();
  }

  isSelected(userInput: string, matchId: string): boolean {
    return this.selectedItems()[userInput]?.id === matchId;
  }

  loadStores() {
    this.api.getStores().subscribe({
      next: (stores) => {
        this.stores.set(stores);
        this.cdr.detectChanges();
      },
      error: () => this.ui.showToast('Failed to load stores', 'error')
    });
  }

  toggleStore(storeId: string) {
    this.selectedStores.update(current => {
      const idx = current.indexOf(storeId);
      if (idx > -1) return current.filter(id => id !== storeId);
      return [...current, storeId];
    });
    this.cdr.detectChanges();
  }

  calculate() {
    const items = this.itemsInput().split('\n').filter(i => i.trim());
    
    if (items.length === 0) {
      this.ui.showToast('Please enter at least one product name', 'warning');
      return;
    }

    this.ui.setStatus(NetworkStatus.LOADING);
    this.results.set([]);
    this.cdr.detectChanges();

    this.api.calculateBasket(items, this.selectedStores()).subscribe({
      next: (res) => {
        this.results.set(res);
        // Automatically select the cheapest match for each item
        const bestChoices: Record<string, any> = {};
        res.forEach((item: any) => {
          if (item.matches && item.matches.length > 0) {
            // They are already sorted by score/price by backend, so [0] is often best
            bestChoices[item.userInput] = item.matches[0];
          }
        });
        this.selectedItems.set(bestChoices);

        this.ui.setStatus(NetworkStatus.SUCCESS);
        this.ui.showToast(`Found ${res.length} items for your basket!`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.ui.setStatus(NetworkStatus.ERROR);
        this.ui.showToast('Failed to calculate basket. Please try again.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  saveBasketToList() {
    // If list name is empty, prompt user or use default
    if (!this.listName().trim()) {
      const name = prompt('Give a name to your grocery list:', `My List ${new Date().toLocaleDateString()}`);
      if (!name) return; // User cancelled
      this.listName.set(name);
    }

    const selected = Object.entries(this.selectedItems()).map(([userInput, match]) => ({
      userInput,
      productName: match.name,
      price: match.price,
      store: match.store_name || match.store,
      url: match.url,
      id: match.id
    }));

    if (selected.length === 0) {
      this.ui.showToast('Please select items first', 'warning');
      return;
    }

    this.isSaving.set(true);
    // Send both name and items to backend
    this.api.saveList(selected, this.listName()).subscribe({
      next: () => {
        this.ui.showToast(`'${this.listName()}' saved to your profile!`, 'success');
        this.isSaving.set(false);
        this.listName.set(''); // Reset name after saving
        this.cdr.detectChanges();
      },
      error: () => {
        this.ui.showToast('Please login to save lists', 'error');
        this.isSaving.set(false);
        this.cdr.detectChanges();
      }
    });
  }
}

