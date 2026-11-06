import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { MessagesStore } from '../messages-store';
import { MessagesService } from '../messages.service';
import { ProducerConversation, Thread, ThreadMessage } from '../messages.model';
import { ThreadComponent } from './thread.component';

// aujourd'hui a l'heure donnee, dans l'heure locale
const todayAt = (time: string) => `${new Date().toLocaleDateString('sv-SE')}T${time}`;

const message = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
  id: Math.random().toString(),
  senderId: 'client',
  content: 'Bonjour',
  moderated: false,
  isSystem: false,
  createdAt: todayAt('09:12:00'),
  readAt: null,
  attachments: [],
  ...overrides,
});

const CONVERSATION: ProducerConversation = {
  id: 'c1',
  requestId: 'r1',
  clientName: 'Camille R.',
  clientType: 'individual',
  product: 'Tomates bio',
  quantity: 20,
  unit: 'kg',
  status: 'open',
  lastMessageAt: null,
  unreadCount: 0,
  lastMessage: null,
};

const THREAD: Thread = {
  id: 'c1',
  requestId: 'r1',
  status: 'open',
  messages: [
    message({ id: 'm1', senderId: 'client', content: 'Bonjour ! Je souhaite 20kg de tomates.', createdAt: todayAt('09:12:00') }),
    message({ id: 'm2', senderId: 'me', content: 'Bonjour, ce produit est disponible.', createdAt: todayAt('09:14:00'), readAt: todayAt('09:15:00') }),
    message({ id: 'm3', senderId: 'me', content: 'Retrait à la ferme.', createdAt: todayAt('09:16:00') }),
  ],
};

