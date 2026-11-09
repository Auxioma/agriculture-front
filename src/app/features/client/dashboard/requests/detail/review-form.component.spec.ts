import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepliesService } from './replies.service';
import { ReviewFormComponent } from './review-form.component';

describe('ReviewFormComponent', () => {
  let fixture: ComponentFixture<ReviewFormComponent>;
  const replies = { review: vi.fn() };

  const root = () => fixture.nativeElement as HTMLElement;
  const star = (n: number) => root().querySelector<HTMLButtonElement>(`button[aria-label^="${n} étoile"]`)!;
  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit'));

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: RepliesService, useValue: replies }] });
    fixture = TestBed.createComponent(ReviewFormComponent);
    fixture.componentRef.setInput('requestId', 'req-1');
    fixture.componentRef.setInput('producerId', 'prod-1');
    fixture.detectChanges();
  });

  it('propose cinq étoiles, aucune choisie au départ', () => {
    const stars = root().querySelectorAll('button[aria-pressed]');

    expect(stars.length).toBe(5);
    expect([...stars].every((s) => s.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it("refuse d'envoyer sans note et ne rappelle pas le back", () => {
    submit();
    fixture.detectChanges();

    expect(root().querySelector('[role=alert]')?.textContent).toContain('Choisissez une note');
    expect(replies.review).not.toHaveBeenCalled();
  });

  it('envoie la note et le commentaire, puis donne l’avis tel que le back l’a enregistré', () => {
    replies.review.mockReturnValue(of({ id: 'rev-1', status: 'pending' }));
    const sent = vi.fn();
    fixture.componentInstance.sent.subscribe(sent);

    star(4).click();
    const box = root().querySelector('textarea')!;
    box.value = '  Très bon accueil  ';
    box.dispatchEvent(new Event('input'));
    submit();

    expect(replies.review).toHaveBeenCalledWith({
      requestId: 'req-1',
      producerId: 'prod-1',
      rating: 4,
      comment: 'Très bon accueil',
    });
    expect(sent).toHaveBeenCalledWith({ rating: 4, status: 'pending' });
  });

  it('le commentaire est facultatif : vide, il part à null', () => {
    replies.review.mockReturnValue(of({ id: 'rev-1', status: 'pending' }));

    star(5).click();
    submit();

    expect(replies.review).toHaveBeenCalledWith(expect.objectContaining({ comment: null }));
  });

  it('affiche la raison du refus du back (déjà un avis pour ce producteur...)', () => {
    replies.review.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Vous avez déjà laissé un avis pour ce producteur sur cette demande.' } })),
    );

    star(3).click();
    submit();
    fixture.detectChanges();

    expect(root().querySelector('[role=alert]')?.textContent).toContain('déjà laissé un avis');
  });

  it('Annuler prévient le parent sans rien envoyer', () => {
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);

    [...root().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Annuler')!.click();

    expect(cancelled).toHaveBeenCalled();
    expect(replies.review).not.toHaveBeenCalled();
  });
});
