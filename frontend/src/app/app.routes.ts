import { Routes } from '@angular/router';
import { BasketComponent } from './components/basket/basket';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: BasketComponent },
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
