import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

// * Seules Default (invité), Client et Producteur sont reprises ici -! pas la variante Admin
// * (les admins n'utilisent pas ce front public de toute facon).
//
// mobile first : classes sans prefix = mobile de base, md:/lg: ajoutent le
// desktop par dessus.
//
// "Catégories" et "A propos" partagent le meme mecanisme de menu deroulant/accordeon
// (voir openMenu + le template #dropdown dans le html). Les autres fleches (Mon compte, Demandes,
// etc) restent des liens simples
//
// panneau filtres (capture client) : produit (chips), localisation, date, bouton rechercher --
// pas de vraie recherche branchee, juste le visuel + la selection des chips.

type MenuId = 'categories' | 'about';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);
  openMenu = signal<MenuId | null>(null);
  filtersOpen = signal(false);
  selectedFilterCategories = signal<string[]>([]);

  // * Le rôle reste calculé ici plutôt que sur AuthService voir NOTES.md.
  isProducer = computed(() => {
    const roles = this.authService.currentUser()?.roles ?? [];
    return roles.includes('ROLE_PRODUCER') || roles.includes('ROLE_PRODUCER_TEAM');
  });

  // catégories = fixtures symfony (CatalogFixtures.php) ; categoryLinks = memes chips, format
  // reutilisable par le template #dropdown (label + destination)
  readonly categories = [
    'Fruits',
    'Légumes',
    'Produits laitiers',
    'Viandes & Volailles',
    'Miel & Produits de la ruche',
  ];
  readonly categoryLinks = this.categories.map((label) => ({ label, path: '/categories' }));

  // codes cgu/mentions-legales/confidentialite repris du docblock de LegalController.php (route
  // GET /api/legal/{code}), pas inventes. "Qui sommes-nous" reste une supposition, pas de route confirmee
  readonly aboutLinks = [
    { label: 'Qui sommes-nous', path: '/about' },
    { label: 'CGU', path: '/legal/cgu' },
    { label: 'Mentions légales', path: '/legal/mentions-legales' },
    { label: 'Confidentialité', path: '/legal/confidentialite' },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.openMenu.set(null);
    this.filtersOpen.set(false);
  }

  toggleMenu(menu: MenuId): void {
    this.openMenu.update((open) => (open === menu ? null : menu));
  }

  isMenuOpen(menu: MenuId): boolean {
    return this.openMenu() === menu;
  }

  closeMenu(): void {
    this.openMenu.set(null);
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  toggleFilterCategory(category: string): void {
    this.selectedFilterCategories.update((selected) =>
      selected.includes(category) ? selected.filter((c) => c !== category) : [...selected, category],
    );
  }

  isFilterCategorySelected(category: string): boolean {
    return this.selectedFilterCategories().includes(category);
  }
}
