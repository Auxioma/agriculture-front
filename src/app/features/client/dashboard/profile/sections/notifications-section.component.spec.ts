import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationSettings } from '../profile.model';
import { NotificationsSectionComponent } from './notifications-section.component';

const SETTINGS: NotificationSettings = {
  producer_replied: true,
  new_message: true,
  quote_received: true,
  request_expiring_soon: false,
  favorite_producer_available: true,
  review_reminder: false,
};

describe('NotificationsSectionComponent', () => {
  let fixture: ComponentFixture<NotificationsSectionComponent>;
  let el: HTMLElement;
  let emitted: Partial<NotificationSettings>[];

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationsSectionComponent);
    el = fixture.nativeElement;
    emitted = [];
    fixture.componentInstance.changed.subscribe((change) => emitted.push(change));
    fixture.componentRef.setInput('settings', SETTINGS);
    fixture.detectChanges();
  });

  const labels = () => Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim());

  it('propose les six notifications du client que le cahier permet de couper, nouveautés et avis comprises', () => {
    expect(labels()).toEqual([
      'Nouvelle réponse producteur',
      'Nouveau message',
      'Devis reçu',
      'Demande expirant bientôt',
      'Producteur favori avec nouvelle disponibilité',
      'Avis à laisser',
    ]);
  });

  it("n'émet que la clé qu'on bascule, à l'inverse de son état", () => {
    const toggle = (label: string) =>
      Array.from(el.querySelectorAll<HTMLElement>('li'))
        .find((li) => li.textContent?.includes(label))!
        .querySelector('button')!
        .click();

    toggle('Avis à laisser');
    toggle('Producteur favori avec nouvelle disponibilité');

    expect(emitted).toEqual([{ review_reminder: true }, { favorite_producer_available: false }]);
  });
});
