import { Routes } from '@angular/router';
import { BasketComponent } from './components/basket/basket';
import { ProfileComponent } from './components/profile/profile';

export const routes: Routes = [
  { path: '', component: BasketComponent },
  { path: 'profile', component: ProfileComponent },
];
