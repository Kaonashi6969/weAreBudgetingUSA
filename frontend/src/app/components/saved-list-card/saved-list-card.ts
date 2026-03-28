import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { SavedList, SavedListItem } from '../../models/types';

@Component({
  selector: 'app-saved-list-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, IconComponent, RouterLink],
  templateUrl: './saved-list-card.html',
  styleUrl: './saved-list-card.scss',
})
export class SavedListCardComponent {
  @Input({ required: true }) list!: SavedList;
  @Input() currencySymbol = '$';
  @Input() untitledText = 'Untitled List';
  @Input() itemsText = 'Items';
  @Input() unknownStoreText = 'Unknown Store';
  @Input() openLinkText = 'Open';
  @Input() refreshText = 'Refresh';
  @Input() totalEstText = 'Total Est.';
  @Input() moreItemsText = 'more items';
  @Input() showLessText = 'Show Less';
  @Input() viewFullListText = 'View Full List';
  @Input() editText = 'Edit';
  @Input() saveText = 'Save';
  @Input() cancelText = 'Cancel';
  @Input() listNameText = 'List name';
  @Input() removeItemText = 'Remove item';
  @Input() addItemText = 'Add item';
  @Input() itemNamePlaceholder = 'Product name...';

  @Output() delete = new EventEmitter<number>();
  @Output() refresh = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ id: number; name: string; items: SavedListItem[] }>();

  isExpanded = false;
  isEditMode = signal(false);
  editedName = signal('');
  editedItems = signal<SavedListItem[]>([]);
  newItemName = signal('');
  newItemPrice = signal<number | ''>('');

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  enterEdit() {
    this.editedName.set(this.list.name || '');
    this.editedItems.set(this.list.items.map((i) => ({ ...i })));
    this.newItemName.set('');
    this.newItemPrice.set('');
    this.isExpanded = true;
    this.isEditMode.set(true);
  }

  cancelEdit() {
    this.isEditMode.set(false);
  }

  removeItem(index: number) {
    this.editedItems.update((items) => items.filter((_, i) => i !== index));
  }

  addItem() {
    const name = this.newItemName().trim();
    if (!name) return;
    const price = typeof this.newItemPrice() === 'number' ? (this.newItemPrice() as number) : 0;
    const newItem: SavedListItem = {
      id: `manual-${Date.now()}`,
      productName: name,
      price,
      store: '',
    };
    this.editedItems.update((items) => [...items, newItem]);
    this.newItemName.set('');
    this.newItemPrice.set('');
  }

  commitSave() {
    this.save.emit({ id: this.list.id, name: this.editedName(), items: this.editedItems() });
    this.isEditMode.set(false);
  }

  calculateTotal(items: SavedListItem[]): number {
    return items.reduce((acc, item) => acc + item.price, 0);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
