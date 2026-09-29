import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initAuthState().pipe(
    map(() => {
      if (authService.isAuthenticated()) {
        router.navigate(['/']);
        return false;
      }

      return true;
    }),
  );
};
