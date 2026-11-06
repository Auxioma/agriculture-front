import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { CatalogService } from '../../../features/catalog/services/catalog.service';
import { Category } from '../../../features/catalog/models/category.model';
import { hasProducerRole } from '../../../features/producer/producer-role';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
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
// panneau filtres (semblable au figma) : produit (chips), localisation, date, bouton rechercher --
// pas de vraie recherche branchee, juste le visuel + la selection des chips.

type MenuId = 'categories' | 'about';

// format commun des items du template #dropdown ; isAll = lien mis en avant ("Voir toutes...")
interface MenuLink {
  label: string;
  path: string;
  isAll?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, NotificationBellComponent],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);
  private catalog = inject(CatalogService);
  private router = inject(Router);

  mobileMenuOpen = signal(false);
  openMenu = signal<MenuId | null>(null);
  filtersOpen = signal(false);
  // ids des catégories cochées dans le panneau de filtres
  selectedFilterCategories = signal<string[]>([]);
  // ce qui est tapé dans la recherche (desktop et mobile partagent les mêmes valeurs) et dans « Localisation » du panneau de filtres
  searchText = signal('');
  searchLocation = signal('');

  // * Le rôle reste calculé ici plutôt que sur AuthService voir NOTES.md.
  isProducer = computed(() => hasProducerRole(this.authService.currentUser()?.roles ?? []));

  // 5 catégories les plus populaires (GET /api/categories?sort=popular&limit=5).
  // En cas d'erreur API on affiche une liste vide : la navbar ne doit jamais casser.
  readonly popularCategories = toSignal(
    this.catalog.getPopularCategories().pipe(catchError(() => of([] as Category[]))),
    { initialValue: [] },
  );

  // items du dropdown "Catégories" : les populaires + un lien vers la page /categories
  readonly categoryLinks = computed<MenuLink[]>(() => [
    ...this.popularCategories().map((c) => ({
      label: c.name,
      path: c.slug ? `/categories/${c.slug}` : '/categories',
    })),
    { label: 'Voir toutes les catégories', path: '/categories', isAll: true },
  ]);

  // codes cgu/mentions-legales/confidentialite repris du docblock de LegalController.php (route
  // GET /api/legal/{code}), pas inventes. "Qui sommes-nous" => page /about (faite), les pages legales pas encore
  readonly aboutLinks: MenuLink[] = [
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

  // une seule catégorie à la fois : la recherche (back et page de résultats) n'en filtre qu'une
  toggleFilterCategory(categoryId: string): void {
    this.selectedFilterCategories.update((selected) =>
      selected.includes(categoryId) ? [] : [categoryId],
    );
  }

  // mène à la page de résultats (/producers) avec ce qui est renseigné ; un champ vide n'ajoute rien à l'adresse
  search(): void {
    this.router.navigate(['/producers'], {
      queryParams: {
        q: this.searchText().trim() || null,
        near: this.searchLocation().trim() || null,
        categoryId: this.selectedFilterCategories()[0] ?? null,
      },
    });
    this.closeMobileMenu();
  }

  isFilterCategorySelected(categoryId: string): boolean {
    return this.selectedFilterCategories().includes(categoryId);
  }
}
