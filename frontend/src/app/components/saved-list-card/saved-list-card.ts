import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-saved-list-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './saved-list-card.html',
  styleUrl: './saved-list-card.scss'
})
export class SavedListCardComponent {
  @Input({ required: true }) list: any;
  @Input({ required: true }) currencySymbol = '$';
  @Input() untitledText = 'Untitled List';
  @Input() itemsText = 'Items';
  @Input() unknownStoreText = 'Unknown';
  @Input() openLinkText = 'Open';
  @Input() refreshText = 'Refresh';
  @Output() delete = new EventEmitter<number>();
  @Output() refresh = new EventEmitter<void>();

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  calculateTotal(items: any[]): number {
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }
}
