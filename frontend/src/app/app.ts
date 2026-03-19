import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from './services/api';
import { UIStore } from './services/ui-store';
import { User } from './models/types';
import { HeaderComponent } from './components/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  public ui = inject(UIStore);
  private api = inject(ApiService);

  ngOnInit() {
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
