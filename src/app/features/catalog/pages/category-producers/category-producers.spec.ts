import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { ProducerSummary } from '../../models/producer-summary.model';
import {
  makeCategory,
  makeLabel,
  makeProducerSummary,
  SEARCH_DEBOUNCE_WAIT_MS,
  sleep,
  textOf,
} from '../../testing/catalog.fixtures';
import { CategoryProducersComponent } from './category-producers.component';

describe('CategoryProducersComponent', () => {
  const apiUrl = environment.apiURL;
  const producersUrl = `${apiUrl}/producers`;
  const geocodingUrl = 'https://api-adresse.data.gouv.fr/search/';

  /** Ouvre /categories/<slug> et répond aux deux requêtes de démarrage (catégories, labels) */
  async function setup(slug = 'fruits') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'categories/:slug', component: CategoryProducersComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/categories/${slug}`, CategoryProducersComponent);
    const http = TestBed.inject(HttpTestingController);

    http
      .expectOne((r) => r.url === `${apiUrl}/categories`)
      .flush([makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' })]);
    http
      .expectOne((r) => r.url === `${apiUrl}/labels`)
      .flush([
        makeLabel({ id: 'l1', code: 'bio', name: 'Bio' }),
        makeLabel({ id: 'l2', code: 'local', name: 'Local' }),
      ]);
    harness.detectChanges();

    return { harness, http, host: harness.routeNativeElement as HTMLElement };
  }

  type Context = Awaited<ReturnType<typeof setup>>;

  /**
   * Laisse passer le debounce (200 ms) puis renvoie la requête GET /producers lancée.
   * detectChanges() AVANT d'attendre : c'est lui qui déclenche l'effet qui démarre le minuteur.
   */
  async function nextSearch(ctx: Context): Promise<TestRequest> {
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);

    return ctx.http.expectOne((r) => r.url === producersUrl);
  }

  function showResults(ctx: Context, req: TestRequest, producers: ProducerSummary[]): void {
    req.flush(producers);
    ctx.harness.detectChanges();
  }

  /** Répond à TOUTE requête de géocodage en attente (une recherche peut en lancer une à chaque fois) */
  function answerGeocoding(ctx: Context, coordinates: [number, number] = [4.8057, 43.9493]): void {
    for (const req of ctx.http.match((r) => r.url === geocodingUrl)) {
      req.flush({ features: [{ geometry: { coordinates } }] });
    }
  }

  function clickButton(ctx: Context, text: string): void {
    const button = Array.from(ctx.host.querySelectorAll('button')).find((b) => textOf(b) === text);
    if (!button) throw new Error(`Bouton « ${text} » introuvable`);
    button.click();
    ctx.harness.detectChanges();
  }

  function paramKeys(req: TestRequest): string[] {
    return req.request.params.keys().sort();
  }

  it('cherche les producteurs de la catégorie du slug, première page comprise', async () => {
    const ctx = await setup();

    const req = await nextSearch(ctx);

    // * Sans autre filtre : la catégorie et la pagination (page 1, 12 par page) seulement
    expect(paramKeys(req)).toEqual(['categoryId', 'page', 'pageSize']);
    expect(req.request.params.get('categoryId')).toBe('c1');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('12');
    showResults(ctx, req, []);
  });

  it('garde la catégorie quand on passe à la page suivante', async () => {
    const ctx = await setup();
    const firstPage = await nextSearch(ctx);
    firstPage.flush(
      Array.from({ length: 12 }, (_, i) =>
        makeProducerSummary({ id: `p${i}`, slug: `ferme-${i}` }),
      ),
      { headers: { 'X-Total-Count': '30' } },
    );
    ctx.harness.detectChanges();

    clickButton(ctx, 'Suivant');
    const req = await nextSearch(ctx);

    expect(req.request.params.get('categoryId')).toBe('c1');
    expect(req.request.params.get('page')).toBe('2');
    showResults(ctx, req, []);
  });

  it("affiche les producteurs, leur nombre et la catégorie dans le fil d'Ariane", async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [
      makeProducerSummary({ id: 'p1', farmName: 'Ferme des Vergers du Roy' }),
      makeProducerSummary({ id: 'p2', farmName: 'Verger du Sud' }),
    ]);

    const text = textOf(ctx.host);
    expect(text).toContain('2 producteurs trouvés');
    expect(text).toContain('Ferme des Vergers du Roy');
    expect(text).toContain('Verger du Sud');
    expect(textOf(ctx.host.querySelector('nav'))).toContain('Fruits');
  });

  it('accorde le compteur au singulier', async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [makeProducerSummary()]);

    expect(textOf(ctx.host)).toContain('1 producteur trouvé');
  });

  it('affiche ville, distance arrondie, note et labels de chaque carte', async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [
      makeProducerSummary({
        city: 'Avignon',
        distanceKm: 14.23,
        averageRating: 4.9,
        labels: [{ code: 'bio', name: 'Bio' }],
      }),
    ]);

    const text = textOf(ctx.host);
    expect(text).toContain('Avignon · 14 km');
    expect(text).toContain('4.9');
    expect(text).toContain('Bio');
  });

  it("relie chaque carte à la fiche du producteur par son slug, en gardant la catégorie d'origine", async () => {
    const ctx = await setup();

    showResults(ctx, await nextSearch(ctx), [
      makeProducerSummary({ id: 'p1', slug: 'ferme-des-vergers' }),
    ]);

    const href = ctx.host.querySelector('ul a')?.getAttribute('href') ?? '';
    expect(href).toContain('/producers/ferme-des-vergers');
    expect(href).toContain('category=fruits');
  });

  it('regroupe plusieurs changements de filtres en UNE recherche (debounce) avec les bons paramètres', async () => {
    const ctx = await setup();

    clickButton(ctx, 'Retrait');
    clickButton(ctx, 'Livraison');
    clickButton(ctx, 'Produits de saison actuellement');
    clickButton(ctx, 'Vérifié');
    clickButton(ctx, 'Bio');
    clickButton(ctx, 'Local');
    const fourStars = ctx.host.querySelector<HTMLButtonElement>(
      'button[aria-label="4 étoiles minimum"]',
    );
    fourStars?.click();
    ctx.harness.detectChanges();

    // * expectOne échoue s'il y a plusieurs requêtes : cela prouve aussi que le debounce regroupe les clics.
    const req = await nextSearch(ctx);

    expect(req.request.params.get('pickupAvailable')).toBe('true');
    expect(req.request.params.get('deliveryAvailable')).toBe('true');
    expect(req.request.params.get('seasonal')).toBe('true');
    expect(req.request.params.get('verifiedOnly')).toBe('true');
    expect(req.request.params.get('labels')).toBe('bio,local');
    expect(req.request.params.get('minRating')).toBe('4');
    showResults(ctx, req, []);
  });

  it('retire un label ou une note en recliquant dessus', async () => {
    const ctx = await setup();
    showResults(ctx, await nextSearch(ctx), []);

    clickButton(ctx, 'Bio');
    clickButton(ctx, 'Bio');
    const req = await nextSearch(ctx);

    expect(req.request.params.has('labels')).toBe(false);
    showResults(ctx, req, []);
  });

  it('propose les tris popularité et nouveauté et les envoie au back', async () => {
    const ctx = await setup();
    showResults(ctx, await nextSearch(ctx), []);
    const select = ctx.host.querySelector<HTMLSelectElement>('#sort')!;

    select.value = 'newest';
    select.dispatchEvent(new Event('change'));
    const newest = await nextSearch(ctx);
    expect(newest.request.params.get('sort')).toBe('newest');
    showResults(ctx, newest, []);

    select.value = 'popularity';
    select.dispatchEvent(new Event('change'));
    const popularity = await nextSearch(ctx);
    expect(popularity.request.params.get('sort')).toBe('popularity');
    showResults(ctx, popularity, []);
  });

  it("désactive le tri par distance et le rayon tant qu'aucune localisation n'est saisie", async () => {
    const ctx = await setup();

    const distanceOption = ctx.host.querySelector<HTMLOptionElement>(
      '#sort option[value="distance"]',
    )!;
    const radius = ctx.host.querySelector<HTMLSelectElement>('#radius')!;

    expect(distanceOption.disabled).toBe(true);
    expect(radius.disabled).toBe(true);
  });

  it('convertit la localisation en coordonnées avant de chercher, puis active rayon et distance', async () => {
    const ctx = await setup();
    const input = ctx.host.querySelector<HTMLInputElement>('#location')!;

    input.value = 'Avignon';
    input.dispatchEvent(new Event('change'));
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);

    const geocoding = ctx.http.expectOne((r) => r.url === geocodingUrl);
    expect(geocoding.request.params.get('q')).toBe('Avignon');
    geocoding.flush({ features: [{ geometry: { coordinates: [4.8057, 43.9493] } }] });
    const req = ctx.http.expectOne((r) => r.url === producersUrl);

    expect(req.request.params.get('latitude')).toBe('43.9493');
    expect(req.request.params.get('longitude')).toBe('4.8057');
    expect(req.request.params.get('radiusKm')).toBe('25');
    showResults(ctx, req, []);
    expect(ctx.host.querySelector<HTMLSelectElement>('#radius')!.disabled).toBe(false);
    expect(
      ctx.host.querySelector<HTMLOptionElement>('#sort option[value="distance"]')!.disabled,
    ).toBe(false);
  });

  it('envoie le tri par distance une fois la localisation connue', async () => {
    const ctx = await setup();
    const input = ctx.host.querySelector<HTMLInputElement>('#location')!;
    input.value = 'Avignon';
    input.dispatchEvent(new Event('change'));
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);
    answerGeocoding(ctx);
    showResults(
      ctx,
      ctx.http.expectOne((r) => r.url === producersUrl),
      [],
    );

    const select = ctx.host.querySelector<HTMLSelectElement>('#sort')!;
    select.value = 'distance';
    select.dispatchEvent(new Event('change'));
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);
    answerGeocoding(ctx);
    const req = ctx.http.expectOne((r) => r.url === producersUrl);

    expect(req.request.params.get('sort')).toBe('distance');
    expect(req.request.params.get('latitude')).toBe('43.9493');
    showResults(ctx, req, []);
  });

  it('affiche « Lieu introuvable » et ne lance pas de recherche si la localisation est inconnue', async () => {
    const ctx = await setup();
    const input = ctx.host.querySelector<HTMLInputElement>('#location')!;

    input.value = 'zzzzzz';
    input.dispatchEvent(new Event('change'));
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);
    ctx.http.expectOne((r) => r.url === geocodingUrl).flush({ features: [] });
    ctx.harness.detectChanges();

    expect(textOf(ctx.host)).toContain('Lieu introuvable');
    ctx.http.expectNone((r) => r.url === producersUrl);
  });

  it("affiche l'état vide, et « Réinitialiser les filtres » les remet à zéro", async () => {
    const ctx = await setup();
    clickButton(ctx, 'Retrait');
    const filtered = await nextSearch(ctx);
    expect(filtered.request.params.get('pickupAvailable')).toBe('true');
    showResults(ctx, filtered, []);
    expect(textOf(ctx.host)).toContain('Aucun producteur trouvé');

    clickButton(ctx, 'Réinitialiser les filtres');
    const reset = await nextSearch(ctx);

    expect(reset.request.params.has('pickupAvailable')).toBe(false);
    showResults(ctx, reset, [makeProducerSummary({ farmName: 'Ferme retrouvée' })]);
    expect(textOf(ctx.host)).toContain('Ferme retrouvée');
  });

  it('affiche une erreur claire quand la recherche échoue', async () => {
    const ctx = await setup();

    const req = await nextSearch(ctx);
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.harness.detectChanges();

    expect(textOf(ctx.host)).toContain('Impossible de charger les producteurs');
  });

  it('signale une catégorie inconnue sans lancer de recherche', async () => {
    const ctx = await setup('inconnue');
    ctx.harness.detectChanges();
    await sleep(SEARCH_DEBOUNCE_WAIT_MS);

    expect(textOf(ctx.host)).toContain("Cette catégorie n'existe pas");
    ctx.http.expectNone((r) => r.url === producersUrl);
  });
});
