import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from './services/api';
import { UIStore } from './services/ui-store';
import { Region, User } from './models/types';
import { HeaderComponent } from './components/header/header';
import { BottomTabsComponent } from './components/bottom-tabs/bottom-tabs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, BottomTabsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  public ui = inject(UIStore);
  private api = inject(ApiService);

  constructor() {
    // Reactively apply data-theme to <html> whenever darkMode signal changes
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.ui.darkMode() ? 'dark' : 'light');
    });
  }

  ngOnInit() {
    // Listen to OS-level dark mode changes at runtime (e.g. user switches in Settings)
    if (typeof window !== 'undefined') {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkQuery.addEventListener('change', (e) => this.ui.setDarkMode(e.matches));
    }

    // Load full region data from API so currency info is available on every page
    this.api.getRegions().subscribe({
      next: (regions: Region[]) => {
        const current = this.ui.activeRegion();
        const matched = regions.find((r: Region) => r.id === current.id);
        if (matched) this.ui.setRegion(matched);
      },
      error: () => { /* fall back to localStorage / default region */ },
    });

    this.api.getCurrentUser().subscribe({
      next: (user: User) => {
        this.ui.user.set(user);
        if (user.region) {
          // If the user profile has a region preference, load the full region data
          this.api.getRegions().subscribe({
            next: (regions: Region[]) => {
              const matched = regions.find((r: Region) => r.id === user.region);
              if (matched) this.ui.setRegion(matched);
            },
          });
        }
      },
      error: () => this.ui.user.set(null),
    });
  }
}
