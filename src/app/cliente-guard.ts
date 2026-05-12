import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const clienteGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (auth.isLoggedIn() && auth.getRol() === 'cliente') return true;
  return router.createUrlTree(['/login']);
};
