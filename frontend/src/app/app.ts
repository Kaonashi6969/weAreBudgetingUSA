import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api';
import { uiStore } from './services/ui-store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public readonly title = signal('Budget Scraper');
  public readonly ui = uiStore;
  private api = inject(ApiService);

  ngOnInit() {
    console.log('🔍 App initializing, fetching user...');
    this.api.getCurrentUser().subscribe({
      next: (userData) => {
        this.ui.user.set(userData);
        console.log('✅ Logged in as:', userData.email);
      },
      error: (err) => {
        console.error('❌ Error fetching user profile:', err);
        console.log('ℹ️ No active session found.');
      }
    });
  }
}
