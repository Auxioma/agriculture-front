import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

// * Seules Default (invité), Client et Producteur sont reprises ici
// * la variante Admin n'a pas pu être récupérée (timeout répété de l'API Figma) et les admins
// * n'utilisent de toute façon pas ce front public (back-office Symfony séparé, avec sa propre
// * connexion 2FA) : un compte ROLE_ADMIN qui se connecterait quand même ici verra la navigation
// * "client" par défaut (voir isProducer ci-dessous).
//
// mobile first (demande du client) : les classes sans prefix dans le html = version mobile de base,
// md:/lg: rajoutent le desktop par dessus. pas l'inverse.
//
// menu mobile (accordéon catégories) fait à partir d'une capture donnée par le client, fond vert
// pleine largeur sur chaque ligne + petit trait gris, aligné a gauche comme le reste du menu.
//
// menu déroulant catégories en desktop : même liste et meme style que la version mobile (pas eu
// le contenu figma exact pour celui-la, api figma plantait dessus). les autres menus avec une
// fleche (A propos, Mon compte, Demandes, etc) restent des liens simples pour l'instant, contenu
// pas connu.

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);
  mobileCategoriesOpen = signal(false);
  desktopCategoriesOpen = signal(false);

  // * L'authentification (AuthService, core/auth/*) - ce calcul de rôle
  // * reste donc local à la navbar plutôt que d'ajouter un `isProducer` sur AuthService. Voir NOTES.md
  // * pour la suggestion de le faire remonter là-bas si un autre écran en a besoin (garde de route, etc.)
  isProducer = computed(() => {
    const roles = this.authService.currentUser()?.roles ?? [];
    return roles.includes('ROLE_PRODUCER') || roles.includes('ROLE_PRODUCER_TEAM');
  });

  // liste reprise des fixtures symfony (CatalogFixtures.php), pas encore de vrai service catégorie
  // cote front donc a resynchro le jour ou ca bouge
  readonly categories = [
    'Fruits',
    'Légumes',
    'Produits laitiers',
    'Viandes & Volailles',
    'Miel & Produits de la ruche',
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.mobileCategoriesOpen.set(false);
  }

  toggleMobileCategories(): void {
    this.mobileCategoriesOpen.update((open) => !open);
  }

  toggleDesktopCategories(): void {
    this.desktopCategoriesOpen.update((open) => !open);
  }

  closeDesktopCategories(): void {
    this.desktopCategoriesOpen.set(false);
  }
}
