import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon';
import { StoreSelectorComponent } from '../store-selector/store-selector';
import { Store } from '../../models/types';

@Component({
  selector: 'app-basket-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, StoreSelectorComponent],
  templateUrl: './basket-search.html',
  styleUrl: './basket-search.scss',
})
export class BasketSearchComponent {
  @Input() itemsInput = '';
  @Input() stores: Store[] = [];
  @Input() selectedStores: string[] = [];
  @Input() isLoading = false;
  @Input() translations: Record<string, string> = {};
  @Input() activeDietaryFilters: string[] = [];

  @Output() itemsInputChange = new EventEmitter<string>();
  @Output() storeToggled = new EventEmitter<string>();
  @Output() searchRequested = new EventEmitter<void>();
  @Output() exampleChipClicked = new EventEmitter<string>();
  @Output() clearRequested = new EventEmitter<void>();
  @Output() dietaryFilterToggled = new EventEmitter<string>();

  get examples(): string[] {
    const list = this.translations['example_chips_list'] || 'Milk,Eggs,Chicken,Bread';
    return list.split(',').map((s) => s.trim());
  }

  get dietaryFilters(): { id: string; label: string; icon: string }[] {
    return [
      { id: 'vegan', label: this.translations['filter_vegan'] || 'Vegan', icon: 'eco' },
      {
        id: 'gluten-free',
        label: this.translations['filter_gluten_free'] || 'Gluten Free',
        icon: 'cancel',
      },
      { id: 'keto', label: this.translations['filter_keto'] || 'Keto', icon: 'fitness_center' },
      { id: 'bio', label: this.translations['filter_bio'] || 'Bio / Organic', icon: 'spa' },
    ];
  }

  isFilterActive(id: string): boolean {
    return this.activeDietaryFilters.includes(id);
  }

  onDietaryToggle(id: string) {
    this.dietaryFilterToggled.emit(id);
  }

  onExampleClick(item: string) {
    this.itemsInputChange.emit(item);
    this.exampleChipClicked.emit(item);
  }

  onItemsInputChange(v: string) {
    this.itemsInputChange.emit(v);
  }

  onClear() {
    this.itemsInputChange.emit('');
  }

  onStoreToggled(storeId: string) {
    this.storeToggled.emit(storeId);
  }

  onSearch() {
    if (!this.isLoading && this.itemsInput.trim()) {
      this.searchRequested.emit();
    }
  }
}
