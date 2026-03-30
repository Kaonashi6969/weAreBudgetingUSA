import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api';
import { UIStore } from '../../../services/ui-store';
import { Recipe, RecipePriceInfo } from '../../../models/types';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss'
})
export class RecipeDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  ui = inject(UIStore);
  private router = inject(Router);

  recipe = signal<Recipe | null>(null);
  priceInfo = signal<RecipePriceInfo | null>(null);
  loading = signal(true);
  error = signal(false);

  /** Re-fetch prices when the region changes. Safe in constructor (injection context). */
  private regionEffect = effect(() => {
    const regionId = this.ui.activeRegion().id;
    const currentRecipe = this.recipe();
    if (currentRecipe) {
      this.fetchPriceInfo(currentRecipe.id);
    }
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.api.getRecipeById(id).subscribe({
      next: (data) => this.recipe.set(data),
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  fetchPriceInfo(id: string) {
    this.api.getRecipePriceInfo(id, this.ui.activeRegion().id).subscribe({
      next: (data) => {
        this.priceInfo.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  addToBasket() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;

    const ingredientString = currentRecipe.ingredients
      .map(ing => typeof ing === 'object' ? ing.name : ing)
      .join('\n');
    this.ui.setBasketItemsInput(ingredientString);
    this.router.navigate(['/']);
  }
}