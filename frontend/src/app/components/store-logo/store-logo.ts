import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-store-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="store-logo-container" [class]="storeId().toLowerCase()">
      @if (hasLogo()) {
        <img [src]="logoUrl()" [alt]="storeId()" class="store-logo-img" />
      } @else {
        <span class="store-initial">{{ storeInitial() }}</span>
      }
    </div>
  `,
  styles: [`
    .store-logo-container {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #f7fafc;
      border: 1px solid #edf2f7;
      flex-shrink: 0;
    }

    .store-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 2px;
    }

    .store-initial {
      font-weight: bold;
      font-size: 14px;
      color: #4a5568;
      text-transform: uppercase;
    }

    /* Store Specific Styles */
    .walmart { background: #0071ce; border-color: #0071ce; }
    .kroger { background: #003da5; border-color: #003da5; }
    .instacart { background: #ff8200; border-color: #ff8200; }
  `]
})
export class StoreLogoComponent {
  storeId = input.required<string>();
  
  // Hardcoded list of supported logos for now
  private supportedLogos = ['walmart', 'kroger', 'instacart'];

  hasLogo = computed(() => {
    return this.supportedLogos.includes(this.storeId().toLowerCase());
  });

  logoUrl = computed(() => {
    return `assets/logos/${this.storeId().toLowerCase()}.svg`;
  });

  storeInitial = computed(() => {
    return this.storeId().charAt(0);
  });
}
