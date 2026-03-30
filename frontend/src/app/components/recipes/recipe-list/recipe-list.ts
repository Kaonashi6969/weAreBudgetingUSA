import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api';
import { UIStore } from '../../../services/ui-store';
import { Recipe } from '../../../models/types';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './recipe-list.html',
  styleUrl: './recipe-list.scss'
})
export class RecipeListComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  ui = inject(UIStore);
  recipes = signal<Recipe[]>([]);
  loading = signal(true);

  /** Reload recipes when the active region changes. */
  private regionEffect = effect(() => {
    const region = this.ui.activeRegion().id;
    this.loadRecipes(region);
  });

  private loadRecipes(region: string) {
    this.loading.set(true);
    this.api.getRecipes(region).subscribe({
      next: (data) => {
        this.recipes.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  viewRecipe(id: string) {
    this.router.navigate(['/recipes', id]);
  }
}