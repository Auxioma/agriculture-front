import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { MessagesService } from '../../../producer/messages/messages.service';
import { Thread, ThreadMessage } from '../../../producer/messages/messages.model';
import { ClientConversation } from './client-messages.model';
import { ClientMessagesStore } from './client-messages-store';
import { ClientThreadComponent } from './client-thread.component';

// aujourd'hui a l'heure donnee, dans l'heure locale
const todayAt = (time: string) => `${new Date().toLocaleDateString('sv-SE')}T${time}`;

const message = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
  id: Math.random().toString(),
  senderId: 'producer',
  content: 'Bonjour',
  moderated: false,
  isSystem: false,
  createdAt: todayAt('09:12:00'),
  readAt: null,
  attachments: [],
  ...overrides,
});

const CONVERSATION: ClientConversation = {
  id: 'c1',
  requestId: 'r1',
  producerId: 'p1',
  producerName: 'Ferme des Lilas',
  producerSlug: 'ferme-des-lilas',
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
    message({ id: 'm1', senderId: 'producer', content: 'Oui, disponible cette semaine.', createdAt: todayAt('09:12:00') }),
    message({ id: 'm2', senderId: 'me', content: 'Parfait, je prends 20 kg.', createdAt: todayAt('09:14:00'), readAt: todayAt('09:15:00') }),
    message({ id: 'm3', senderId: 'me', content: 'Retrait samedi ?', createdAt: todayAt('09:16:00') }),
  ],
};

