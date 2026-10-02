import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('affiche les 4 colonnes de liens du figma', () => {
    const titles = [...compiled.querySelectorAll('h2')].map((h) => h.textContent);
    expect(titles).toEqual(['Explorer', 'A propos', 'Aide & support', 'Mon compte']);
  });

  it('contient la FAQ et les 3 pages légales du back', () => {
    const text = compiled.textContent ?? '';
    for (const label of [
      'FAQ',
      "Conditions générales d'utilisation",
      'Politique de confidentialité',
      'Mentions légales',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('parle de demandes (cahier des charges) et pas d\'annonces', () => {
    const text = compiled.textContent ?? '';
    expect(text).toContain('Mes demandes');
    expect(text).not.toContain('annonces');
  });

  it('affiche les 4 réseaux sociaux', () => {
    const labels = [...compiled.querySelectorAll('a[aria-label]')].map((a) => a.getAttribute('aria-label'));
    expect(labels).toEqual(['Facebook', 'Instagram', 'YouTube', 'LinkedIn']);
  });

  it('affiche le copyright avec l\'année en cours', () => {
    expect(compiled.textContent).toContain(`${new Date().getFullYear()} TrouveMoi Agri | Tous droits réservés`);
  });

  it('le logo ramène à l\'accueil', () => {
    const logo = compiled.querySelector('a[href="/"]');
    expect(logo?.textContent).toContain('TrouveMoi Agri');
  });
});
