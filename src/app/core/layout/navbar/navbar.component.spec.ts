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
    expect(texts).toContain('Catégories');
    expect(texts).not.toContain('Messagerie');
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
});