describe('ClientThreadComponent', () => {
  let fixture: ComponentFixture<ClientThreadComponent>;
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
      imports: [ClientThreadComponent],
      providers: [
        provideRouter([]),
        { provide: MessagesService, useValue: service },
        { provide: ClientMessagesStore, useValue: store },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'me' }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
      ],
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ClientThreadComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const field = () => compiled.querySelector<HTMLInputElement>('input[aria-label="Votre message"]')!;
  const type = (value: string) => {
    field().value = value;
    field().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = async () => {
    field().closest('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const bubbleOf = (content: string) =>
    [...compiled.querySelectorAll('[role="log"] > div')].find((d) => d.textContent?.includes(content))!;

  beforeEach(() => TestBed.resetTestingModule());

  it('affiche le producteur et la demande liée avec un lien vers elle', async () => {
    await create();

    expect(text()).toContain('Ferme des Lilas');
    expect(text()).toContain('Demande liée · Tomates bio - 20 kg');
    expect(compiled.querySelector('a[href="/client/requests/r1"]')?.textContent?.trim()).toBe('Voir');
  });

  it('lit le fil de la route et dit au store de relire la liste (le fil lu est marqué comme lu)', async () => {
    await create();

    expect(service.thread).toHaveBeenCalledWith('c1');
    expect(store.reload).toHaveBeenCalled();
  });

  it("met les messages du client à droite et ceux du producteur à gauche, sous un séparateur « Aujourd'hui »", async () => {
    await create();

    expect(text()).toContain("Aujourd'hui");
    expect(bubbleOf('Oui, disponible cette semaine.').classList.contains('items-start')).toBe(true);
    expect(bubbleOf('Parfait, je prends 20 kg.').classList.contains('items-end')).toBe(true);
    expect(bubbleOf('Parfait, je prends 20 kg.').querySelector('.bg-earth')).toBeTruthy();
    expect(bubbleOf('Oui, disponible cette semaine.').querySelector('.bg-earth')).toBeNull();
  });

  it("écrit l'heure de chaque message, et lu ou envoyé seulement sous ceux du client", async () => {
    await create();

    expect(bubbleOf('Oui, disponible cette semaine.').textContent).toContain('09:12');
    expect(bubbleOf('Oui, disponible cette semaine.').textContent).not.toMatch(/Lu|Envoyé/);
    expect(bubbleOf('Parfait, je prends 20 kg.').textContent).toContain('Lu');
    expect(bubbleOf('Retrait samedi ?').textContent).toContain('Envoyé');
  });

  it('un message modéré ne montre pas son texte, un message système est au centre, une pièce jointe est un lien', async () => {
    await create(
      of({
        ...THREAD,
        messages: [
          message({ id: 'a', content: null, moderated: true }),
          message({ id: 'b', senderId: null, isSystem: true, content: 'Devis : 12,50 €/kg' }),
          message({ id: 'c', content: 'Voici le devis', attachments: [{ id: 'f1', fileName: 'devis.pdf', mimeType: 'application/pdf', fileSize: 1000, url: 'https://files/devis.pdf' }] }),
        ],
      }),
    );

    expect(text()).toContain('Message masqué par la modération.');
    const system = [...compiled.querySelectorAll('[role="log"] p')].find((p) => p.textContent?.includes('Devis : 12,50 €/kg'));
    expect(system?.classList.contains('text-center')).toBe(true);
    expect(compiled.querySelector('a[href="https://files/devis.pdf"]')?.textContent).toContain('devis.pdf');
  });

  it('dit quand le fil est vide, sans le chargement', async () => {
    await create(of({ ...THREAD, messages: [] }));

    expect(text()).toContain('Aucun message pour le moment');
  });

  it("dit que la conversation est introuvable quand elle n'est pas la sienne", async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 404 })), 'inconnue');

    expect(text()).toContain('introuvable');
    expect(compiled.querySelector('a[href="/client/messages"]')).toBeTruthy();
  });

  it('signale une conversation que la modération examine', async () => {
    await create(of({ ...THREAD, status: 'reported' }));

    expect(text()).toContain('a été signalée');
  });

  describe('écrire', () => {
    it("envoie le message tel qu'écrit, vide le champ et relit le fil", async () => {
      await create();

      type('  Merci !  ');
      await submit();

      expect(service.send).toHaveBeenCalledWith('c1', 'Merci !');
      expect(field().value).toBe('');
      expect(service.thread).toHaveBeenCalledTimes(2);
    });

    it("n'envoie rien quand le message est vide, et le bouton est grisé", async () => {
      await create();

      type('   ');
      await submit();

      expect(service.send).not.toHaveBeenCalled();
      expect(compiled.querySelector<HTMLButtonElement>('button[aria-label="Envoyer"]')!.disabled).toBe(true);
    });

    it("garde le message écrit et dit pourquoi quand l'envoi échoue", async () => {
      await create();
      service.send.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { error: 'Conversation fermée.' } })));

      type('Bonjour');
      await submit();

      expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Conversation fermée.');
      expect(field().value).toBe('Bonjour');
    });

    it('envoie un fichier accepté avec le texte écrit comme légende', async () => {
      await create();
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      const input = compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      type('La photo');
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(service.attach).toHaveBeenCalledWith('c1', file, 'La photo');
    });

    it('refuse un format de fichier non accepté sans rien envoyer', async () => {
      await create();
      const input = compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [new File(['x'], 'film.mp4', { type: 'video/mp4' })], configurable: true });

      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(service.attach).not.toHaveBeenCalled();
      expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Format non supporté');
    });
  });

  describe('signaler', () => {
    const button = (label: string) =>
      [...compiled.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
      );
    const reportForm = () => compiled.querySelector<HTMLFormElement>('form:not([class*="border-t"])');
    const pick = (code: string) => {
      const radio = compiled.querySelector<HTMLInputElement>(`input[name="reason"][value="${code}"]`)!;
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    it("ouvre le formulaire par « Signaler » (desktop) ou par le menu des trois points (mobile)", async () => {
      await create();
      expect(reportForm()).toBeNull();

      button('Signaler cette conversation')!.click();
      fixture.detectChanges();
      expect(reportForm()).toBeTruthy();

      button('Annuler')!.click();
      fixture.detectChanges();
      expect(reportForm()).toBeNull();

      button("Plus d'actions")!.click();
      fixture.detectChanges();
      compiled.querySelector<HTMLButtonElement>('[role=menuitem]')!.click();
      fixture.detectChanges();
      expect(reportForm()).toBeTruthy();
      expect(compiled.querySelector('[role=menu]')).toBeNull();
    });

    it("ne coche aucun motif d'avance et refuse d'envoyer sans motif", async () => {
      await create();
      button('Signaler cette conversation')!.click();
      fixture.detectChanges();

      expect(compiled.querySelectorAll('input[name="reason"]:checked').length).toBe(0);
      reportForm()!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(service.report).not.toHaveBeenCalled();
      expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Choisissez un motif');
    });

    it('envoie le motif et la description, referme le formulaire et relit le fil', async () => {
      await create();
      button('Signaler cette conversation')!.click();
      fixture.detectChanges();

      pick('circumvention');
      const box = compiled.querySelector<HTMLTextAreaElement>('#report-message')!;
      box.value = '  Il me demande de payer en dehors du site  ';
      box.dispatchEvent(new Event('input'));
      reportForm()!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(service.report).toHaveBeenCalledWith('c1', {
        reason: 'circumvention',
        message: 'Il me demande de payer en dehors du site',
      });
      expect(reportForm()).toBeNull();
      expect(service.thread).toHaveBeenCalledTimes(2);
    });

    it('garde le formulaire ouvert et dit pourquoi quand le signalement échoue', async () => {
      await create();
      service.report.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Déjà signalée.' } })));
      button('Signaler cette conversation')!.click();
      fixture.detectChanges();

      pick('other');
      reportForm()!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Déjà signalée.');
      expect(reportForm()).toBeTruthy();
    });
  });
});
