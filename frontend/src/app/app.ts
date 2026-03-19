import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api';
import { UIStore } from './services/ui-store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public readonly title = signal('Budget Scraper');
  public readonly ui = inject(UIStore);
  private api = inject(ApiService);

  ngOnInit() {
    console.log('🔍 App initializing, fetching user...');
    this.api.getCurrentUser().subscribe({
      next: (userData) => {
        this.ui.user.set(userData);
        console.log('✅ Logged in as:', userData.email);

        // Restore the user’s saved region preference, then load the regions list
        if (userData.region) {
          this.api.getRegions().subscribe({
            next: (regions) => {
              const saved = regions.find((r: any) => r.id === userData.region);
              if (saved) this.ui.setRegion(saved);
            }
          });
        }
      },
      error: (err) => {
        console.error('❌ Error fetching user profile:', err);
        console.log('ℹ️ No active session found.');
      }
    });
  }
}
