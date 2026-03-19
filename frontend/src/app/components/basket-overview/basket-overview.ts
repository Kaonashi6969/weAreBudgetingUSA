import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon';
import { UpgradeBannerComponent } from '../upgrade-banner/upgrade-banner';

@Component({
  selector: 'app-basket-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, UpgradeBannerComponent, DecimalPipe],
  templateUrl: './basket-overview.html',
  styleUrl: './basket-overview.scss',
})
export class BasketOverviewComponent {
  @Input() listName = '';
  @Input() totalItemsCount = 0;
  @Input() resultsLength = 0;
  @Input() totalPrice = 0;
  @Input() currencySymbol = '$';
  @Input() missingItemsCount = 0;
  @Input() userTier: 'free' | 'pro' = 'free';
  @Input() isSaving = false;
  @Input() translations: any = {};

  @Output() listNameChange = new EventEmitter<string>();
  @Output() saveRequested = new EventEmitter<void>();

  onTitleChange(newName: string) {
    this.listNameChange.emit(newName);
  }

  onSave() {
    this.saveRequested.emit();
  }
}
