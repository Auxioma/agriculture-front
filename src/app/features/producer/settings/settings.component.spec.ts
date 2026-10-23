import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SettingsComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  const rows = () => [...compiled.querySelectorAll('li > a')];
  const text = (el: Element, index: number) => el.querySelectorAll('span.block')[index]?.textContent?.trim();

  it('affiche le titre', () => {
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Paramètres');
  });

  it('liste les six rubriques du figma avec leur sous-titre, dans l ordre du mobile', () => {
    expect(rows().map((row) => [text(row, 0), text(row, 1)])).toEqual([
      ['Notifications', 'Demandes, paiements, abonnement'],
      ['Sécurité', 'Mot de passe, connexion'],
      ['Données personnelles', 'Export et suppression RGPD'],
      ['Aide et support', 'Contacter le support'],
      ['Langue', 'Français'],
      ['Devise', 'Euro (€)'],
    ]);
  });

  it('mène à la page support avec « Aide et support » et laisse les autres rubriques sans destination', () => {
    const hrefs = rows().map((row) => [text(row, 0), row.getAttribute('href')]);

    expect(hrefs).toEqual([
      ['Notifications', null],
      ['Sécurité', null],
      ['Données personnelles', null],
      ['Aide et support', '/producer/support'],
      ['Langue', null],
      ['Devise', null],
    ]);
  });

  it('propose le retour à mon profil', () => {
    const back = compiled.querySelector('header a');

    expect(back?.textContent?.trim()).toBe('Retour à mon profil');
    expect(back?.getAttribute('href')).toBe('/producer/profile');
  });
});
