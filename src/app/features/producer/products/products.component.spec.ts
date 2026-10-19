import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsComponent } from './products.component';
import { CatalogCategory, CatalogProduct, ProducerProduct, ProductsService } from './products.service';

const KG = { code: 'kg', label: 'Kilogramme' };
const UNITE = { code: 'unite', label: 'Unité' };

const TOMATES: ProducerProduct = {
  id: 'pp1',
  productId: 'p-tomates',
  name: 'Tomates',
  variety: 'Cœur de bœuf',
  description: 'Plein champ',
  estimatedVolume: '90.000',
  defaultPrice: '3.50',
  currencyCode: 'EUR',
  isActive: true,
  unit: KG,
  seasonStartMonth: 6,
  seasonEndMonth: 9,
};
const POMMES_DE_TERRE: ProducerProduct = {
  id: 'pp2',
  productId: 'p-pdt',
  name: 'Pommes de terre',
  variety: 'Charlotte',
  description: null,
  estimatedVolume: '200.000',
  defaultPrice: '0.90',
  currencyCode: 'EUR',
  isActive: true,
  unit: KG,
  seasonStartMonth: null,
  seasonEndMonth: null,
};
const MIEL: ProducerProduct = {
  id: 'pp3',
  productId: 'p-miel',
  name: 'Miel de fleurs',
  variety: null,
  description: null,
  estimatedVolume: '30.000',
  defaultPrice: '8.00',
  currencyCode: 'EUR',
  isActive: false,
  unit: UNITE,
  seasonStartMonth: 5,
  seasonEndMonth: 10,
};

const CATALOG: CatalogProduct[] = [
  { id: 'p-tomates', name: 'Tomates', categoryId: 'c-legumes', unit: KG },
  { id: 'p-pdt', name: 'Pommes de terre', categoryId: 'c-legumes', unit: KG },
  { id: 'p-carottes', name: 'Carottes', categoryId: 'c-legumes', unit: KG },
  { id: 'p-pommes', name: 'Pommes', categoryId: 'c-fruits', unit: KG },
  { id: 'p-miel', name: 'Miel de fleurs', categoryId: 'c-miel', unit: UNITE },
  // sa categorie n'est pas dans la liste (desactivee) : rangé dans « Autres » plutot que perdu
  { id: 'p-poulet', name: 'Poulet fermier', categoryId: 'c-inconnue', unit: null },
];
const CATEGORIES: CatalogCategory[] = [
  { id: 'c-fruits', name: 'Fruits' },
  { id: 'c-legumes', name: 'Légumes' },
  { id: 'c-miel', name: 'Miel & Produits de la ruche' },
];

