import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { hasClientRole } from './client-role';

// espace client : il faut etre connecte ET avoir le role client (meme regle que la navbar).
// Non connecte -> page de connexion ; connecte mais producteur -> accueil.
export const clientGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initAuthState().pipe(
    map(() => {
      const user = authService.currentUser();
      if (!user)
        return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });

      return hasClientRole(user.roles) ? true : router.createUrlTree(['/']);
    }),
  );
};
