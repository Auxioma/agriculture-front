import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { NotFoundComponent } from './not-found.component';

// * Pas le texte (fixe) : ce que la page fait en plus de s'afficher, et le fait qu'une adresse inconnue y mène.
describe('NotFoundComponent', () => {
  const robots = () =>
    document.head.querySelector('meta[name=robots]')?.getAttribute('content') ?? null;

  beforeEach(() => TestBed.resetTestingModule());

  it('annonce « Page introuvable » et se garde des moteurs de recherche', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    TestBed.createComponent(NotFoundComponent);

    expect(TestBed.inject(Title).getTitle()).toBe('Page introuvable – TrouveMoi Agri');
    expect(robots()).toBe('noindex');
  });

  it('rend le serveur répondre 404 quand il y en a un (rendu côté serveur)', () => {
    const response: { status?: number } = {};
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: response }],
    });

    TestBed.createComponent(NotFoundComponent);

    expect(response.status).toBe(404);
  });

  it('retire noindex en quittant la page : la suivante ne doit pas rester hors des moteurs', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFoundComponent);
    expect(robots()).toBe('noindex');

    fixture.destroy();

    expect(robots()).toBeNull();
    expect(TestBed.inject(Meta).getTag("name='robots'")).toBeNull();
  });

  it('est la page de toute adresse que le site ne connaît pas', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/une-adresse-fausse', NotFoundComponent);

    expect(page).toBeInstanceOf(NotFoundComponent);
    // une adresse fausse sous une section qui existe (ici /auth) y mène aussi
    expect(await harness.navigateByUrl('/auth/zzz', NotFoundComponent)).toBeInstanceOf(
      NotFoundComponent,
    );
  });
});
