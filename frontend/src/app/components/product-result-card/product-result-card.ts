import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, TitleCasePipe, DecimalPipe } from '@angular/common';
import { IconComponent } from '../icon/icon';
import { StoreLogoComponent } from '../store-logo/store-logo';
import { BasketResult, ProductMatch } from '../../models/types';

@Component({
  selector: 'app-product-result-card',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, DecimalPipe, IconComponent, StoreLogoComponent],
  templateUrl: './product-result-card.html',
  styleUrl: './product-result-card.scss',
})
export class ProductResultCardComponent {
  @Input({ required: true }) item!: BasketResult;
  @Input() selectedItems: Record<string, ProductMatch[]> = {};
  @Input() currencySymbol = '$';
  @Input() noMatchText = 'No match found';
  @Input() selectedText = 'Selected';
  @Input() selectThisText = 'Select this';
  @Input() initialDisplayLimit = 3;

  @Output() matchSelected = new EventEmitter<{ userInput: string; match: ProductMatch }>();
  @Output() quantityChanged = new EventEmitter<{ userInput: string; matchId: string; delta: number }>();

  isCollapsed = signal(false);
  displayLimit = signal(3);

  ngOnInit() {
    this.displayLimit.set(this.initialDisplayLimit);
  }

  loadMore(event: Event) {
    event.stopPropagation();
    this.displayLimit.update(n => n + 10);
  }

  canLoadMore(): boolean {
    return this.item.matches && this.item.matches.length > this.displayLimit();
  }

  select(match: ProductMatch) {
    this.matchSelected.emit({ userInput: this.item.userInput, match });
  }

  changeQuantity(event: Event, matchId: string, delta: number) {
    event.stopPropagation();
    this.quantityChanged.emit({ userInput: this.item.userInput, matchId, delta });
  }

  getQuantity(matchId: string): number {
    const match = (this.selectedItems[this.item.userInput] || []).find((m) => m.id === matchId);
    return match?.quantity || 0;
  }

  markAsDone(event: Event) {
    event.stopPropagation();
    this.isCollapsed.set(true);
  }

  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
  }

  isSelected(matchId: string): boolean {
    return (this.selectedItems[this.item.userInput] || []).some((m) => m.id === matchId);
  }

  getSelectedMatches(): ProductMatch[] {
    return this.selectedItems[this.item.userInput] || [];
  }

  hasSelections(): boolean {
    return this.getSelectedMatches().length > 0;
  }
}
