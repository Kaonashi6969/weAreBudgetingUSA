import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-region-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './region-selector.html',
  styleUrl: './region-selector.scss'
})
export class RegionSelectorComponent {
  @Input({ required: true }) regions: any[] = [];
  @Input({ required: true }) activeRegionId = '';
  @Input() sectionLabel = '';
  @Input() selectLabel = '';
  @Output() regionChanged = new EventEmitter<string>();
}
