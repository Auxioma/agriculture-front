import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
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
// * (category-producers.spec.ts) : ils vivent dans ProducerListComponent, partagé. Ici, seulement ce qui
// * est propre à /producers : aucune catégorie, fil d'Ariane, titre de la page, liens vers les fiches.
describe('ProducersComponent', () => {
  const apiUrl = environment.apiURL;
  const producersUrl = `${apiUrl}/producers`;

  /** Ouvre /producers et répond à la seule requête de démarrage (labels des filtres) */
  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'producers', component: ProducersComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/producers', ProducersComponent);
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

  function clickButton(ctx: Context, text: string): void {
    const button = Array.from(ctx.host.querySelectorAll('button')).find((b) => textOf(b) === text);
    if (!button) throw new Error(`Bouton « ${text} » introuvable`);
    button.click();
    ctx.harness.detectChanges();
  }

  it('cherche tous les producteurs actifs, sans filtre de catégorie', async () => {
    const ctx = await setup();

    const req = await nextSearch(ctx);

    expect(req.request.params.keys()).toEqual([]);
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
});
