import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsComponent } from './products.component';
import { CatalogCategory, CatalogLabel, CatalogProduct, ProducerProduct, ProductsService } from './products.service';

const KG = { id: 'u-kg', code: 'kg', label: 'Kilogramme' };
const UNITE = { id: 'u-unite', code: 'unite', label: 'Unité' };

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
  availability: null,
  labels: [],
  photos: [],
};
const POMMES_DE_TERRE: ProducerProduct = {
  ...TOMATES,
  id: 'pp2',
  productId: 'p-pdt',
  name: 'Pommes de terre',
  variety: 'Charlotte',
  description: null,
  estimatedVolume: '200.000',
  defaultPrice: '0.90',
  seasonStartMonth: null,
  seasonEndMonth: null,
};
const MIEL: ProducerProduct = {
  ...TOMATES,
  id: 'pp3',
  productId: 'p-miel',
  name: 'Miel de fleurs',
  variety: null,
  description: null,
  estimatedVolume: '30.000',
  defaultPrice: '8.00',
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
const LABELS: CatalogLabel[] = [
  { id: 'l-bio', name: 'Bio' },
  { id: 'l-hve', name: 'HVE' },
];

const httpError = (status: number, body: unknown) => throwError(() => new HttpErrorResponse({ status, error: body }));
// un fichier image (ou autre) comme en choisirait le navigateur
const file = (name = 'tomate.jpg', type = 'image/jpeg', size = 1000): File => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let compiled: HTMLElement;
  let serviceMock: Record<
    'getProducts' | 'getCatalog' | 'getCategories' | 'getUnits' | 'getLabels' | 'create' | 'update' | 'remove' | 'uploadPhoto' | 'deletePhoto',
    ReturnType<typeof vi.fn>
  >;

  async function create(products$: Observable<ProducerProduct[]> = of([TOMATES, POMMES_DE_TERRE, MIEL])): Promise<void> {
    serviceMock = {
      getProducts: vi.fn(() => products$),
      getCatalog: vi.fn(() => of(CATALOG)),
      getCategories: vi.fn(() => of(CATEGORIES)),
      getUnits: vi.fn(() => of([KG, UNITE])),
      getLabels: vi.fn(() => of(LABELS)),
      create: vi.fn(() => of({ id: 'new' })),
      update: vi.fn(() => of(null)),
      remove: vi.fn(() => of(null)),
      uploadPhoto: vi.fn(() => of({ id: 'ph-new', url: 'http://localhost/new.jpg' })),
      deletePhoto: vi.fn(() => of(null)),
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
  const rowButton = (name: string) =>
    [...compiled.querySelectorAll<HTMLButtonElement>('ul > li > button:not([role="switch"])')].find((b) => b.textContent?.includes(name))!;
  const dialog = () => compiled.querySelector<HTMLElement>('[role="dialog"]');
  const alert = () => dialog()?.querySelector('[role="alert"]')?.textContent;
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  const click = (element: HTMLElement) => {
    element.click();
    fixture.detectChanges();
  };
  const type = (id: string, value: string) => {
    const input = compiled.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
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
  const field = (id: string) => compiled.querySelector<HTMLInputElement>(`#${id}`)!.value;
  const available = () => compiled.querySelector<HTMLButtonElement>('#available')!;
  const chip = (name: string) => [...compiled.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) => b.textContent?.trim() === name)!;
  const pickFiles = (...files: File[]) => {
    const input = compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const thumbs = () => [...(dialog()?.querySelectorAll('img') ?? [])];

  beforeEach(() => {
    TestBed.resetTestingModule();
    // jsdom ne sait pas fabriquer l'apercu d'un fichier
    URL.createObjectURL = vi.fn(() => 'blob:apercu');
    URL.revokeObjectURL = vi.fn();
  });

  describe('la liste', () => {
    it('montre la saison, le volume et le prix de chaque produit, comme le figma', async () => {
      await create();

      expect(rows()).toEqual([
        ['Tomates · Cœur de bœuf', 'Juin-Sept · 90 kg · 3,50 €/kg'],
        ['Pommes de terre · Charlotte', "Toute l'année · 200 kg · 0,90 €/kg"],
        ['Miel de fleurs', 'Mai-Oct · 30 unités · 8,00 €/unité'],
      ]);
    });

    it("la période, le volume et l'unité choisis par le producteur l'emportent sur le catalogue", async () => {
      await create(of([{ ...TOMATES, availability: { startMonth: 3, endMonth: 5, quantity: '50.000', unit: UNITE } }]));

      expect(rows()[0][1]).toBe('Mars-Mai · 50 unités · 3,50 €/unité');
    });

    it("le titre, le retour au tableau de bord et ce que fait l'interrupteur", async () => {
      await create();

      expect(compiled.querySelector('h1')?.textContent).toContain('Produits et disponibilités');
      expect(compiled.querySelector('header a')?.getAttribute('href')).toBe('/producer');
      expect(text()).toContain('Retour au tableau de bord');
      expect(text()).toContain('Les demandes ne vous sont proposées que pour les produits activés.');
    });

    it('un interrupteur par produit : actif ou non, le produit désactivé est grisé', async () => {
      await create();

      expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('true');
      expect(switchOf('Miel de fleurs').getAttribute('aria-checked')).toBe('false');
      expect(rowButton('Tomates').className).not.toContain('opacity-50');
      expect(rowButton('Miel').className).toContain('opacity-50');
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
  });

  describe("l'interrupteur", () => {
    it('désactiver un produit renvoie ses champs, sans toucher aux labels ni à la période', async () => {
      await create();

      click(switchOf('Tomates · Cœur de bœuf'));

      // PUT remplace tout : sans la description et le prix, le back les effacerait. Pas de labelIds ni de availability :
      // absents, le back laisse les labels et la période comme ils sont.
      expect(serviceMock.update).toHaveBeenCalledWith('pp1', {
        variety: 'Cœur de bœuf',
        description: 'Plein champ',
        estimatedVolume: '90.000',
        defaultPrice: '3.50',
        currencyCode: 'EUR',
        isActive: false,
      });
      expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('false');
      expect(serviceMock.getProducts).toHaveBeenCalledTimes(1);
    });

    it('activer un produit désactivé', async () => {
      await create();

      click(switchOf('Miel de fleurs'));

      expect(serviceMock.update).toHaveBeenCalledWith('pp3', expect.objectContaining({ isActive: true }));
      expect(switchOf('Miel de fleurs').getAttribute('aria-checked')).toBe('true');
    });

    it("est bloqué le temps de l'enregistrement", async () => {
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

    it("si l'enregistrement échoue, le dit et garde l'état d'avant", async () => {
      await create();
      serviceMock.update.mockReturnValue(httpError(403, { error: 'Accès refusé.' }));

      click(switchOf('Tomates · Cœur de bœuf'));

      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Accès refusé.');
      expect(switchOf('Tomates · Cœur de bœuf').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe("l'ajout d'un produit", () => {
    it("propose d'abord toutes les catégories du catalogue, même celles dont le producteur a déjà des produits", async () => {
      await create();

      click(button('+ Ajouter un produit'));

      expect(dialog()?.querySelector('h2')?.textContent).toBe('Ajouter un produit');
      expect(optionsOf('#category')).toEqual(['Choisir une catégorie', 'Fruits', 'Légumes', 'Miel & Produits de la ruche', 'Autres']);
      expect(optionsOf('#product')).toEqual(['Choisir un produit']);
    });

    it('puis les produits de la catégorie choisie, y compris ceux déjà dans la liste (une autre variété)', async () => {
      await create();
      click(button('+ Ajouter un produit'));

      // Tomates et Pommes de terre sont deja dans la liste
      pick('#category', 'c-legumes');
      expect(optionsOf('#product')).toEqual(['Choisir un produit', 'Tomates', 'Pommes de terre', 'Carottes']);
      pick('#category', 'others');
      expect(optionsOf('#product')).toEqual(['Choisir un produit', 'Poulet fermier']);
    });

    it('un produit déjà dans la liste se rajoute avec une autre variété', async () => {
      await create();
      click(button('+ Ajouter un produit'));

      choose('p-tomates');
      type('variety', 'Roma');
      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledWith('p-tomates', expect.objectContaining({ variety: 'Roma' }));
    });

    it('la même variété du même produit deux fois est refusée sans appeler le back', async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-tomates');

      // la casse et les espaces ne comptent pas, comme cote back
      type('variety', '  cœur de BŒUF ');
      click(button('Ajouter'));
      expect(alert()).toContain('Vous avez déjà ce produit avec cette variété');

      // « sans variété » est une variété : Miel de fleurs est deja la sans variete
      choose('p-miel');
      type('variety', '');
      click(button('Ajouter'));
      expect(alert()).toContain('Vous avez déjà ce produit avec cette variété');

      expect(serviceMock.create).not.toHaveBeenCalled();
    });

    it('sans autre ligne du même produit dans la liste, la variété saisie passe', async () => {
      await create(of([]));
      click(button('+ Ajouter un produit'));
      choose('p-tomates');
      type('variety', 'Cœur de bœuf');

      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledTimes(1);
    });

    it('changer de catégorie vide le produit choisi', async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');

      pick('#category', 'c-fruits');

      expect(compiled.querySelector<HTMLSelectElement>('#product')!.value).toBe('');
      click(button('Ajouter'));
      expect(alert()).toContain('Choisissez un produit.');
    });

    it('sans produit dans le catalogue, le dit', async () => {
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

      expect(dialog()?.textContent).toContain('Aucun produit dans le catalogue.');
    });

    it("envoie le produit actif, en euros, avec l'unité du catalogue, puis recharge la liste", async () => {
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
        isActive: true,
        estimatedVolume: '120.5',
        defaultPrice: '1.2',
        currencyCode: 'EUR',
        labelIds: [],
        availability: { startMonth: null, endMonth: null, quantity: '120.5', unitId: 'u-kg' },
      });
      expect(dialog()).toBeNull();
      expect(text()).toContain('Produit ajouté.');
      expect(serviceMock.getProducts).toHaveBeenCalledTimes(2);
    });

    it("sans période, volume ni prix : pas de créneau (l'unité seule ne compte pas) et pas de devise", async () => {
      await create();
      click(button('+ Ajouter un produit'));

      choose('p-pommes');
      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledWith('p-pommes', {
        variety: null,
        description: null,
        isActive: true,
        estimatedVolume: null,
        defaultPrice: null,
        currencyCode: null,
        labelIds: [],
        availability: { startMonth: null, endMonth: null, quantity: null, unitId: null },
      });
    });

    it('la description et l\'interrupteur « disponible » partent avec le produit', async () => {
      await create();
      click(button('+ Ajouter un produit'));

      expect(available().getAttribute('aria-checked')).toBe('true');
      choose('p-carottes');
      type('description', '  Plein champ, sans traitement.  ');
      click(available());
      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledWith('p-carottes', expect.objectContaining({ description: 'Plein champ, sans traitement.', isActive: false }));
    });

    it("l'unité du produit choisi est présélectionnée, modifiable, et donne les libellés", async () => {
      await create();
      click(button('+ Ajouter un produit'));
      expect(dialog()?.textContent).toContain('Prix indicatif (€)');

      choose('p-carottes');
      expect(field('unit')).toBe('u-kg');
      expect(dialog()?.textContent).toContain('Volume estimé (kg)');
      expect(dialog()?.textContent).toContain('Prix indicatif (€/kg)');

      pick('#unit', 'u-unite');
      expect(dialog()?.textContent).toContain('Prix indicatif (€/unité)');
    });

    it('la période : mois de début et de fin, avec le volume et son unité', async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');

      pick('#start-month', '3');
      pick('#end-month', '5');
      type('volume', '50');
      pick('#unit', 'u-unite');
      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledWith(
        'p-carottes',
        expect.objectContaining({ estimatedVolume: '50', availability: { startMonth: 3, endMonth: 5, quantity: '50', unitId: 'u-unite' } }),
      );
    });

    it('refuse un début sans fin (ou l\'inverse)', async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');

      pick('#start-month', '3');
      click(button('Ajouter'));

      expect(alert()).toContain('Choisissez le début et la fin de la période.');
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
        expect(alert()).toContain('des nombres positifs');
      }
      expect(serviceMock.create).not.toHaveBeenCalled();
    });

    it('une erreur du back reste dans la fenêtre, qui reste ouverte', async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');

      serviceMock.create.mockReturnValueOnce(httpError(409, { error: 'Ce produit est déjà dans votre catalogue.' }));
      click(button('Ajouter'));
      expect(alert()).toContain('déjà dans votre catalogue');

      serviceMock.create.mockReturnValueOnce(httpError(422, { violations: [{ title: 'Prix invalide.' }] }));
      click(button('Ajouter'));
      expect(alert()).toContain('Prix invalide.');
      expect(dialog()).not.toBeNull();
    });
  });

  describe('les labels', () => {
    it("propose ceux du catalogue, à cocher, et les envoie avec le produit", async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');

      expect(chip('Bio').getAttribute('aria-pressed')).toBe('false');
      click(chip('Bio'));
      click(chip('HVE'));
      click(chip('HVE'));
      expect(chip('Bio').getAttribute('aria-pressed')).toBe('true');
      expect(chip('HVE').getAttribute('aria-pressed')).toBe('false');
      click(button('Ajouter'));

      expect(serviceMock.create).toHaveBeenCalledWith('p-carottes', expect.objectContaining({ labelIds: ['l-bio'] }));
    });

    it("à la modification, ceux du produit sont cochés et décocher les retire", async () => {
      await create(of([{ ...TOMATES, labels: [{ id: 'l-bio', name: 'Bio' }] }]));
      click(rowButton('Tomates'));
      expect(chip('Bio').getAttribute('aria-pressed')).toBe('true');

      click(chip('Bio'));
      click(button('Enregistrer'));

      expect(serviceMock.update).toHaveBeenCalledWith('pp1', expect.objectContaining({ labelIds: [] }));
    });

    it('le dit : ils sont déclarés, pas vérifiés', async () => {
      await create();
      click(button('+ Ajouter un produit'));

      expect(dialog()?.textContent).toContain('ne sont pas vérifiés');
    });
  });

  describe('les photos', () => {
    it("les photos choisies s'affichent en vignettes et partent après la création du produit", async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');
      const first = file('a.jpg');

      pickFiles(first, file('b.png', 'image/png'));
      expect(thumbs()).toHaveLength(2);
      click(button('Ajouter'));

      // les photos ne s'envoient qu'une fois le produit enregistre : il faut son identifiant
      expect(serviceMock.create).toHaveBeenCalledTimes(1);
      expect(serviceMock.uploadPhoto).toHaveBeenCalledTimes(2);
      expect(serviceMock.uploadPhoto).toHaveBeenNthCalledWith(1, 'new', first);
      expect(text()).toContain('Produit ajouté.');
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("une photo refusée par le serveur n'annule pas le produit : on le dit", async () => {
      await create();
      click(button('+ Ajouter un produit'));
      choose('p-carottes');
      serviceMock.uploadPhoto.mockReturnValueOnce(httpError(422, { error: 'Format non supporté.' }));

      pickFiles(file('a.jpg'), file('b.jpg'));
      click(button('Ajouter'));

      expect(serviceMock.uploadPhoto).toHaveBeenCalledTimes(2);
      expect(text()).toContain("Produit ajouté, mais 1 photo n'a pas pu être envoyée.");
      expect(dialog()).toBeNull();
    });

    it('refuse un format ou une taille que le back refuserait', async () => {
      await create();
      click(button('+ Ajouter un produit'));

      pickFiles(file('doc.pdf', 'application/pdf'));
      expect(alert()).toContain('jpeg, png ou webp, 5 Mo maximum');
      pickFiles(file('grosse.jpg', 'image/jpeg', 6 * 1024 * 1024));
      expect(alert()).toContain('5 Mo maximum');

      expect(thumbs()).toHaveLength(0);
    });

    it('cinq photos au plus, existantes comprises', async () => {
      await create(of([{ ...TOMATES, photos: [{ id: 'ph1', url: 'http://localhost/1.jpg' }, { id: 'ph2', url: 'http://localhost/2.jpg' }] }]));
      click(rowButton('Tomates'));

      pickFiles(...Array.from({ length: 5 }, (_, i) => file(`${i}.jpg`)));

      expect(thumbs()).toHaveLength(5);
      expect(alert()).toContain('5 photos au maximum');
      expect(button('Ajouter des photos du produit').disabled).toBe(true);
    });

    it("une photo choisie se retire avant l'envoi", async () => {
      await create();
      click(button('+ Ajouter un produit'));
      pickFiles(file('a.jpg'), file('b.jpg'));

      click(compiled.querySelector<HTMLButtonElement>('[aria-label="Ne pas envoyer cette photo"]')!);

      expect(thumbs()).toHaveLength(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:apercu');
    });

    it('à la modification, les photos enregistrées se retirent tout de suite', async () => {
      await create(of([{ ...TOMATES, photos: [{ id: 'ph1', url: 'http://localhost/1.jpg' }] }]));
      click(rowButton('Tomates'));
      expect(thumbs()).toHaveLength(1);

      click(compiled.querySelector<HTMLButtonElement>('[aria-label="Retirer la photo"]')!);

      expect(serviceMock.deletePhoto).toHaveBeenCalledWith('pp1', 'ph1');
      expect(thumbs()).toHaveLength(0);
      // rouvrir ne la rend pas : la liste en mémoire est à jour
      click(button('Annuler'));
      click(rowButton('Tomates'));
      expect(thumbs()).toHaveLength(0);
    });

    it("si la suppression d'une photo échoue, le dit et la garde", async () => {
      await create(of([{ ...TOMATES, photos: [{ id: 'ph1', url: 'http://localhost/1.jpg' }] }]));
      click(rowButton('Tomates'));
      serviceMock.deletePhoto.mockReturnValue(httpError(404, { error: 'Photo introuvable.' }));

      click(compiled.querySelector<HTMLButtonElement>('[aria-label="Retirer la photo"]')!);

      expect(alert()).toContain('Photo introuvable.');
      expect(thumbs()).toHaveLength(1);
    });
  });

  describe("la modification d'un produit", () => {
    it('titre du produit, pas de choix de produit, champs remplis', async () => {
      await create();

      click(rowButton('Tomates'));

      expect(dialog()?.querySelector('h2')?.textContent).toBe('Tomates · Cœur de bœuf');
      expect(compiled.querySelector('#product')).toBeNull();
      expect(field('variety')).toBe('Cœur de bœuf');
      expect(field('description')).toBe('Plein champ');
      expect(field('price')).toBe('3,5');
      expect(available().getAttribute('aria-checked')).toBe('true');
    });

    it("sans période enregistrée, reprend le volume de la fiche et l'unité du catalogue", async () => {
      await create();

      click(rowButton('Tomates'));

      expect(field('volume')).toBe('90');
      expect(field('unit')).toBe('u-kg');
      expect(field('start-month')).toBe('');
      expect(dialog()?.textContent).toContain('Volume estimé (kg)');
    });

    it("avec une période enregistrée, reprend ses mois, son volume et son unité", async () => {
      await create(of([{ ...TOMATES, availability: { startMonth: 3, endMonth: 5, quantity: '50.000', unit: UNITE } }]));

      click(rowButton('Tomates'));

      expect(field('start-month')).toBe('3');
      expect(field('end-month')).toBe('5');
      expect(field('volume')).toBe('50');
      expect(field('unit')).toBe('u-unite');
    });

    it("enregistre en gardant l'état actif du produit", async () => {
      await create();
      click(rowButton('Miel'));

      click(button('Enregistrer'));

      expect(serviceMock.update).toHaveBeenCalledWith('pp3', expect.objectContaining({ isActive: false, labelIds: [] }));
      expect(text()).toContain('Produit modifié.');
      expect(serviceMock.getProducts).toHaveBeenCalledTimes(2);
    });

    it("changer la variété d'une ligne ne peut pas prendre celle d'une autre ligne du même produit", async () => {
      const gala = { ...TOMATES, id: 'g', variety: 'Gala' };
      const golden = { ...TOMATES, id: 'h', variety: 'Golden' };
      await create(of([gala, golden]));
      click(rowButton('Golden'));

      type('variety', ' gala');
      click(button('Enregistrer'));
      expect(alert()).toContain('Vous avez déjà ce produit avec cette variété');
      expect(serviceMock.update).not.toHaveBeenCalled();

      // enregistrer sans changer la variété n'est pas un doublon avec soi-même
      type('variety', 'Golden');
      click(button('Enregistrer'));
      expect(serviceMock.update).toHaveBeenCalledWith('h', expect.objectContaining({ variety: 'Golden' }));
    });

    it('modifier la description, la période et la disponibilité', async () => {
      await create();
      click(rowButton('Tomates'));

      type('description', 'Cultivées sous serre');
      pick('#start-month', '4');
      pick('#end-month', '8');
      click(available());
      click(button('Enregistrer'));

      expect(serviceMock.update).toHaveBeenCalledWith(
        'pp1',
        expect.objectContaining({
          description: 'Cultivées sous serre',
          isActive: false,
          estimatedVolume: '90',
          availability: { startMonth: 4, endMonth: 8, quantity: '90', unitId: 'u-kg' },
        }),
      );
    });

    it("vider la description l'efface, vider le prix efface aussi la devise", async () => {
      await create();
      click(rowButton('Tomates'));

      type('description', '');
      type('price', '');
      click(button('Enregistrer'));

      expect(serviceMock.update).toHaveBeenCalledWith('pp1', expect.objectContaining({ description: null, defaultPrice: null, currencyCode: null }));
    });

    it('vider la période et le volume supprime le créneau', async () => {
      await create(of([{ ...TOMATES, availability: { startMonth: 3, endMonth: 5, quantity: '50.000', unit: UNITE } }]));
      click(rowButton('Tomates'));

      pick('#start-month', '');
      pick('#end-month', '');
      type('volume', '');
      click(button('Enregistrer'));

      expect(serviceMock.update).toHaveBeenCalledWith(
        'pp1',
        expect.objectContaining({ estimatedVolume: null, availability: { startMonth: null, endMonth: null, quantity: null, unitId: null } }),
      );
    });
  });

  describe('retirer un produit', () => {
    it('demande une confirmation', async () => {
      await create();
      click(rowButton('Tomates'));

      click(button('Retirer ce produit'));
      expect(dialog()?.textContent).toContain('Retirer ce produit de votre liste ?');
      expect(serviceMock.remove).not.toHaveBeenCalled();

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

    it('abandonne les photos choisies mais pas envoyées', async () => {
      await create();
      click(rowButton('Tomates'));
      pickFiles(file('a.jpg'));

      click(button('Retirer ce produit'));
      click(button('Confirmer'));

      expect(serviceMock.uploadPhoto).not.toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("n'existe pas à l'ajout", async () => {
      await create();
      click(button('+ Ajouter un produit'));

      expect(compiled.textContent).not.toContain('Retirer ce produit');
    });
  });

  describe('la fenêtre', () => {
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

    it('rouvrir repart de zéro, photos choisies comprises', async () => {
      await create();
      click(rowButton('Tomates'));
      pickFiles(file('a.jpg'));
      click(button('Annuler'));

      click(button('+ Ajouter un produit'));

      expect(field('variety')).toBe('');
      expect(field('volume')).toBe('');
      expect(field('price')).toBe('');
      expect(field('start-month')).toBe('');
      expect(thumbs()).toHaveLength(0);
    });

    it("prend le focus à l'ouverture", async () => {
      await create();

      click(rowButton('Tomates'));
      await fixture.whenStable();

      expect(document.activeElement).toBe(dialog());
    });
  });
});
