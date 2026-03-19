import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, TitleCasePipe, DecimalPipe } from '@angular/common';
import { IconComponent } from '../icon/icon';
import { BasketResult, ProductMatch } from '../../models/types';

@Component({
  selector: 'app-product-result-card',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, DecimalPipe, IconComponent],
  templateUrl: './product-result-card.html',
  styleUrl: './product-result-card.scss',
})
export class ProductResultCardComponent {
  @Input({ required: true }) item!: BasketResult;
  @Input() selectedItems: Record<string, ProductMatch> = {};
  @Input() currencySymbol = '$';
  @Input() noMatchText = 'No match found';
  @Input() selectedText = 'Selected';
  @Input() selectThisText = 'Select this';

  @Output() matchSelected = new EventEmitter<{ userInput: string; match: ProductMatch }>();

  select(match: ProductMatch) {
    this.matchSelected.emit({ userInput: this.item.userInput, match });
  }

  isSelected(matchId: string): boolean {
    return this.selectedItems[this.item.userInput]?.id === matchId;
  }
}
