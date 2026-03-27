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

  @Output() itemsInputChange = new EventEmitter<string>();
  @Output() storeToggled = new EventEmitter<string>();
  @Output() searchRequested = new EventEmitter<void>();
  @Output() exampleChipClicked = new EventEmitter<string>();
  @Output() clearRequested = new EventEmitter<void>();

  get examples(): string[] {
    const list = this.translations['example_chips_list'] || 'Milk,Eggs,Chicken,Bread';
    return list.split(',').map((s) => s.trim());
  }

  onItemsInputChange(value: string) {
    this.itemsInputChange.emit(value);
  }

  onExampleClick(item: string) {
    this.itemsInputChange.emit(item);
    this.exampleChipClicked.emit(item);
  }

  onClear() {
    this.itemsInputChange.emit('');
    this.clearRequested.emit();
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
