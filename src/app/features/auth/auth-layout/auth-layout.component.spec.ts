import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthLayoutComponent } from './auth-layout.component';
import { AuthRoleService } from '../auth-role.service';

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authRoleService: AuthRoleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [{ provide: AuthRoleService, useClass: AuthRoleService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    authRoleService = TestBed.inject(AuthRoleService);

    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(component).toBeTruthy();
  });

  it('devrait afficher "Espace client" par défaut', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(title.textContent).toContain('Espace client');
  });

  it('devrait afficher "Espace producteur" après sélection du rôle producteur', () => {
    authRoleService.selectRole('producer');
    fixture.detectChanges();

    const title: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(title.textContent).toContain('Espace producteur');
  });

  it('devrait appeler selectRole("producer") au clic sur le bouton Producteur', () => {
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.role-tabs button');
    const producerButton = Array.from(buttons).find(
      (btn) => btn.textContent?.trim() === 'Producteur',
    );

    producerButton?.click();
    fixture.detectChanges();

    expect(authRoleService.role()).toBe('producer');
  });

  it('devrait appeler selectRole("client") au clic sur le bouton Client', () => {
    authRoleService.selectRole('producer'); // état initial différent, pour vérifier un vrai changement
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.role-tabs button');
    const clientButton = Array.from(buttons).find((btn) => btn.textContent?.trim() === 'Client');

    clientButton?.click();
    fixture.detectChanges();

    expect(authRoleService.role()).toBe('client');
  });

  it('devrait afficher les liens de navigation vers login et register', () => {
    const links: NodeListOf<HTMLAnchorElement> =
      fixture.nativeElement.querySelectorAll('.auth-toggle a');
    const hrefs = Array.from(links).map((a) => a.getAttribute('routerLink'));

    expect(hrefs).toContain('login');
    expect(hrefs).toContain('register');
  });
});
