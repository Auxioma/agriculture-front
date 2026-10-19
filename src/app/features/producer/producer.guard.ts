import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { hasProducerRole } from './producer-role';

// espace producteur : il faut etre connecte ET avoir le role producteur (meme regle que la navbar).
// Non connecte -> page de connexion ; connecte mais client -> accueil.
export const producerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initAuthState().pipe(
    map(() => {
      const user = authService.currentUser();
      if (!user) return router.createUrlTree(['/auth/login']);

      return hasProducerRole(user.roles) ? true : router.createUrlTree(['/']);
    }),
  );
};
