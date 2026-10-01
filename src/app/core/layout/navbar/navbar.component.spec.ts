import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../auth/auth.service';
import type { CurrentUser } from '../../auth/auth.models';

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

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let authServiceMock: NavbarAuthServiceMock;

  function linkTexts(): string[] {
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    return Array.from(links).map((a) => a.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    authServiceMock = createNavbarAuthServiceMock();

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
  });

  it('devrait se créer', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
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

  it('devrait appeler authService.logout() au clic sur Déconnexion', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const logoutButton = Array.from(buttons).find((btn) => btn.textContent?.includes('Déconnexion'));
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

  it('ne devrait pas afficher la cloche de notifications pour un utilisateur connecté', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(makeCurrentUser(['ROLE_CLIENT']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[aria-label="Notifications"]')).toBeFalsy();
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

    expect(fixture.componentInstance.isFilterCategorySelected('Fruits')).toBe(false);

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const fruitsChip = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'Fruits');
    fruitsChip?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFilterCategorySelected('Fruits')).toBe(true);

    fruitsChip?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFilterCategorySelected('Fruits')).toBe(false);
  });
});
