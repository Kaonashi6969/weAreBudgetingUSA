import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UIStore } from '../services/ui-store';

export const authGuard: CanActivateFn = () => {
  const user = inject(UIStore).user();
  if (user) return true;
  inject(Router).navigate(['/']);
  return false;
};
