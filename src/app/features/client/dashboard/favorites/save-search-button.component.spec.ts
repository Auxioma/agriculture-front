import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { SaveSearchButtonComponent } from './save-search-button.component';
import { SavedSearchService } from './saved-search.service';

type Inputs = {
  text?: string;
  place?: string;
  categoryId?: string | null;
  productId?: string | null;
};

describe('SaveSearchButtonComponent', () => {
  let fixture: ComponentFixture<SaveSearchButtonComponent>;
  let el: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;
  const authMock = { isAuthenticated: vi.fn() };
  const serviceMock = { create: vi.fn() };

  function setup(inputs: Inputs = {}): void {
    fixture = TestBed.createComponent(SaveSearchButtonComponent);
    el = fixture.nativeElement;
    setInputs(inputs);
  }

  function setInputs(inputs: Inputs): void {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  const startButton = () =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Enregistrer cette recherche'),
    );
  const nameInput = () => el.querySelector<HTMLInputElement>('#saved-search-name');
  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type=submit]');

  function type(value: string): void {
    const input = nameInput()!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /** Connecté, ouvre le formulaire pour la recherche donnée */
  function openForm(inputs: Inputs): void {
    setup(inputs);
    startButton()!.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authMock.isAuthenticated.mockReset().mockReturnValue(true);
    serviceMock.create.mockReset().mockReturnValue(of({ id: 'search-1' }));

    TestBed.configureTestingModule({
      imports: [SaveSearchButtonComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: SavedSearchService, useValue: serviceMock },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it("n'affiche rien quand il n'y a aucun critère à enregistrer", () => {
    setup();

    expect(startButton()).toBeUndefined();
    expect(el.textContent?.trim()).toBe('');
  });

  it.each([
    ['le texte', { text: 'tomates' }],
    ['le lieu', { place: 'Lyon' }],
    ['la catégorie', { categoryId: 'cat-1' }],
    ['le produit', { productId: 'prod-1' }],
  ] as [string, Inputs][])('propose le bouton dès que %s est renseigné', (_label, inputs) => {
    setup(inputs);

    expect(startButton()).toBeDefined();
  });

  it("non connecté : mène à la connexion, avec l'adresse de la recherche pour y revenir", () => {
    authMock.isAuthenticated.mockReturnValue(false);
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/producers?q=miel');
    setup({ text: 'miel' });

    startButton()!.click();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/producers?q=miel' },
    });
    expect(nameInput()).toBeNull();
  });

  it('connecté : ouvre le formulaire avec le texte et le lieu comme nom proposé', () => {
    openForm({ text: 'tomates', place: 'Lyon' });

    expect(nameInput()!.value).toBe('tomates, Lyon');
    expect(startButton()).toBeUndefined();
  });

  it('sans texte ni lieu, le nom est à saisir : Enregistrer reste désactivé tant qu’il est vide', () => {
    openForm({ categoryId: 'cat-1' });

    expect(nameInput()!.value).toBe('');
    expect(submitButton()!.disabled).toBe(true);

    type('Fruits de saison');

    expect(submitButton()!.disabled).toBe(false);
  });

  it('enregistre avec le nom saisi et seulement les critères renseignés', () => {
    openForm({ text: 'miel', place: '', categoryId: 'cat-1' });

    type('  Miel bio  ');
    submit();

    expect(serviceMock.create).toHaveBeenCalledWith('Miel bio', { q: 'miel', categoryId: 'cat-1' });
    expect(el.textContent).toContain('Recherche enregistrée');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/client/favorites');
    expect(nameInput()).toBeNull();
  });

  it("n'enregistre pas avec un nom vide", () => {
    openForm({ productId: 'prod-1' });

    type('   ');
    submit();

    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it("n'envoie la recherche qu'une fois tant que la réponse n'est pas arrivée", () => {
    serviceMock.create.mockReturnValue(NEVER);
    openForm({ text: 'miel' });

    submit();
    submit();

    expect(serviceMock.create).toHaveBeenCalledTimes(1);
    expect(submitButton()!.disabled).toBe(true);
  });

  it('en cas d’erreur du serveur : le dit, et garde le formulaire pour réessayer', () => {
    serviceMock.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    openForm({ text: 'miel' });

    submit();

    expect(el.querySelector('[role=alert]')?.textContent).toContain("Impossible d'enregistrer");
    expect(nameInput()).not.toBeNull();
    expect(submitButton()!.disabled).toBe(false);
  });

  it('session expirée (401) : repasse par la connexion, sans message d’erreur', () => {
    serviceMock.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    openForm({ text: 'miel' });

    submit();

    expect(navigate).toHaveBeenCalledWith(['/auth/login'], expect.anything());
    expect(el.querySelector('[role=alert]')).toBeNull();
  });

  it('Annuler referme le formulaire sans rien enregistrer', () => {
    openForm({ text: 'miel' });

    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Annuler'))!
      .click();
    fixture.detectChanges();

    expect(nameInput()).toBeNull();
    expect(startButton()).toBeDefined();
    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it('une nouvelle recherche (adresse qui change) efface la confirmation et repropose le bouton', () => {
    openForm({ text: 'miel' });
    submit();
    expect(el.textContent).toContain('Recherche enregistrée');

    setInputs({ text: 'pommes' });

    expect(el.textContent).not.toContain('Recherche enregistrée');
    expect(startButton()).toBeDefined();
  });
});
