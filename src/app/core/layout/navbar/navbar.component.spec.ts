import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../auth/auth.service';
import type { CurrentUser } from '../../auth/auth.models';
import { CatalogService } from '../../../features/catalog/services/catalog.service';
import { makeCategory } from '../../../features/catalog/testing/catalog.fixtures';
import { NotificationsService } from '../../notifications/notifications.service';

// * Mock local, volontairement séparé de core/auth/auth.service.mock.ts :

type NavbarAuthServiceMock = Pick<AuthService, 'isAuthenticated' | 'currentUser' | 'logout'> & {
  isAuthenticated: ReturnType<typeof vi.fn<AuthService['isAuthenticated']>>;
  currentUser: ReturnType<typeof vi.fn<AuthService['currentUser']>>;
  logout: ReturnType<typeof vi.fn<AuthService['logout']>>;
};

function createNavbarAuthServiceMock(): NavbarAuthServiceMock {
  return {
    isAuthenticated: vi.fn(),
    currentUser: vi.fn(),
    logout: vi.fn(),
  };
}

function makeCurrentUser(roles: string[]): CurrentUser {
  return { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User', roles };
}

// catégories populaires renvoyées par le mock de CatalogService (ids utilisés par les chips des filtres)
const POPULAR_CATEGORIES = [
  makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' }),
  makeCategory({ id: 'c2', name: 'Légumes', slug: 'legumes' }),
  makeCategory({ id: 'c3', name: 'Miel & Produits de la ruche', slug: 'miel' }),
];

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let authServiceMock: NavbarAuthServiceMock;
  let catalogServiceMock: { getPopularCategories: ReturnType<typeof vi.fn> };
  let notificationsMock: { latest: ReturnType<typeof vi.fn>; changes$: typeof NEVER };

  function linkTexts(): string[] {
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    return Array.from(links).map((a) => a.textContent?.trim() ?? '');
  }

  function hrefOf(text: string): string | null {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    return links.find((a) => a.textContent?.trim() === text)?.getAttribute('href') ?? null;
  }

  // menu mobile fermé : un seul bouton "Catégories" dans le dom (le desktop)
  function openDesktopCategoriesDropdown(): void {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const toggle = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'Catégories');
    toggle?.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    authServiceMock = createNavbarAuthServiceMock();
    catalogServiceMock = { getPopularCategories: vi.fn(() => of(POPULAR_CATEGORIES)) };
    notificationsMock = { latest: vi.fn(() => of([])), changes$: NEVER };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: CatalogService, useValue: catalogServiceMock },
        { provide: NotificationsService, useValue: notificationsMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
  });

  it('devrait se créer', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('demande les catégories populaires au service à la création', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    expect(catalogServiceMock.getPopularCategories).toHaveBeenCalled();
  });

  it('devrait afficher la navigation invité (Connexion/Inscription) sans être connecté', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    const texts = linkTexts();
    expect(texts).toContain('Connexion');
    expect(texts).toContain('Inscription');
    expect(texts).not.toContain('Messagerie');

    // "Catégories" est un bouton (dropdown) maintenant, plus un lien
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    expect(Array.from(buttons).some((btn) => btn.textContent?.trim() === 'Catégories')).toBe(true);
  });

  it('devrait afficher la navigation client une fois connecté (sans le rôle producteur)', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    const texts = linkTexts();
    expect(texts).toContain('Mes annonces');
    expect(texts).toContain('Mon compte');
    expect(texts).not.toContain('Connexion');
    expect(texts).not.toContain('Mon exploitation');
  });

  // pas de page 404 : un lien vers une route qui n'existe pas donne une page vide
  it("devrait envoyer le client vers les pages de son espace, pas vers des routes qui n'existent pas", () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    expect(hrefOf('Mes annonces')).toBe('/client/requests');
    expect(hrefOf('Messagerie')).toBe('/client/messages');
  });

  // comme « Mon exploitation » pour le producteur : un bouton doré vers son espace, pas un lien du menu
  it('devrait afficher un seul bouton "Mon compte" doré pour le client, qui mène à son espace', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    const links = (Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[]).filter(
      (a) => a.textContent?.trim() === 'Mon compte',
    );

    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/client');
    expect(links[0].classList).toContain('bg-gold-wheat');
  });

  it("n'affiche pas « Mon compte » à un producteur ni à un visiteur", () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER']));
    fixture.detectChanges();
    expect(linkTexts()).not.toContain('Mon compte');

    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();
    expect(linkTexts()).not.toContain('Mon compte');
  });

  it('devrait agrandir le texte des champs de recherche (desktop et mobile) pour qu on voie ce que l on écrit', () => {
    fixture.componentInstance.mobileMenuOpen.set(true);
    fixture.detectChanges();

    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input[type="search"]')) as HTMLInputElement[];

    expect(inputs.length).toBe(2);
    inputs.forEach((input) => {
      expect(input.classList).toContain('text-base');
      expect(input.classList).not.toContain('text-sm');
    });
  });

  it('devrait afficher la navigation producteur si le rôle ROLE_PRODUCER est présent', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER']));
    fixture.detectChanges();

    const texts = linkTexts();
    expect(texts).toContain('Demandes');
    expect(texts).toContain('Mon exploitation');
    expect(texts).toContain('Mes devis');
    expect(texts).not.toContain('Mes annonces');
  });

  it('devrait aussi afficher la navigation producteur pour un compte ROLE_PRODUCER_TEAM', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER_TEAM']));
    fixture.detectChanges();

    expect(linkTexts()).toContain('Mon exploitation');
  });

  it('devrait afficher un seul bouton "Mon exploitation" doré, qui mène à /producer', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER']));
    fixture.detectChanges();

    const links = (Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[]).filter(
      (a) => a.textContent?.trim() === 'Mon exploitation',
    );

    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/producer');
    expect(links[0].classList).toContain('bg-gold-wheat');
  });

  it('devrait envoyer le producteur voir les annonces dans son espace (/producer/requests)', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER']));
    fixture.detectChanges();

    expect(hrefOf('Voir les annonces')).toBe('/producer/requests');
  });

  it('devrait appeler authService.logout() au clic sur Déconnexion', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const logoutButton = Array.from(buttons).find((btn) =>
      btn.textContent?.includes('Déconnexion'),
    );
    logoutButton?.click();

    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('devrait ouvrir puis fermer le panneau mobile au clic sur le bouton burger', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);

    const burger: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Menu"]',
    );
    burger.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(true);

    burger.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
  });

  it('devrait déplier la liste des catégories dans le menu mobile au clic, et la refermer avec le menu', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Menu"]').click();
    fixture.detectChanges();

    expect(linkTexts()).not.toContain('Fruits');

    // il y a aussi un bouton "Catégories" pour le dropdown desktop dans le dom (juste caché en
    // css) : on cherche celui du panneau mobile precisement, pas le premier trouvé
    const mobilePanel: HTMLElement = fixture.nativeElement.querySelector('#mobile-panel');
    const buttons: NodeListOf<HTMLButtonElement> = mobilePanel.querySelectorAll('button');
    const categoriesToggle = Array.from(buttons).find(
      (btn) => btn.textContent?.trim() === 'Catégories',
    );
    categoriesToggle?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen('categories')).toBe(true);
    const texts = linkTexts();
    expect(texts).toContain('Fruits');
    expect(texts).toContain('Miel & Produits de la ruche');
    expect(texts).toContain('Voir toutes les catégories');

    fixture.componentInstance.closeMobileMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.isMenuOpen('categories')).toBe(false);
  });

  it('devrait déplier le menu déroulant catégories en desktop au clic', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    // menu mobile pas ouvert ici, donc un seul bouton "Catégories" dans le dom (le desktop)
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const categoriesToggle = Array.from(buttons).find(
      (btn) => btn.textContent?.trim() === 'Catégories',
    );
    categoriesToggle?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen('categories')).toBe(true);
    expect(linkTexts()).toContain('Fruits');
  });

  it('devrait lier chaque catégorie à sa page et ajouter un lien vers /categories dans le dropdown', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    openDesktopCategoriesDropdown();

    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('ul a');
    const hrefByLabel = new Map(
      Array.from(links).map((a) => [a.textContent?.trim(), a.getAttribute('href')]),
    );

    expect(hrefByLabel.get('Fruits')).toBe('/categories/fruits');
    expect(hrefByLabel.get('Miel & Produits de la ruche')).toBe('/categories/miel');
    expect(hrefByLabel.get('Voir toutes les catégories')).toBe('/categories');
  });

  it('devrait afficher le lien "Voir toutes les catégories" en dernier dans le dropdown', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    const links = fixture.componentInstance.categoryLinks();

    expect(links.length).toBe(POPULAR_CATEGORIES.length + 1);
    expect(links[links.length - 1]).toEqual({
      label: 'Voir toutes les catégories',
      path: '/categories',
      isAll: true,
    });
  });

  it("devrait renvoyer vers /categories quand une catégorie n'a pas de slug", () => {
    catalogServiceMock.getPopularCategories.mockReturnValue(
      of([makeCategory({ id: 'c9', name: 'Sans slug', slug: null })]),
    );
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);

    // le composant lit le service dans son constructeur : on en recrée un avec le nouveau mock
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    openDesktopCategoriesDropdown();

    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('ul a');
    const sansSlug = Array.from(links).find((a) => a.textContent?.trim() === 'Sans slug');
    expect(sansSlug?.getAttribute('href')).toBe('/categories');
  });

  it('devrait garder le dropdown utilisable avec le seul lien "Voir toutes" quand l\'API échoue', () => {
    catalogServiceMock.getPopularCategories.mockReturnValue(throwError(() => new Error('boom')));
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);

    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    openDesktopCategoriesDropdown();

    const texts = linkTexts();
    expect(texts).toContain('Voir toutes les catégories');
    expect(texts).not.toContain('Fruits');
  });

  it('devrait déplier le menu déroulant "A propos" en desktop au clic', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    // menu mobile pas ouvert ici, donc un seul bouton "A propos" dans le dom (le desktop)
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const aboutToggle = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'A propos');
    aboutToggle?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen('about')).toBe(true);
    const texts = linkTexts();
    expect(texts).toContain('CGU');
    expect(texts).toContain('Mentions légales');
    expect(texts).toContain('Confidentialité');
  });

  it('devrait déplier l\'accordéon "A propos" dans le menu mobile au clic', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Menu"]').click();
    fixture.detectChanges();

    const mobilePanel: HTMLElement = fixture.nativeElement.querySelector('#mobile-panel');
    const buttons: NodeListOf<HTMLButtonElement> = mobilePanel.querySelectorAll('button');
    const aboutToggle = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'A propos');
    aboutToggle?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen('about')).toBe(true);
    expect(linkTexts()).toContain('Qui sommes-nous');
  });

  it('devrait afficher la cloche de notifications pour un invité', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[aria-label="Notifications"]')).toBeTruthy();
  });

  it('devrait remplacer le lien de la cloche par la cloche à card pour un utilisateur connecté', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[aria-label="Notifications"]')).toBeFalsy();
    // * une seule cloche, la meme en mobile et en desktop (sinon deux lectures du back et deux cards)
    expect(fixture.nativeElement.querySelectorAll('app-notification-bell')).toHaveLength(1);
    expect(notificationsMock.latest).toHaveBeenCalledTimes(1);
  });

  it('devrait afficher la même cloche à un producteur', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_PRODUCER']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-notification-bell')).toHaveLength(1);
  });

  it('ne devrait rien demander au back pour un invité', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-notification-bell')).toBeNull();
    expect(notificationsMock.latest).not.toHaveBeenCalled();
  });

  it('devrait ouvrir la card des notifications au clic sur la cloche d\'un utilisateur connecté', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('app-notification-bell button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#notification-card')).toBeTruthy();
  });

  it('devrait ouvrir le panneau filtres au clic et afficher produit/localisation/date', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();

    // menu mobile pas ouvert, donc un seul bouton "Filtres" dans le dom (le desktop)
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const filtresToggle = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'Filtres');
    filtresToggle?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filtersOpen()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Produit');
    expect(text).toContain('Localisation');
    expect(text).toContain('Date de publication');
  });

  it('devrait selectionner/deselectionner une categorie dans le panneau filtres', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();
    fixture.componentInstance.toggleFilters();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFilterCategorySelected('c1')).toBe(false);

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const fruitsChip = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'Fruits');
    fruitsChip?.click();
    fixture.detectChanges();

    // les chips mémorisent l'id de la catégorie, pas son nom
    expect(fixture.componentInstance.isFilterCategorySelected('c1')).toBe(true);
    expect(fixture.componentInstance.isFilterCategorySelected('Fruits')).toBe(false);

    fruitsChip?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFilterCategorySelected('c1')).toBe(false);
  });

  describe('recherche', () => {
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      authServiceMock.currentUser.mockReturnValue(null);
      navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fixture.detectChanges();
    });

    const type = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const desktopForm = () => fixture.nativeElement.querySelector('form[role="search"]') as HTMLFormElement;
    const desktopInput = () => desktopForm().querySelector('input[type="search"]') as HTMLInputElement;

    it('mène à la page de résultats avec le texte cherché', () => {
      type(desktopInput(), '  tomates  ');

      desktopForm().dispatchEvent(new Event('submit'));

      expect(navigate).toHaveBeenCalledWith(['/producers'], { queryParams: { q: 'tomates', near: null, categoryId: null } });
    });

    it("n'ajoute rien à l'adresse quand les champs sont vides", () => {
      desktopForm().dispatchEvent(new Event('submit'));

      expect(navigate).toHaveBeenCalledWith(['/producers'], { queryParams: { q: null, near: null, categoryId: null } });
    });

    it('ajoute la localisation et la catégorie choisies dans le panneau de filtres', () => {
      type(desktopInput(), 'miel');
      fixture.componentInstance.toggleFilters();
      fixture.detectChanges();
      const place = fixture.nativeElement.querySelector('input[placeholder="Bordeaux"]') as HTMLInputElement;
      type(place, 'Avignon');
      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === 'Fruits')!.click();
      fixture.detectChanges();

      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).filter((b) => b.textContent?.trim() === 'Rechercher').pop()!.click();

      expect(navigate).toHaveBeenCalledWith(['/producers'], { queryParams: { q: 'miel', near: 'Avignon', categoryId: 'c1' } });
    });

    it("ne garde qu'une catégorie : en cocher une autre remplace la première", () => {
      fixture.componentInstance.toggleFilterCategory('c1');
      fixture.componentInstance.toggleFilterCategory('c2');

      expect(fixture.componentInstance.selectedFilterCategories()).toEqual(['c2']);
    });

    it('referme le panneau de filtres et le menu mobile une fois la recherche lancée', () => {
      fixture.componentInstance.mobileMenuOpen.set(true);
      fixture.componentInstance.filtersOpen.set(true);

      fixture.componentInstance.search();

      expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
      expect(fixture.componentInstance.filtersOpen()).toBe(false);
    });

    it('la recherche du menu mobile se lance avec Entrée et partage le texte du champ desktop', () => {
      fixture.componentInstance.mobileMenuOpen.set(true);
      fixture.detectChanges();
      const mobile = fixture.nativeElement.querySelector('#mobile-panel input[type="search"]') as HTMLInputElement;

      type(mobile, 'pommes');
      mobile.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(navigate).toHaveBeenCalledWith(['/producers'], expect.objectContaining({ queryParams: expect.objectContaining({ q: 'pommes' }) }));
      expect(desktopInput().value).toBe('pommes');
    });
  });
});
