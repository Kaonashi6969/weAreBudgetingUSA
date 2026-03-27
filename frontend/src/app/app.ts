import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from './services/api';
import { UIStore } from './services/ui-store';
import { User } from './models/types';
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

    this.api.getCurrentUser().subscribe({
      next: (user: User) => {
        this.ui.user.set(user);
        if (user.region) {
          const regionId = user.region;
          this.ui.activeRegion.update((current) => ({ ...current, id: regionId }));
        }
      },
      error: () => this.ui.user.set(null),
    });
  }
}