describe('ThreadComponent', () => {
  let fixture: ComponentFixture<ThreadComponent>;
  let compiled: HTMLElement;
  let service: Record<'thread' | 'send' | 'attach' | 'report', ReturnType<typeof vi.fn>>;
  let store: { find: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };

  async function create(thread$: Observable<Thread> = of(THREAD), id = 'c1'): Promise<void> {
    service = {
      thread: vi.fn(() => thread$),
      send: vi.fn(() => of({ id: 'm9' })),
      attach: vi.fn(() => of({ id: 'm9', attachmentId: 'a9' })),
      report: vi.fn(() => of({ id: 'rep1' })),
    };
    store = { find: vi.fn((wanted: string) => (wanted === 'c1' ? CONVERSATION : undefined)), reload: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ThreadComponent],
      providers: [
        provideRouter([]),
        { provide: MessagesService, useValue: service },
        { provide: MessagesStore, useValue: store },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'me' }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
      ],
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ThreadComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => [...compiled.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label);
  const field = () => compiled.querySelector<HTMLInputElement>('input[aria-label="Votre message"]')!;
  const type = (value: string) => {
    field().value = value;
    field().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submitMessage = async () => {
    field().closest('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const bubbleOf = (content: string) => [...compiled.querySelectorAll('[role="log"] > div')].find((d) => d.textContent?.includes(content))!;

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche le client, son type et la demande liée avec un lien vers elle', async () => {
    await create();

    expect(text()).toContain('Camille R.');
    expect(text()).toContain('Client particulier');
    expect(text()).toContain('Demande liée · Tomates bio - 20kg');
    expect(compiled.querySelector('a[href="/producer/requests/r1"]')?.textContent?.trim()).toBe('Voir');
  });

  it('lit le fil de la route et dit au store de relire la liste (le fil lu est marqué comme lu)', async () => {
    await create();

    expect(service.thread).toHaveBeenCalledWith('c1');
    expect(store.reload).toHaveBeenCalled();
  });

  it("met les messages du producteur à droite et ceux du client à gauche, sous un séparateur « Aujourd'hui »", async () => {
    await create();

    expect(text()).toContain("Aujourd'hui");
    expect(bubbleOf('Bonjour ! Je souhaite 20kg').classList.contains('items-start')).toBe(true);
    expect(bubbleOf('Bonjour, ce produit est disponible.').classList.contains('items-end')).toBe(true);
    expect(bubbleOf('Bonjour, ce produit est disponible.').querySelector('.bg-earth')).toBeTruthy();
    expect(bubbleOf('Bonjour ! Je souhaite 20kg').querySelector('.bg-earth')).toBeNull();
  });

  it("écrit l'heure de chaque message, et lu ou non lu seulement sous ceux du producteur", async () => {
    await create();

    expect(bubbleOf('Bonjour ! Je souhaite 20kg').textContent).toContain('09:12');
    expect(bubbleOf('Bonjour ! Je souhaite 20kg').textContent).not.toMatch(/Lu|Envoyé/);
    expect(bubbleOf('Bonjour, ce produit est disponible.').textContent).toContain('Lu');
    expect(bubbleOf('Retrait à la ferme.').textContent).toContain('Envoyé');
  });

  it('un message modéré ne montre pas son texte, un message système est au centre', async () => {
    await create(
      of({
        ...THREAD,
        messages: [
          message({ content: null, moderated: true }),
          message({ senderId: null, isSystem: true, content: 'La conversation a été signalée.' }),
        ],
      }),
    );

    expect(text()).toContain('Message masqué par la modération.');
    const system = [...compiled.querySelectorAll('[role="log"] > p')].find((p) => p.textContent?.includes('a été signalée'));
    expect(system?.classList.contains('text-center')).toBe(true);
  });

  it('montre les pièces jointes comme des liens qui s’ouvrent dans un nouvel onglet', async () => {
    await create(
      of({
        ...THREAD,
        messages: [
          message({ content: null, attachments: [{ id: 'a1', fileName: 'devis-tomates.pdf', mimeType: 'application/pdf', fileSize: 1200, url: 'https://files.test/devis.pdf' }] }),
        ],
      }),
    );

    const link = compiled.querySelector<HTMLAnchorElement>('a[href="https://files.test/devis.pdf"]')!;
    expect(link.textContent).toContain('devis-tomates.pdf');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('invite à écrire le premier message quand le fil est vide', async () => {
    await create(of({ ...THREAD, messages: [] }));

    expect(text()).toContain('Aucun message pour le moment. Écrivez le premier.');
  });

  it("prévient sans détails quand la conversation est inconnue ou n'est pas la sienne", async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 403 })));

    expect(text()).toContain('introuvable ou ne vous est pas accessible');
    expect(field()).toBeNull();
  });

  it('une conversation signalée le dit', async () => {
    await create(of({ ...THREAD, status: 'reported' }));

    expect(text()).toContain("Cette conversation a été signalée, notre équipe l'examine.");
  });

  describe('écrire', () => {
    it('envoie le texte, vide le champ et relit le fil', async () => {
      await create();
      type('  Je vous prépare ça !  ');

      await submitMessage();

      expect(service.send).toHaveBeenCalledWith('c1', 'Je vous prépare ça !');
      expect(field().value).toBe('');
      expect(service.thread).toHaveBeenCalledTimes(2);
    });

    it("n'envoie rien tant que le champ est vide ou ne contient que des espaces", async () => {
      await create();

      expect((button('Envoyer') as HTMLButtonElement).disabled).toBe(true);
      type('   ');
      await submitMessage();

      expect((button('Envoyer') as HTMLButtonElement).disabled).toBe(true);
      expect(service.send).not.toHaveBeenCalled();
    });

    it('affiche le message du back quand l’envoi est refusé et garde le texte saisi', async () => {
      await create();
      service.send.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { error: 'Vous ne pouvez pas contacter cet utilisateur.' } })));
      type('Bonjour');

      await submitMessage();

      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Vous ne pouvez pas contacter cet utilisateur.');
      expect(field().value).toBe('Bonjour');
    });
  });

  describe('réponses rapides', () => {
    it('propose les sept réponses du cahier', async () => {
      await create();

      const chips = [...compiled.querySelectorAll('[role="group"] button')];
      expect(chips.length).toBe(7);
      expect(chips.map((c) => c.getAttribute('title'))).toContain('Le retrait est possible à la ferme.');
      expect(chips.map((c) => c.getAttribute('title'))).toContain('Je vous joins un devis.');
    });

    it("glisse la phrase dans le champ sans l'envoyer, et les suivantes s'ajoutent à la suite", async () => {
      await create();

      button('Retrait ferme')!.click();
      fixture.detectChanges();
      expect(field().value).toBe('Le retrait est possible à la ferme.');

      button('Je vous joins un devis')!.click();
      fixture.detectChanges();
      expect(field().value).toBe('Le retrait est possible à la ferme. Je vous joins un devis.');
      expect(service.send).not.toHaveBeenCalled();
    });
  });

  describe('pièces jointes', () => {
    const choose = async (file: File) => {
      const input = compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('envoie le fichier avec le texte saisi en légende', async () => {
      await create();
      type('Voici le devis');
      const file = new File(['pdf'], 'devis.pdf', { type: 'application/pdf' });

      await choose(file);

      expect(service.attach).toHaveBeenCalledWith('c1', file, 'Voici le devis');
      expect(field().value).toBe('');
    });

    it("refuse un format non supporté sans appeler le back", async () => {
      await create();

      await choose(new File(['x'], 'tableau.xlsx', { type: 'application/vnd.ms-excel' }));

      expect(service.attach).not.toHaveBeenCalled();
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Format non supporté');
    });
  });

  describe('signaler', () => {
    const openReport = () => {
      button('Signaler cette conversation')!.click();
      fixture.detectChanges();
    };
    const pickReason = (code: string) => {
      const radio = compiled.querySelector<HTMLInputElement>(`input[type="radio"][value="${code}"]`)!;
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const submitReport = async () => {
      compiled.querySelector('textarea')!.closest('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('exige un motif, aucun n’est coché d’avance', async () => {
      await create();
      openReport();

      expect([...compiled.querySelectorAll<HTMLInputElement>('input[type="radio"]')].some((r) => r.checked)).toBe(false);
      await submitReport();

      expect(service.report).not.toHaveBeenCalled();
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Choisissez un motif de signalement.');
    });

    it('envoie le motif et la description, referme le formulaire et relit le fil', async () => {
      await create();
      openReport();
      pickReason('circumvention');
      const box = compiled.querySelector('textarea')!;
      box.value = '  Il veut payer ailleurs.  ';
      box.dispatchEvent(new Event('input'));

      await submitReport();

      expect(service.report).toHaveBeenCalledWith('c1', { reason: 'circumvention', message: 'Il veut payer ailleurs.' });
      expect(compiled.querySelector('textarea')).toBeNull();
      expect(service.thread).toHaveBeenCalledTimes(2);
    });

    it('sans description, envoie un message nul', async () => {
      await create();
      openReport();
      pickReason('fraud');

      await submitReport();

      expect(service.report).toHaveBeenCalledWith('c1', { reason: 'fraud', message: null });
    });

    it('« Annuler » referme le formulaire sans rien envoyer', async () => {
      await create();
      openReport();

      button('Annuler')!.click();
      fixture.detectChanges();

      expect(compiled.querySelector('textarea')).toBeNull();
      expect(service.report).not.toHaveBeenCalled();
    });
  });

  it("en mobile, une flèche ramène à la liste et un menu propose de signaler", async () => {
    await create();

    expect(compiled.querySelector('a[aria-label="Retour aux conversations"]')?.getAttribute('href')).toBe('/producer/messages');
    expect(compiled.querySelector('[role="menu"]')).toBeNull();

    button("Plus d'actions")!.click();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="menu"]')?.textContent).toContain('Signaler cette conversation');
  });
});
