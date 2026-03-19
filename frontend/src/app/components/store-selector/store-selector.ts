import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-store-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-selector.html',
  styleUrl: './store-selector.scss'
})
export class StoreSelectorComponent {
  @Input({ required: true }) stores: any[] = [];
  @Input({ required: true }) selected: string[] = [];
  @Input() label = '';
  @Output() toggled = new EventEmitter<string>();
}