const httpError = (status: number, body: unknown) => throwError(() => new HttpErrorResponse({ status, error: body }));

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let compiled: HTMLElement;
  let serviceMock: Record<'getProducts' | 'getCatalog' | 'getCategories' | 'create' | 'update' | 'remove', ReturnType<typeof vi.fn>>;

  async function create(products$: Observable<ProducerProduct[]> = of([TOMATES, POMMES_DE_TERRE, MIEL])): Promise<void> {
    serviceMock = {
      getProducts: vi.fn(() => products$),
      getCatalog: vi.fn(() => of(CATALOG)),
      getCategories: vi.fn(() => of(CATEGORIES)),
      create: vi.fn(() => of({ id: 'new' })),
      update: vi.fn(() => of(null)),
      remove: vi.fn(() => of(null)),
    };
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [provideRouter([]), { provide: ProductsService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  // [titre, detail] de chaque produit (deux lignes l'une sous l'autre)
  const rows = () =>
    [...compiled.querySelectorAll('ul > li')].map((li) =>
      [...li.querySelectorAll('button:first-child span')].map((span) => span.textContent?.replace(/\s+/g, ' ').trim()),
    );
  const switchOf = (name: string) => compiled.querySelector<HTMLButtonElement>(`[role="switch"][aria-label="Proposer ${name}"]`)!;
  const rowButton = (name: string) => [...compiled.querySelectorAll<HTMLButtonElement>('ul > li > button:not([role="switch"])')].find((b) => b.textContent?.includes(name))!;
  const dialog = () => compiled.querySelector<HTMLElement>('[role="dialog"]');
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  const click = (element: HTMLElement) => {
    element.click();
    fixture.detectChanges();
  };
  const type = (id: string, value: string) => {
    const field = compiled.querySelector<HTMLInputElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const pick = (selector: string, value: string) => {
    const select = compiled.querySelector<HTMLSelectElement>(selector)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  // la categorie d'abord, puis le produit : « choose('p-carottes') » fait les deux
  const choose = (productId: string) => {
    const categoryId = CATALOG.find((p) => p.id === productId)!.categoryId;
    pick('#category', categoryId === 'c-inconnue' ? 'others' : categoryId);
    pick('#product', productId);
  };
  const optionsOf = (selector: string) => [...compiled.querySelectorAll(`${selector} option`)].map((o) => o.textContent?.trim());
  const available = () => compiled.querySelector<HTMLButtonElement>('#available')!;
  const field = (id: string) => compiled.querySelector<HTMLInputElement>(`#${id}`)!.value;

  beforeEach(() => TestBed.resetTestingModule());

  it('liste les produits avec la saison, le volume et le prix, comme le figma', async () => {
    await create();

    expect(serviceMock.getProducts).toHaveBeenCalled();
    expect(rows()).toEqual([
      ['Tomates · Cœur de bœuf', 'Juin-Sept · 90 kg · 3,50 €/kg'],
      ['Pommes de terre · Charlotte', "Toute l'année · 200 kg · 0,90 €/kg"],
      ['Miel de fleurs', 'Mai-Oct · 30 unités · 8,00 €/unité'],
    ]);
  });

  it('le titre, le retour au tableau de bord et ce que fait l\'interrupteur', async () => {
    await create();

    expect(compiled.querySelector('h1')?.textContent).toContain('Produits et disponibilités');
    expect(compiled.querySelector('header a')?.getAttribute('href')).toBe('/producer');
    expect(text()).toContain('Retour au tableau de bord');
    expect(text()).toContain('Les demandes ne vous sont proposées que pour les produits activés.');
  });

  it('un interrupteur par produit : actif ou non, le produit désactivé est grisé', async () => {
    await create();

    expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('true');
    expect(switchOf('Pommes de terre · Charlotte').getAttribute('aria-checked')).toBe('true');
    expect(switchOf('Miel de fleurs').getAttribute('aria-checked')).toBe('false');
    expect(rowButton('Tomates').className).not.toContain('opacity-50');
    expect(rowButton('Miel').className).toContain('opacity-50');
  });

  it('désactiver un produit renvoie tous ses champs, seul isActive change', async () => {
    await create();

    click(switchOf('Tomates · Cœur de bœuf'));

    // PUT remplace tout : sans la description et le prix, le back les effacerait
    expect(serviceMock.update).toHaveBeenCalledWith('pp1', {
      variety: 'Cœur de bœuf',
      description: 'Plein champ',
      estimatedVolume: '90.000',
      defaultPrice: '3.50',
      currencyCode: 'EUR',
      isActive: false,
    });
    expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('false');
    expect(rowButton('Tomates').className).toContain('opacity-50');
    // la liste n'est pas rechargee pour un interrupteur
    expect(serviceMock.getProducts).toHaveBeenCalledTimes(1);
  });

  it('activer un produit désactivé', async () => {
    await create();

    click(switchOf('Miel de fleurs'));

    expect(serviceMock.update).toHaveBeenCalledWith('pp3', expect.objectContaining({ isActive: true }));
    expect(switchOf('Miel de fleurs').getAttribute('aria-checked')).toBe('true');
  });

  it('l\'interrupteur est bloqué le temps de l\'enregistrement', async () => {
    await create();
    const saving = new Subject<null>();
    serviceMock.update.mockReturnValue(saving);

    click(switchOf('Tomates · Cœur de bœuf'));
    expect(switchOf('Tomates · Cœur de bœuf').disabled).toBe(true);
    expect(switchOf('Pommes de terre · Charlotte').disabled).toBe(false);

    saving.next(null);
    saving.complete();
    fixture.detectChanges();
    expect(switchOf('Tomates · Cœur de bœuf').disabled).toBe(false);
  });

  it('si l\'enregistrement échoue, le dit et garde l\'état d\'avant', async () => {
    await create();
    serviceMock.update.mockReturnValue(httpError(403, { error: 'Accès refusé.' }));

    click(switchOf('Tomates · Cœur de bœuf'));

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Accès refusé.');
    expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('true');
    expect(switchOf('Tomates · Cœur de bœuf').disabled).toBe(false);
  });

  it('sans produit : un message et le bouton d\'ajout', async () => {
    await create(of([]));

    expect(text()).toContain("Vous n'avez pas encore de produit.");
    expect(button('+ Ajouter un produit')).toBeTruthy();
  });

  it('si la liste ne se charge pas, le dit', async () => {
    await create(httpError(500, {}));

    expect(text()).toContain('Impossible de charger vos produits pour le moment.');
    expect(compiled.querySelector('[role="switch"]')).toBeNull();
  });

  it('l\'ajout propose d\'abord les catégories qui ont encore des produits à ajouter', async () => {
    await create();

    click(button('+ Ajouter un produit'));

    expect(dialog()?.querySelector('h2')?.textContent).toBe('Ajouter un produit');
    // Tomates, Pommes de terre et Miel sont deja la (le back refuserait un doublon) : la categorie du miel n'a plus rien a proposer
    expect(optionsOf('#category')).toEqual(['Choisir une catégorie', 'Fruits', 'Légumes', 'Autres']);
    // pas de produit tant qu'on n'a pas choisi la categorie
    expect(optionsOf('#product')).toEqual(['Choisir un produit']);
  });

  it('puis les produits de la catégorie choisie, sans ceux déjà dans la liste', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    pick('#category', 'c-legumes');
    expect(optionsOf('#product')).toEqual(['Choisir un produit', 'Carottes']);

    pick('#category', 'c-fruits');
    expect(optionsOf('#product')).toEqual(['Choisir un produit', 'Pommes']);

    // les produits dont la categorie n'est pas dans la liste restent atteignables
    pick('#category', 'others');
    expect(optionsOf('#product')).toEqual(['Choisir un produit', 'Poulet fermier']);
  });

  it('changer de catégorie vide le produit choisi', async () => {
    await create();
    click(button('+ Ajouter un produit'));
    choose('p-carottes');
    expect(compiled.querySelector<HTMLSelectElement>('#product')!.value).toBe('p-carottes');

    pick('#category', 'c-fruits');

    expect(compiled.querySelector<HTMLSelectElement>('#product')!.value).toBe('');
    click(button('Ajouter'));
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Choisissez un produit.');
  });

  it('sans produit à ajouter dans le catalogue, le dit', async () => {
    await create(of([TOMATES, POMMES_DE_TERRE, MIEL]));
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [provideRouter([]), { provide: ProductsService, useValue: { ...serviceMock, getCatalog: () => of([]) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;

    click(button('+ Ajouter un produit'));

    expect(dialog()?.textContent).toContain('Aucun autre produit disponible dans le catalogue.');
  });

  it('ajoute un produit : envoyé actif, avec l\'euro, puis la liste est rechargée', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    choose('p-carottes');
    type('variety', ' Nantaise ');
    type('volume', '120,5');
    type('price', '1,2');
    click(button('Ajouter'));

    expect(serviceMock.create).toHaveBeenCalledWith('p-carottes', {
      variety: 'Nantaise',
      description: null,
      estimatedVolume: '120.5',
      defaultPrice: '1.2',
      currencyCode: 'EUR',
      isActive: true,
    });
    expect(dialog()).toBeNull();
    expect(text()).toContain('Produit ajouté.');
    expect(serviceMock.getProducts).toHaveBeenCalledTimes(2);
  });

  it('la description et l\'interrupteur « disponible » partent avec le produit', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    // disponible au depart
    expect(available().getAttribute('aria-checked')).toBe('true');
    choose('p-carottes');
    type('description', '  Plein champ, sans traitement.  ');
    click(available());
    expect(available().getAttribute('aria-checked')).toBe('false');
    click(button('Ajouter'));

    expect(serviceMock.create).toHaveBeenCalledWith('p-carottes', expect.objectContaining({ description: 'Plein champ, sans traitement.', isActive: false }));
  });

  it('volume et prix sont facultatifs : sans prix, pas de devise', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    choose('p-pommes');
    click(button('Ajouter'));

    expect(serviceMock.create).toHaveBeenCalledWith('p-pommes', {
      variety: null,
      description: null,
      estimatedVolume: null,
      defaultPrice: null,
      currencyCode: null,
      isActive: true,
    });
  });

  it('les libellés prennent l\'unité du produit choisi', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    expect(dialog()?.textContent).toContain('Volume estimé');
    expect(dialog()?.textContent).not.toContain('Volume estimé (');
    expect(dialog()?.textContent).toContain('Prix indicatif (€)');

    choose('p-carottes');
    expect(dialog()?.textContent).toContain('Volume estimé (kg)');
    expect(dialog()?.textContent).toContain('Prix indicatif (€/kg)');
  });

  it('refuse l\'envoi sans produit choisi', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    click(button('Ajouter'));

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Choisissez un produit.');
    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it('refuse un volume ou un prix qui n\'est pas un nombre positif', async () => {
    await create();
    click(button('+ Ajouter un produit'));
    choose('p-carottes');

    for (const [id, value] of [['volume', 'beaucoup'], ['price', '-3'], ['volume', '1,2,3']]) {
      type('volume', '');
      type('price', '');
      type(id, value);
      click(button('Ajouter'));
      expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('des nombres positifs');
    }
    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it('une erreur du back reste dans la fenêtre, qui reste ouverte', async () => {
    await create();
    click(button('+ Ajouter un produit'));
    choose('p-carottes');

    serviceMock.create.mockReturnValueOnce(httpError(409, { error: 'Ce produit est déjà dans votre catalogue.' }));
    click(button('Ajouter'));
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('déjà dans votre catalogue');

    // une erreur de validation (422) : on lit le message de la 1re violation
    serviceMock.create.mockReturnValueOnce(httpError(422, { violations: [{ title: 'Prix invalide.' }] }));
    click(button('Ajouter'));
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Prix invalide.');
    expect(dialog()).not.toBeNull();
  });

  it('modifier : titre du produit, pas de choix de produit, champs remplis', async () => {
    await create();

    click(rowButton('Tomates'));

    expect(dialog()?.querySelector('h2')?.textContent).toBe('Tomates · Cœur de bœuf');
    expect(compiled.querySelector('#product')).toBeNull();
    expect(field('variety')).toBe('Cœur de bœuf');
    expect(field('volume')).toBe('90');
    expect(field('price')).toBe('3,5');
    expect(dialog()?.textContent).toContain('Volume estimé (kg)');
    expect(dialog()?.textContent).toContain('Prix indicatif (€/kg)');
  });

  it('enregistre la modification en gardant la description et l\'état actif du produit', async () => {
    await create();
    click(rowButton('Tomates'));

    type('price', '4');
    click(button('Enregistrer'));

    expect(serviceMock.update).toHaveBeenCalledWith('pp1', {
      variety: 'Cœur de bœuf',
      description: 'Plein champ',
      estimatedVolume: '90',
      defaultPrice: '4',
      currencyCode: 'EUR',
      isActive: true,
    });
    expect(text()).toContain('Produit modifié.');
    expect(serviceMock.getProducts).toHaveBeenCalledTimes(2);

    // un produit désactivé le reste quand on le modifie
    click(rowButton('Miel'));
    click(button('Enregistrer'));
    expect(serviceMock.update).toHaveBeenLastCalledWith('pp3', expect.objectContaining({ isActive: false }));
  });

  it('modifier la description et l\'état disponible du produit', async () => {
    await create();
    click(rowButton('Tomates'));
    expect(field('description')).toBe('Plein champ');
    expect(available().getAttribute('aria-checked')).toBe('true');

    type('description', 'Cultivées sous serre');
    click(available());
    click(button('Enregistrer'));

    expect(serviceMock.update).toHaveBeenCalledWith('pp1', expect.objectContaining({ description: 'Cultivées sous serre', isActive: false }));
  });

  it('vider la description l\'efface', async () => {
    await create();
    click(rowButton('Tomates'));

    type('description', '');
    click(button('Enregistrer'));

    expect(serviceMock.update).toHaveBeenCalledWith('pp1', expect.objectContaining({ description: null }));
  });

  it('vider le prix efface aussi la devise', async () => {
    await create();
    click(rowButton('Tomates'));

    type('price', '');
    type('variety', '');
    click(button('Enregistrer'));

    expect(serviceMock.update).toHaveBeenCalledWith('pp1', expect.objectContaining({ defaultPrice: null, currencyCode: null, variety: null }));
  });

  it('retirer un produit demande une confirmation', async () => {
    await create();
    click(rowButton('Tomates'));

    click(button('Retirer ce produit'));
    expect(dialog()?.textContent).toContain('Retirer ce produit de votre liste ?');
    expect(serviceMock.remove).not.toHaveBeenCalled();

    // « Annuler » de la confirmation ne ferme pas la fenêtre
    const cancel = [...dialog()!.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Annuler').pop()!;
    click(cancel);
    expect(button('Retirer ce produit')).toBeTruthy();
    expect(dialog()).not.toBeNull();

    click(button('Retirer ce produit'));
    click(button('Confirmer'));

    expect(serviceMock.remove).toHaveBeenCalledWith('pp1');
    expect(dialog()).toBeNull();
    expect(text()).toContain('Produit retiré.');
    expect(serviceMock.getProducts).toHaveBeenCalledTimes(2);
  });

  it('retirer n\'existe pas à l\'ajout', async () => {
    await create();
    click(button('+ Ajouter un produit'));

    expect(compiled.textContent).not.toContain('Retirer ce produit');
  });

  it('« Annuler », Échap ou un clic à côté ferment la fenêtre sans rien enregistrer', async () => {
    await create();

    click(rowButton('Tomates'));
    click(button('Annuler'));
    expect(dialog()).toBeNull();

    click(rowButton('Tomates'));
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(dialog()).toBeNull();

    click(rowButton('Tomates'));
    click(compiled.querySelector<HTMLElement>('.fixed')!);
    expect(dialog()).toBeNull();

    expect(serviceMock.update).not.toHaveBeenCalled();
    expect(serviceMock.create).not.toHaveBeenCalled();
  });

  it('rouvrir la fenêtre repart de zéro', async () => {
    await create();
    click(rowButton('Tomates'));
    click(button('Annuler'));

    click(button('+ Ajouter un produit'));

    expect(field('variety')).toBe('');
    expect(field('volume')).toBe('');
    expect(field('price')).toBe('');
  });

  it('la fenêtre prend le focus à l\'ouverture', async () => {
    await create();

    click(rowButton('Tomates'));
    await fixture.whenStable();

    expect(document.activeElement).toBe(dialog());
  });
});
