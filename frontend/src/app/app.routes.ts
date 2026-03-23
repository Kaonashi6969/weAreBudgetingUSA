import { Routes } from '@angular/router';
import { BasketComponent } from './components/basket/basket';
import { ProfileComponent } from './components/profile/profile';
import { SavedListsComponent } from './components/profile/saved-lists';

export const routes: Routes = [
  { path: '', component: BasketComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'saved-lists', component: SavedListsComponent },
];
