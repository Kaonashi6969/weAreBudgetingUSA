import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.html',
  styleUrl: './icon.scss'
})
export class IconComponent {
  @Input({ required: true }) name = '';
}
