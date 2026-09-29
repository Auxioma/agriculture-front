import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

// * Seules Default (invité), Client et Producteur sont reprises ici
// * la variante Admin n'a pas pu être récupérée (timeout répété de l'API Figma) et les admins
// * n'utilisent de toute façon pas ce front public (back-office Symfony séparé, avec sa propre
// * connexion 2FA) : un compte ROLE_ADMIN qui se connecterait quand même ici verra la navigation
// * "client" par défaut (voir isProducer ci-dessous).

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);

  // * L'authentification (AuthService, core/auth/*) - ce calcul de rôle
  // * reste donc local à la navbar plutôt que d'ajouter un `isProducer` sur AuthService. Voir NOTES.md
  // * pour la suggestion de le faire remonter là-bas si un autre écran en a besoin (garde de route, etc.)
  isProducer = computed(() => {
    const roles = this.authService.currentUser()?.roles ?? [];
    return roles.includes('ROLE_PRODUCER') || roles.includes('ROLE_PRODUCER_TEAM');
  });
}
