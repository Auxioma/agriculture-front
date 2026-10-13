import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { ProducerDetail, ProducerReviews } from '../../models/producer-detail.model';
import {
  makeCategory,
  makeProducerDetail,
  makeReview,
  makeReviews,
  textOf,
} from '../../testing/catalog.fixtures';
import { ProducerDetailComponent } from './producer-detail.component';

describe('ProducerDetailComponent', () => {
  const apiUrl = environment.apiURL;
  const noReviews: ProducerReviews = { averageRating: null, count: 0, reviews: [] };

  /** Ouvre /producers/p1 (avec éventuellement une query string) ; les réponses sont données ensuite */
  async function setup(url = '/producers/p1') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'producers/:id', component: ProducerDetailComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ProducerDetailComponent);

    return {
      harness,
      http: TestBed.inject(HttpTestingController),
      host: harness.routeNativeElement as HTMLElement,
    };
  }

  type Context = Awaited<ReturnType<typeof setup>>;

  /** Répond à la fiche et aux avis, puis met l'affichage à jour */
  function respond(
    ctx: Context,
    producer: ProducerDetail,
    reviews: ProducerReviews = noReviews,
  ): void {
    ctx.http.expectOne(`${apiUrl}/producers/p1`).flush(producer);
    ctx.http.expectOne(`${apiUrl}/producers/p1/reviews`).flush(reviews);
    ctx.harness.detectChanges();
  }

  function linkByText(host: HTMLElement, text: string): HTMLAnchorElement {
    const link = Array.from(host.querySelectorAll('a')).find((a) => textOf(a) === text);
    if (!link) throw new Error(`Lien « ${text} » introuvable`);

    return link;
  }

  it("affiche un état de chargement tant que la fiche n'est pas arrivée", async () => {
    const { host } = await setup();

    expect(textOf(host)).toContain('Chargement de la fiche producteur');
  });

  it('affiche le nom, la ville, les badges (dont Vérifié) et la note issue des avis', async () => {
    const ctx = await setup();

    respond(
      ctx,
      makeProducerDetail({
        labels: [
          { code: 'bio', name: 'Bio' },
          { code: 'local', name: 'Local' },
        ],
      }),
      makeReviews([makeReview()], 4.9),
    );

    const text = textOf(ctx.host);
    expect(textOf(ctx.host.querySelector('h1'))).toBe('Ferme des Vergers du Roy');
    expect(text).toContain('Avignon');
    expect(text).toContain('Bio');
    expect(text).toContain('Local');
    expect(text).toContain('Vérifié');
    expect(text).toContain('4.9');
  });

  it("n'affiche pas le badge Vérifié pour un producteur non vérifié", async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail({ verificationStatus: 'pending' }));

    expect(textOf(ctx.host)).not.toContain('Vérifié');
  });

  it('liste les produits avec leur période de disponibilité', async () => {
    const ctx = await setup();

    respond(
      ctx,
      makeProducerDetail({
        products: [
          { id: 'a', name: 'Miel', seasonStartMonth: 1, seasonEndMonth: 12 },
          { id: 'b', name: 'Tomates', seasonStartMonth: 6, seasonEndMonth: 9 },
          { id: 'c', name: 'Cerises', seasonStartMonth: null, seasonEndMonth: null },
        ],
      }),
    );

    const text = textOf(ctx.host);
    expect(text).toContain("Miel — Disponible toute l'année");
    expect(text).toContain('Tomates — Disponible de juin à septembre');
    // * Saison inconnue : le produit est listé sans période.
    expect(text).toContain('Cerises');
    expect(text).not.toContain('Cerises —');
    expect(textOf(linkByTextOrButton(ctx.host, 'Voir les disponibilités'))).toBe(
      'Voir les disponibilités',
    );
  });

  it('masque les sections sans donnée au lieu de les afficher vides', async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail({ description: null, story: null }));

    const text = textOf(ctx.host);
    expect(text).not.toContain('Produits & disponibilités');
    expect(text).not.toContain('Notre histoire');
    expect(text).not.toContain('Retrait, livraison & horaires');
    expect(text).not.toContain('Voir les disponibilités');
  });

  it("affiche l'histoire plutôt que la description quand elle existe", async () => {
    const withStory = await setup();
    respond(
      withStory,
      makeProducerDetail({ story: 'Installée depuis 1978', description: 'Courte description' }),
    );
    expect(textOf(withStory.host)).toContain('Installée depuis 1978');
    expect(textOf(withStory.host)).not.toContain('Courte description');
  });

  it("retombe sur la description quand il n'y a pas d'histoire", async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail({ story: null, description: 'Courte description' }));

    expect(textOf(ctx.host)).toContain('Notre histoire & savoir-faire');
    expect(textOf(ctx.host)).toContain('Courte description');
  });

  it('résume zone de vente, horaires, retrait et livraison', async () => {
    const ctx = await setup();

    respond(
      ctx,
      makeProducerDetail({
        deliveryZones: [{ radiusKm: '20.00', rules: null }],
        openingHours: [1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          opensAt: '09:00',
          closesAt: '18:00',
          isClosed: false,
        })),
        pickupAvailable: true,
        deliveryAvailable: false,
      }),
    );

    const text = textOf(ctx.host);
    expect(text).toContain('Retrait, livraison & horaires');
    expect(text).toContain('Rayon de 20 km');
    expect(text).toContain('Lun-Sam 9h-18h');
    expect(text).toContain('Possible');
    expect(text).toContain('Non proposée');
  });

  it("ne parle ni de retrait ni de livraison quand l'API ne le dit pas", async () => {
    const ctx = await setup();

    respond(
      ctx,
      makeProducerDetail({
        openingHours: [{ weekday: 1, opensAt: '09:00', closesAt: '18:00', isClosed: false }],
      }),
    );

    // * Le titre de la section contient « Retrait » : on vérifie donc les VALEURS, pas le mot.
    const text = textOf(ctx.host);
    expect(text).toContain('Lun 9h-18h');
    expect(text).not.toContain('Possible');
    expect(text).not.toContain('Non proposé');
    expect(text).not.toContain('Non proposée');
  });

  it('affiche deux avis puis tous les avis après « Voir tous les avis »', async () => {
    const ctx = await setup();
    respond(
      ctx,
      makeProducerDetail(),
      makeReviews([
        makeReview({ id: 'r1', comment: 'Premier avis', authorName: 'Camille R.' }),
        makeReview({ id: 'r2', comment: 'Deuxième avis' }),
        makeReview({ id: 'r3', comment: 'Troisième avis' }),
      ]),
    );
    expect(textOf(ctx.host)).toContain('Avis clients (3)');
    expect(textOf(ctx.host)).toContain('Camille R.');
    expect(textOf(ctx.host)).toContain('Client');
    expect(textOf(ctx.host)).not.toContain('Troisième avis');

    Array.from(ctx.host.querySelectorAll('button'))
      .find((b) => textOf(b) === 'Voir tous les avis')!
      .click();
    ctx.harness.detectChanges();

    expect(textOf(ctx.host)).toContain('Troisième avis');
    expect(textOf(ctx.host)).toContain('Réduire les avis');
  });

  it("affiche la réponse du producteur sous l'avis", async () => {
    const ctx = await setup();

    respond(
      ctx,
      makeProducerDetail(),
      makeReviews([makeReview({ producerResponse: 'Merci beaucoup !' })]),
    );

    expect(textOf(ctx.host)).toContain('Réponse du producteur');
    expect(textOf(ctx.host)).toContain('Merci beaucoup !');
  });

  it("indique l'absence d'avis", async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail(), noReviews);

    expect(textOf(ctx.host)).toContain('Aucun avis pour le moment');
  });

  it('affiche quand même la fiche si les avis ne se chargent pas', async () => {
    const ctx = await setup();

    ctx.http.expectOne(`${apiUrl}/producers/p1`).flush(makeProducerDetail());
    ctx.http
      .expectOne(`${apiUrl}/producers/p1/reviews`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.harness.detectChanges();

    expect(textOf(ctx.host.querySelector('h1'))).toBe('Ferme des Vergers du Roy');
    expect(textOf(ctx.host)).toContain('Les avis ne sont pas disponibles pour le moment');
  });

  it('affiche la photo de couverture quand le producteur en a une', async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail({ photoUrl: '/images/producers/ferme.jpg' }));

    const image = ctx.host.querySelector('img');
    expect(image?.getAttribute('src')).toContain('/images/producers/ferme.jpg');
    expect(image?.getAttribute('alt')).toBe('Ferme des Vergers du Roy');
  });

  it('relie « Contacter » et « Demander un prix » au tunnel de demande, avec le producteur', async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail());

    const contact = linkByText(ctx.host, 'Contacter').getAttribute('href') ?? '';
    const price = linkByText(ctx.host, 'Demander un prix').getAttribute('href') ?? '';
    expect(contact).toContain('/requests/new');
    expect(contact).toContain('producerId=p1');
    expect(contact).toContain('intent=contact');
    expect(price).toContain('producerId=p1');
    expect(price).toContain('intent=price');
  });

  it('adapte le titre et la description de la page au producteur', async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail({ description: 'Une ferme locale' }));

    expect(TestBed.inject(Title).getTitle()).toBe('Ferme des Vergers du Roy – TrouveMoi Agri');
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe('Une ferme locale');
  });

  it("ajoute la catégorie d'origine au fil d'Ariane quand l'URL la précise", async () => {
    const ctx = await setup('/producers/p1?category=fruits');

    ctx.http
      .expectOne((r) => r.url === `${apiUrl}/categories`)
      .flush([makeCategory({ id: 'c1', name: 'Fruits', slug: 'fruits' })]);
    respond(ctx, makeProducerDetail());

    const breadcrumb = textOf(ctx.host.querySelector('nav'));
    expect(breadcrumb).toContain('Catégories');
    expect(breadcrumb).toContain('Fruits');
    expect(breadcrumb).toContain('Ferme des Vergers du Roy');
  });

  it("n'interroge pas les catégories quand l'URL n'en précise pas", async () => {
    const ctx = await setup();

    respond(ctx, makeProducerDetail());

    ctx.http.expectNone((r) => r.url === `${apiUrl}/categories`);
  });

  it('signale un producteur introuvable (404)', async () => {
    const ctx = await setup();

    ctx.http
      .expectOne(`${apiUrl}/producers/p1`)
      .flush({ error: 'Producteur introuvable.' }, { status: 404, statusText: 'Not Found' });
    ctx.http
      .expectOne(`${apiUrl}/producers/p1/reviews`)
      .flush({ error: 'Producteur introuvable.' }, { status: 404, statusText: 'Not Found' });
    ctx.harness.detectChanges();

    expect(textOf(ctx.host)).toContain("n'existe pas ou n'est plus disponible");
  });

  it("distingue une panne serveur d'un producteur introuvable", async () => {
    const ctx = await setup();

    ctx.http
      .expectOne(`${apiUrl}/producers/p1`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.http
      .expectOne(`${apiUrl}/producers/p1/reviews`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    ctx.harness.detectChanges();

    const text = textOf(ctx.host);
    expect(text).toContain('Impossible de charger la fiche du producteur');
    expect(text).not.toContain("n'existe pas");
  });
});

/** Lien (<a>) ou bouton dont le texte est exactement celui demandé */
function linkByTextOrButton(host: HTMLElement, text: string): HTMLElement {
  const element = Array.from(host.querySelectorAll('a, button')).find((e) => textOf(e) === text);
  if (!element) throw new Error(`Élément « ${text} » introuvable`);

  return element as HTMLElement;
}
