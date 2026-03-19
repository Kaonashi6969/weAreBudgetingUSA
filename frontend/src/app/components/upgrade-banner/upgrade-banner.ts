import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-upgrade-banner',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './upgrade-banner.html',
  styleUrl: './upgrade-banner.scss',
})
export class UpgradeBannerComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) ctaLabel = '';
  @Input() ctaUrl = '/upgrade';
}
