import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { SavedList, SavedListItem } from '../../models/types';

@Component({
  selector: 'app-saved-list-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe, IconComponent, RouterLink],
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

  @Output() delete = new EventEmitter<number>();
  @Output() refresh = new EventEmitter<void>();

  isExpanded = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  calculateTotal(items: SavedListItem[]): number {
    return items.reduce((acc, item) => acc + item.price, 0);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
