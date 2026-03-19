import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIStore } from '../../services/ui-store';

@Component({
  selector: 'app-toast-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-list.html',
  styleUrl: './toast-list.scss'
})
export class ToastListComponent {
  ui = inject(UIStore);
}
