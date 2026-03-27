import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UIStore } from '../../services/ui-store';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-bottom-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './bottom-tabs.html',
  styleUrl: './bottom-tabs.scss',
})
export class BottomTabsComponent {
  ui = inject(UIStore);
}
