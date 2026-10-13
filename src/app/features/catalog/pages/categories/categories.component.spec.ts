import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Category } from '../../models/category.model';
import { Product } from '../../models/product.model';
import {
  currentMonth,
  makeCategory,
  makeProduct,
  nextMonth,
  textOf,
} from '../../testing/catalog.fixtures';
import { CategoriesComponent } from './categories.component';

describe('CategoriesComponent', () => {
  const apiUrl = environment.apiURL;

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CategoriesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    return { fixture, http, host: fixture.nativeElement as HTMLElement };
  }

  type Context = ReturnType<typeof setup>;

  /** Répond aux deux requêtes de la page (catégories et produits) puis met l'affichage à jour */
  function respond(ctx: Context, categories: Category[], products: Product[] = []): void {
    ctx.http.expectOne((r) => r.url === `${apiUrl}/categories`).flush(categories);
    ctx.http.expectOne((r) => r.url === `${apiUrl}/products`).flush(products);
    ctx.fixture.detectChanges();
  }

  function buttonByText(host: HTMLElement, text: string): HTMLButtonElement {
    const button = Array.from(host.querySelectorAll('button')).find((b) =>
      textOf(b).includes(text),
    );
    if (!button) throw new Error(`Bouton « ${text} » introuvable`);

    return button;
  }

  it("affiche un état de chargement tant que l'API n'a pas répondu", () => {
    const { host } = setup();

    expect(textOf(host)).toContain('Chargement des catégories');
  });

  it("n'affiche que les catégories racines, avec leur compteur de familles", () => {
    const ctx = setup();

    respond(ctx, [
      makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' }),
      makeCategory({ id: 'c2', name: 'Légumes', slug: 'legumes' }),
      makeCategory({ id: 'c3', name: 'Pommes', slug: 'pommes', parentId: 'c1' }),
    ]);

    const text = textOf(ctx.host);
    expect(text).toContain('Fruits');
    expect(text).toContain('Légumes');
    expect(text).not.toContain('Pommes');
    expect(text).toContain('2 familles de produits');
  });

  it('accorde le compteur de familles au singulier', () => {
    const ctx = setup();

    respond(ctx, [makeCategory()]);

    expect(textOf(ctx.host)).toContain('1 famille de produits');
  });

  it('affiche le nombre de producteurs de chaque catégorie, au singulier comme au pluriel', () => {
    const ctx = setup();

    respond(ctx, [
      makeCategory({ id: 'c1', name: 'Fruits', producerCount: 148 }),
      makeCategory({ id: 'c2', name: 'Miel', slug: 'miel', producerCount: 1 }),
    ]);

    const text = textOf(ctx.host);
    expect(text).toContain('148 Producteurs');
    expect(text).toContain('1 Producteur');
    expect(text).not.toContain('1 Producteurs');
  });

  it('filtre les familles qui ont au moins un produit de saison', () => {
    const ctx = setup();
    const month = currentMonth();
    respond(
      ctx,
      [
        makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' }),
        makeCategory({ id: 'c2', name: 'Légumes', slug: 'legumes' }),
      ],
      [
        makeProduct({
          id: 'pr1',
          categoryId: 'c1',
          seasonStartMonth: month,
          seasonEndMonth: month,
        }),
        makeProduct({
          id: 'pr2',
          categoryId: 'c2',
          seasonStartMonth: nextMonth(month),
          seasonEndMonth: nextMonth(month),
        }),
      ],
    );

    const chip = buttonByText(ctx.host, 'Produits de saison actuellement');
    chip.click();
    ctx.fixture.detectChanges();

    const text = textOf(ctx.host);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(text).toContain('Fruits');
    expect(text).not.toContain('Légumes');
    expect(text).toContain('1 famille de produits');
  });

  it('retire le filtre de saison au second clic', () => {
    const ctx = setup();
    const month = currentMonth();
    respond(
      ctx,
      [
        makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' }),
        makeCategory({ id: 'c2', name: 'Légumes', slug: 'legumes' }),
      ],
      [makeProduct({ categoryId: 'c1', seasonStartMonth: month, seasonEndMonth: month })],
    );
    const chip = buttonByText(ctx.host, 'Produits de saison actuellement');

    chip.click();
    chip.click();
    ctx.fixture.detectChanges();

    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(textOf(ctx.host)).toContain('Légumes');
  });

  it("affiche un message quand aucune famille n'a de produit de saison", () => {
    const ctx = setup();
    respond(ctx, [makeCategory()], [makeProduct({ seasonStartMonth: null, seasonEndMonth: null })]);

    buttonByText(ctx.host, 'Produits de saison actuellement').click();
    ctx.fixture.detectChanges();

    expect(textOf(ctx.host)).toContain('Aucune catégorie de saison pour le moment');
  });

  it("affiche une erreur claire quand l'API échoue", () => {
    const ctx = setup();

    ctx.http
      .expectOne((r) => r.url === `${apiUrl}/categories`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.fixture.detectChanges();

    // * L'autre requête (produits) est annulée par forkJoin : on ne la fait pas répondre.
    expect(textOf(ctx.host)).toContain('Impossible de charger les catégories');
  });
});
