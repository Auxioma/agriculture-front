import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ClientRequestsComponent } from './client-requests.component';
import { ClientRequestsService } from './client-requests.service';
import { ClientRequestItem } from './client-request.model';

const REQUESTS: ClientRequestItem[] = [
  {
    id: '1',
    title: 'Tomates bio - 5kg',
    status: 'replies_received',
    sentAt: '2026-08-12T12:00:00Z',
  },
  { id: '2', title: 'Miel de fleurs - 2pots', status: 'sent', sentAt: '2026-08-15T12:00:00Z' },
  {
    id: '3',
    title: 'Pommes de terre - 10kg',
    status: 'conversation_open',
    sentAt: '2026-08-09T12:00:00Z',
  },
  { id: '4', title: 'Fromage de chèvre', status: 'archived', sentAt: '2026-08-02T12:00:00Z' },
  { id: '5', title: 'Vin rouge - 6bouteilles', status: 'expired', sentAt: '2026-07-28T12:00:00Z' },
];

describe('ClientRequestsComponent', () => {
  let fixture: ComponentFixture<ClientRequestsComponent>;
  const api = {
    list: vi.fn(),
    cancel: vi.fn(),
    archive: vi.fn(),
    duplicate: vi.fn(),
  };

  // Le composant appelle list() dès sa création : le mock doit être prêt AVANT createComponent
  function create(list$: Observable<ClientRequestItem[]> = of(REQUESTS)) {
    api.list.mockReturnValue(list$);
    fixture = TestBed.createComponent(ClientRequestsComponent);
    fixture.detectChanges();
  }

  // --- petits helpers de lecture du DOM ---
  const root = () => fixture.nativeElement as HTMLElement;
  const cards = () => root().querySelectorAll('ul.grid > li');
  const tab = (label: string) => {
    const btn = Array.from(
      root().querySelectorAll<HTMLButtonElement>('app-filter-tabs button'),
    ).find((b) => b.textContent?.trim() === label);
    if (!btn) throw new Error(`Onglet « ${label} » introuvable dans le DOM`);
    return btn;
  };
  const kebab = (index: number) =>
    cards()[index].querySelector<HTMLButtonElement>('button[aria-label="Actions"]')!;
  const menuButton = (label: string) =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('li ul button')).find(
      (b) => b.textContent?.trim() === label,
    );
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.resetAllMocks(); // repart de mocks vierges à chaque test
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ClientRequestsService, useValue: api }],
    });
  });

  describe('chargement', () => {
    it('affiche « Chargement… » puis la liste', () => {
      const pending$ = new Subject<ClientRequestItem[]>();
      create(pending$);
      expect(root().textContent).toContain('Chargement');

      pending$.next(REQUESTS);
      fixture.detectChanges();

      expect(root().textContent).not.toContain('Chargement');
      expect(cards().length).toBe(5);
    });

    it("affiche un message d'erreur si l'API échoue", () => {
      create(throwError(() => new Error('500')));
      expect(root().textContent).toContain('Impossible de charger vos demandes');
      expect(cards().length).toBe(0);
    });

    it('affiche un message si aucune demande', () => {
      create(of([]));
      expect(root().textContent).toContain('Aucune demande dans cette catégorie');
    });
  });

  describe('affichage des cartes', () => {
    beforeEach(() => create());

    it("affiche titre et date d'envoi en français", () => {
      expect(cards()[0].textContent).toContain('Tomates bio - 5kg');
      expect(cards()[0].textContent).toContain('Envoyée le 12 août');
    });

    it('affiche le bon libellé de badge selon le statut', () => {
      expect(cards()[0].textContent).toContain('Réponses reçues');
      expect(cards()[1].textContent).toContain('En attente');
      expect(cards()[2].textContent).toContain('Conversation ouverte');
      expect(cards()[3].textContent).toContain('Archivée');
      expect(cards()[4].textContent).toContain('Expirée');
    });
  });

  describe('filtres', () => {
    beforeEach(() => create());

    it('« Toutes » est actif par défaut', () => {
      expect(tab('Toutes').getAttribute('aria-pressed')).toBe('true');
      expect(cards().length).toBe(5);
    });

    it('« En attente » ne garde que sent / waiting_replies', () => {
      click(tab('En attente'));
      expect(cards().length).toBe(1);
      expect(cards()[0].textContent).toContain('Miel de fleurs');
    });

    it('« Réponses reçues » garde replies_received et conversation_open', () => {
      click(tab('Réponses reçues'));
      expect(cards().length).toBe(2);
    });

    it('« Archivées » garde archived et expired', () => {
      click(tab('Archivées'));
      expect(cards().length).toBe(2);
      expect(tab('Archivées').getAttribute('aria-pressed')).toBe('true');
      expect(tab('Toutes').getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('menu ⋮', () => {
    beforeEach(() => create());

    it("s'ouvre au clic et reste ouvert (stopPropagation)", () => {
      expect(menuButton('Dupliquer')).toBeUndefined();
      click(kebab(0));
      expect(menuButton('Dupliquer')).toBeDefined();
    });

    it('se ferme au clic en dehors', () => {
      click(kebab(0));
      click(document.body); // le clic remonte jusqu'à `document`
      expect(menuButton('Dupliquer')).toBeUndefined();
    });

    it('un second clic sur ⋮ referme le menu', () => {
      click(kebab(0));
      click(kebab(0));
      expect(menuButton('Dupliquer')).toBeUndefined();
    });

    it('une seule carte a son menu ouvert à la fois', () => {
      click(kebab(0));
      click(kebab(1));
      expect(root().querySelectorAll('li ul').length).toBe(1);
    });

    it('propose Archiver et Annuler pour une demande active', () => {
      click(kebab(0));
      expect(menuButton('Archiver')).toBeDefined();
      expect(menuButton('Annuler')).toBeDefined();
    });

    it('ne propose que Dupliquer pour une demande archivée', () => {
      click(kebab(3)); // « Fromage de chèvre » (archived)
      expect(menuButton('Dupliquer')).toBeDefined();
      expect(menuButton('Archiver')).toBeUndefined();
      expect(menuButton('Annuler')).toBeUndefined();
    });
  });

  describe('actions', () => {
    beforeEach(() => create());

    it("Archiver appelle l'API puis recharge la liste", () => {
      api.archive.mockReturnValue(of(undefined));
      click(kebab(0));

      click(menuButton('Archiver')!);

      expect(api.archive).toHaveBeenCalledWith('1');
      expect(api.list).toHaveBeenCalledTimes(2); // chargement initial + rechargement
    });

    it("Annuler appelle l'API puis recharge la liste", () => {
      api.cancel.mockReturnValue(of(undefined));
      click(kebab(1));

      click(menuButton('Annuler')!);

      expect(api.cancel).toHaveBeenCalledWith('2');
      expect(api.list).toHaveBeenCalledTimes(2);
    });

    it("Dupliquer appelle l'API puis recharge la liste", () => {
      api.duplicate.mockReturnValue(of({ id: 'copy' }));
      click(kebab(2));

      click(menuButton('Dupliquer')!);

      expect(api.duplicate).toHaveBeenCalledWith('3');
      expect(api.list).toHaveBeenCalledTimes(2);
    });
  });
});
