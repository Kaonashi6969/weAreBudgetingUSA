import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
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
  @Input() itemsInput: string = '';
  @Input() stores: Store[] = [];
  @Input() selectedStores: string[] = [];
  @Input() isLoading: boolean = false;
  @Input() translations: any = {};

  @Output() itemsInputChange = new EventEmitter<string>();
  @Output() storeToggled = new EventEmitter<string>();
  @Output() searchRequested = new EventEmitter<void>();
  @Output() exampleChipClicked = new EventEmitter<string>();

  onItemsInputChange(value: string) {
    this.itemsInputChange.emit(value);
  }

  onExampleClick(item: string) {
    this.exampleChipClicked.emit(item);
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
