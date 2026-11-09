import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { ProducerSummary } from '../../models/producer-summary.model';
import {
  makeLabel,
  makeProducerSummary,
  SEARCH_DEBOUNCE_WAIT_MS,
  sleep,
  textOf,
} from '../../testing/catalog.fixtures';
import { ProducersComponent } from './producers.component';

// * Les filtres, tris, géocodage et états de la liste sont testés en détail via la page d'une catégorie
// * (category-producers.spec.ts) : ils vivent dans ProducerListComponent, partagé. Ici : ce qui est propre
// * à /producers (aucune catégorie, fil d'Ariane, titre de la page, liens vers les fiches) et la pagination,
// * qui s'y voit le mieux puisque la liste n'est pas restreinte à une catégorie.
describe('ProducersComponent', () => {
  const apiUrl = environment.apiURL;
  const producersUrl = `${apiUrl}/producers`;

  /** Ouvre /producers et répond à la seule requête de démarrage (labels des filtres) */
  async function setup(url = '/producers') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'producers', component: ProducersComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ProducersComponent);
    const http = TestBed.inject(HttpTestingController);

    http
      .expectOne((r) => r.url === `${apiUrl}/labels`)
      .flush([makeLabel({ id: 'l1', code: 'bio', name: 'Bio' })]);
    harness.detectChanges();

    return { harness, http, host: harness.routeNativeElement as HTMLElement };
  }

  type Context = Awaited<ReturnType<typeof setup>>;

  /** Laisse passer le debounce (200 ms) puis renvoie la requête GET /producers lancée */
  async function nextSearch(ctx: Context): Promise<TestRequest> {
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);

    return ctx.http.expectOne((r) => r.url === producersUrl);
  }

  function showResults(ctx: Context, req: TestRequest, producers: ProducerSummary[]): void {
    req.flush(producers);
    ctx.harness.detectChanges();
  }

  /** Comme showResults, avec l'en-tête X-Total-Count que renvoie le back (total de toutes les pages) */
  function showPage(
    ctx: Context,
    req: TestRequest,
    producers: ProducerSummary[],
    total: number,
  ): void {
    req.flush(producers, { headers: { 'X-Total-Count': String(total) } });
    ctx.harness.detectChanges();
  }

  /** n producteurs distincts, de « Ferme 1 » à « Ferme n » */
  function makeProducers(n: number, from = 1): ProducerSummary[] {
    return Array.from({ length: n }, (_, i) =>
      makeProducerSummary({
        id: `p${from + i}`,
        slug: `ferme-${from + i}`,
        farmName: `Ferme ${from + i}`,
      }),
    );
  }

  function paginationNav(ctx: Context): HTMLElement | null {
    return ctx.host.querySelector('nav[aria-label="Pagination"]');
  }

  function clickButton(ctx: Context, text: string): void {
    const button = Array.from(ctx.host.querySelectorAll('button')).find((b) => textOf(b) === text);
    if (!button) throw new Error(`Bouton « ${text} » introuvable`);
    button.click();
    ctx.harness.detectChanges();
  }

  it('cherche la première page de tous les producteurs actifs, sans filtre de catégorie', async () => {
    const ctx = await setup();

    const req = await nextSearch(ctx);

    expect(req.request.params.keys().sort()).toEqual(['page', 'pageSize']);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('12');
    showResults(ctx, req, []);
  });

  it("affiche le titre, le fil d'Ariane et le nombre de producteurs", async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [
      makeProducerSummary({ id: 'p1', farmName: 'Ferme des Vergers du Roy' }),
      makeProducerSummary({ id: 'p2', farmName: 'Verger du Sud' }),
    ]);

    expect(textOf(ctx.host.querySelector('h1'))).toBe('Producteurs');
    expect(textOf(ctx.host.querySelector('nav'))).toContain('Accueil');
    expect(textOf(ctx.host.querySelector('nav'))).toContain('Producteurs');
    const text = textOf(ctx.host);
    expect(text).toContain('2 producteurs trouvés');
    expect(text).toContain('Ferme des Vergers du Roy');
    expect(text).toContain('Verger du Sud');
  });

  it("relie chaque carte à la fiche du producteur par son slug, sans catégorie d'origine", async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [
      makeProducerSummary({ id: 'p1', slug: 'ferme-des-vergers' }),
    ]);

    const href = ctx.host.querySelector('ul a')?.getAttribute('href') ?? '';
    expect(href).toBe('/producers/ferme-des-vergers');
  });

  it('envoie les filtres choisis au back', async () => {
    const ctx = await setup();
    showResults(ctx, await nextSearch(ctx), []);

    clickButton(ctx, 'Retrait');
    clickButton(ctx, 'Vérifié');
    const req = await nextSearch(ctx);

    expect(req.request.params.get('pickupAvailable')).toBe('true');
    expect(req.request.params.get('verifiedOnly')).toBe('true');
    expect(req.request.params.has('categoryId')).toBe(false);
    showResults(ctx, req, []);
  });

  it('affiche le total de tous les producteurs et le nombre de pages', async () => {
    const ctx = await setup();

    showPage(ctx, await nextSearch(ctx), makeProducers(12), 30);

    expect(textOf(ctx.host)).toContain('30 producteurs trouvés');
    expect(textOf(paginationNav(ctx))).toContain('Page 1 sur 3');
  });

  it('demande la page suivante au clic sur « Suivant »', async () => {
    const ctx = await setup();
    showPage(ctx, await nextSearch(ctx), makeProducers(12), 30);

    clickButton(ctx, 'Suivant');
    const req = await nextSearch(ctx);

    expect(req.request.params.get('page')).toBe('2');
    showPage(ctx, req, makeProducers(12, 13), 30);
    expect(textOf(paginationNav(ctx))).toContain('Page 2 sur 3');
    expect(textOf(ctx.host)).toContain('Ferme 13');
  });

  it('désactive « Précédent » en première page et « Suivant » en dernière page', async () => {
    const ctx = await setup();
    showPage(ctx, await nextSearch(ctx), makeProducers(12), 30);
    const button = (text: string) =>
      Array.from(ctx.host.querySelectorAll('button')).find((b) => textOf(b) === text)!;

    expect(button('Précédent').disabled).toBe(true);
    expect(button('Suivant').disabled).toBe(false);

    clickButton(ctx, 'Suivant');
    showPage(ctx, await nextSearch(ctx), makeProducers(12, 13), 30);
    clickButton(ctx, 'Suivant');
    showPage(ctx, await nextSearch(ctx), makeProducers(6, 25), 30);

    expect(textOf(paginationNav(ctx))).toContain('Page 3 sur 3');
    expect(button('Suivant').disabled).toBe(true);
    expect(button('Précédent').disabled).toBe(false);
  });

  it('revient en page 1 quand un filtre change', async () => {
    const ctx = await setup();
    showPage(ctx, await nextSearch(ctx), makeProducers(12), 30);
    clickButton(ctx, 'Suivant');
    showPage(ctx, await nextSearch(ctx), makeProducers(12, 13), 30);
    expect(textOf(paginationNav(ctx))).toContain('Page 2 sur 3');

    clickButton(ctx, 'Retrait');
    const req = await nextSearch(ctx);

    // * Sans retour en page 1, on demanderait la page 2 des producteurs qui proposent le retrait
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pickupAvailable')).toBe('true');
    showPage(ctx, req, makeProducers(2), 2);
  });

  it('masque la pagination quand tous les résultats tiennent sur une page', async () => {
    const ctx = await setup();

    showPage(ctx, await nextSearch(ctx), makeProducers(5), 5);

    expect(textOf(ctx.host)).toContain('5 producteurs trouvés');
    expect(paginationNav(ctx)).toBeNull();
  });

  it("retombe sur le nombre de résultats reçus quand l'en-tête X-Total-Count est absent", async () => {
    const ctx = await setup();

    // * flush sans en-tête : par exemple si le CORS ne l'expose pas au navigateur
    showResults(ctx, await nextSearch(ctx), makeProducers(4));

    expect(textOf(ctx.host)).toContain('4 producteurs trouvés');
    expect(paginationNav(ctx)).toBeNull();
  });

  it("affiche l'état vide sans mentionner de catégorie", async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), []);

    const text = textOf(ctx.host);
    expect(text).toContain('Aucun producteur trouvé');
    expect(text).not.toContain('pour «');
  });

  it('affiche une erreur claire quand la recherche échoue', async () => {
    const ctx = await setup();

    const req = await nextSearch(ctx);
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.harness.detectChanges();

    expect(textOf(ctx.host)).toContain('Impossible de charger les producteurs');
  });

  it('définit le titre de la page', async () => {
    const ctx = await setup();
    showResults(ctx, await nextSearch(ctx), []);

    expect(TestBed.inject(Title).getTitle()).toBe('Producteurs – TrouveMoi Agri');
  });

  // * Page de résultats de la recherche (cahier : « recherche produit / localisation ») : /producers?q=&near=&categoryId=
  describe('recherche', () => {
    const input = (ctx: Context, id: string) => ctx.host.querySelector<HTMLInputElement>(`#${id}`)!;

    it("envoie le texte de l'adresse au back dans q, et le rappelle dans le champ et au-dessus des résultats", async () => {
      const ctx = await setup('/producers?q=tomates%20lyon');

      const req = await nextSearch(ctx);

      expect(req.request.params.get('q')).toBe('tomates lyon');
      expect(input(ctx, 'producers-q').value).toBe('tomates lyon');
      expect(textOf(ctx.host)).toContain('Résultats pour « tomates lyon »');
      showResults(ctx, req, []);
    });

    it("n'affiche pas « Résultats » ni q sans recherche", async () => {
      const ctx = await setup();

      const req = await nextSearch(ctx);

      expect(req.request.params.has('q')).toBe(false);
      expect(textOf(ctx.host)).not.toContain('Résultats pour');
      showResults(ctx, req, []);
    });

    it("reprend la localisation de l'adresse dans le champ des filtres", async () => {
      const ctx = await setup('/producers?q=miel&near=Avignon');
      ctx.harness.detectChanges();

      expect(input(ctx, 'producers-near').value).toBe('Avignon');
      expect(input(ctx, 'location').value).toBe('Avignon');
      expect(textOf(ctx.host)).toContain('Résultats pour « miel » près de Avignon');
    });

    it("filtre sur la catégorie de l'adresse, et ignore une valeur qui n'est pas un identifiant", async () => {
      const id = '0f3c9f0e-7c5a-4f6e-9d8b-2a1b3c4d5e6f';
      const withCategory = await setup(`/producers?categoryId=${id}`);
      const req = await nextSearch(withCategory);
      expect(req.request.params.get('categoryId')).toBe(id);
      showResults(withCategory, req, []);

      TestBed.resetTestingModule();
      const invalid = await setup('/producers?categoryId=pas-un-uuid');
      const other = await nextSearch(invalid);
      expect(other.request.params.has('categoryId')).toBe(false);
      showResults(invalid, other, []);
    });

    it("le formulaire change l'adresse (q et near) sans perdre le reste, et vide ce qui est effacé", async () => {
      const ctx = await setup('/producers?q=miel&categoryId=0f3c9f0e-7c5a-4f6e-9d8b-2a1b3c4d5e6f');
      showResults(ctx, await nextSearch(ctx), []);

      input(ctx, 'producers-q').value = '  pommes  ';
      input(ctx, 'producers-near').value = '';
      ctx.host.querySelector('form[role=search]')!.dispatchEvent(new Event('submit'));
      await ctx.harness.fixture.whenStable();

      const url = new URL(
        ctx.harness.routeNativeElement ? 'http://x' + TestBed.inject(Router).url : '',
      );
      expect(url.searchParams.get('q')).toBe('pommes');
      expect(url.searchParams.has('near')).toBe(false);
      expect(url.searchParams.get('categoryId')).toBe('0f3c9f0e-7c5a-4f6e-9d8b-2a1b3c4d5e6f');
    });
  });

  // * Recherche sauvegardée : le bouton n'apparaît que s'il y a une recherche à retenir
  describe('enregistrer la recherche', () => {
    it("propose « Enregistrer cette recherche » quand l'adresse porte une recherche", async () => {
      const ctx = await setup('/producers?q=tomates');
      showResults(ctx, await nextSearch(ctx), []);

      expect(textOf(ctx.host)).toContain('Enregistrer cette recherche');
    });

    it('ne le propose pas sans recherche', async () => {
      const ctx = await setup();
      showResults(ctx, await nextSearch(ctx), []);

      expect(textOf(ctx.host)).not.toContain('Enregistrer cette recherche');
    });
  });

  // * Favoris : un cœur par carte, posé à côté du lien de la fiche (un bouton ne se met pas dans un lien)
  describe('favoris', () => {
    it('met un cœur « Ajouter aux favoris » sur chaque carte, hors du lien vers la fiche', async () => {
      const ctx = await setup();
      showResults(ctx, await nextSearch(ctx), makeProducers(2));

      const hearts = ctx.host.querySelectorAll('app-favorite-button');

      expect(hearts.length).toBe(2);
      expect(hearts[0].querySelector('button')?.getAttribute('aria-label')).toBe(
        'Ajouter aux favoris',
      );
      expect(hearts[0].closest('a')).toBeNull();
      expect(hearts[0].closest('li')?.querySelector('a')?.getAttribute('href')).toBe(
        '/producers/ferme-1',
      );
    });

    it('filtre sur le produit de l’adresse (celui d’un favori), et ignore une valeur qui n’est pas un identifiant', async () => {
      const id = '7b1f1f6e-1b5a-4c6e-8d8b-2a1b3c4d5e6f';
      const ctx = await setup(`/producers?productId=${id}`);
      const req = await nextSearch(ctx);
      expect(req.request.params.get('productId')).toBe(id);
      expect(textOf(ctx.host)).toContain('Producteurs qui proposent ce produit.');
      showResults(ctx, req, []);

      TestBed.resetTestingModule();
      const invalid = await setup('/producers?productId=nimporte-quoi');
      const other = await nextSearch(invalid);
      expect(other.request.params.has('productId')).toBe(false);
      showResults(invalid, other, []);
    });
  });
});
