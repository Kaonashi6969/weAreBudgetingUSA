import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-product-result-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './product-result-card.html',
  styleUrl: './product-result-card.scss'
})
export class ProductResultCardComponent {
  @Input({ required: true }) item: any;
  @Input({ required: true }) selectedItems: Record<string, any> = {};
  @Input({ required: true }) currencySymbol = '$';
  @Input() noMatchText = 'Could not find this item.';
  @Input() selectedText = 'Selected';
  @Input() selectThisText = 'Select this';
  @Output() matchSelected = new EventEmitter<{ userInput: string; match: any }>();

  isSelected(matchId: string): boolean {
    return this.selectedItems[this.item.userInput]?.id === matchId;
  }

  select(match: any) {
    this.matchSelected.emit({ userInput: this.item.userInput, match });
  }
}
