import { Routes } from '@angular/router';
import { BasketComponent } from './components/basket/basket';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: BasketComponent },
  {
    path: 'recipes',
    loadComponent: () => import('./components/recipes/recipe-list/recipe-list').then((m) => m.RecipeListComponent),
  },
  {
    path: 'recipes/:id',
    loadComponent: () => import('./components/recipes/recipe-detail/recipe-detail').then((m) => m.RecipeDetailComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'saved-lists',
    loadComponent: () =>
      import('./components/profile/saved-lists').then((m) => m.SavedListsComponent),
    canActivate: [authGuard],
  },
];
