import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaqService } from '../../home/faq.service';
import { SupportComponent } from './support.component';
import { SupportService, SupportTicket } from './support.service';

const FAQ = ['Combien coûte l\'abonnement ?', 'Puis-je annuler ?', 'Comment recevoir plus de demandes ?', 'Une quatrième question'].map((question, i) => ({
  id: String(i),
  category: 'Producteurs',
  question,
  answer: `Réponse ${i}`,
}));

const TICKETS: SupportTicket[] = [
  { id: 't1', subject: 'Problème de facturation', status: 'resolved', createdAt: '2026-08-03T10:00:00+00:00' },
  { id: 't2', subject: 'Question sur mon profil producteur', status: 'in_progress', createdAt: '2026-08-10T10:00:00+00:00' },
];

describe('SupportComponent', () => {
  let fixture: ComponentFixture<SupportComponent>;
  let compiled: HTMLElement;
  let serviceMock: { getTickets: ReturnType<typeof vi.fn>; createTicket: ReturnType<typeof vi.fn> };

  async function create(tickets$: Observable<SupportTicket[]> = of(TICKETS), faq$: Observable<unknown[]> = of(FAQ)): Promise<void> {
    serviceMock = { getTickets: vi.fn(() => tickets$), createTicket: vi.fn(() => of({ id: 't3' })) };
    await TestBed.configureTestingModule({
      imports: [SupportComponent],
      providers: [provideRouter([]), { provide: SupportService, useValue: serviceMock }, { provide: FaqService, useValue: { getAll: vi.fn(() => faq$) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SupportComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = () => compiled.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const field = (id: string) => compiled.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
  const fill = (id: string, value: string) => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('montre les trois premières questions de la FAQ et le lien vers toute la FAQ', async () => {
    await create();

    expect(text()).toContain("Combien coûte l'abonnement ?");
    expect(text()).toContain('Comment recevoir plus de demandes ?');
    expect(text()).not.toContain('Une quatrième question');
    expect(compiled.querySelector('a[href="/faq"]')?.textContent?.trim()).toBe('Voir toute la FAQ →');
  });

  it('préfère les questions de la rubrique des producteurs', async () => {
    const clients = [{ id: 'c1', category: 'Clients', question: 'Question pour les clients', answer: 'Réponse' }];
    await create(of(TICKETS), of([...clients, ...FAQ.slice(0, 2)]));

    expect(text()).toContain("Combien coûte l'abonnement ?");
    expect(text()).not.toContain('Question pour les clients');
  });

  it('sans FAQ, n\'affiche pas la rubrique', async () => {
    await create(of(TICKETS), of([]));

    expect(text()).not.toContain('Questions fréquentes');
  });

  it('liste ses demandes de support avec leur statut', async () => {
    await create();

    const items = [...compiled.querySelectorAll('ul li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items[0]).toContain('Problème de facturation');
    expect(items[0]).toContain('3 août');
    expect(items[0]).toContain('Résolu');
    expect(items[1]).toContain('En cours');
  });

  it('dit quand on n\'a encore rien envoyé, ou quand la liste ne charge pas', async () => {
    await create(of([]));
    expect(text()).toContain("Vous n'avez pas encore contacté le support.");

    TestBed.resetTestingModule();
    await create(throwError(() => new Error('API down')));
    expect(text()).toContain('Impossible de charger vos demandes');
  });

  it('refuse d\'envoyer un message sans sujet ou sans texte', async () => {
    await create();
    fill('subject', 'Question');

    submit();

    expect(serviceMock.createTicket).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Indiquez un sujet et votre message.');
  });

  it('crée le ticket, vide le formulaire et recharge la liste', async () => {
    await create();
    fill('subject', '  Question sur mon abonnement ');
    fill('message', 'Bonjour, comment changer de plan ?');

    submit();

    expect(serviceMock.createTicket).toHaveBeenCalledWith('Question sur mon abonnement', 'Bonjour, comment changer de plan ?');
    expect(text()).toContain('Message envoyé.');
    expect(field('subject').value).toBe('');
    expect(field('message').value).toBe('');
    expect(serviceMock.getTickets).toHaveBeenCalledTimes(2);
  });

  it('garde le texte et affiche l\'erreur quand l\'envoi échoue', async () => {
    await create();
    serviceMock.createTicket.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Sujet trop long.' } })));
    fill('subject', 'Question');
    fill('message', 'Bonjour');

    submit();

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Sujet trop long.');
    expect(field('subject').value).toBe('Question');
  });

  it('garde un lien de retour vers Mon abonnement', async () => {
    await create();

    expect(compiled.querySelector('a[href="/producer/subscription"]')?.textContent?.trim()).toBe('Retour à mon abonnement');
  });
});
