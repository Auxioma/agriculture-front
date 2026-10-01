import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('devrait se créer', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('devrait afficher le titre et les 2 CTA du bandeau', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('agricole réuni');

    const links: NodeListOf<HTMLAnchorElement> = compiled.querySelectorAll('a');
    const texts = Array.from(links).map((a) => a.textContent?.trim());
    expect(texts.some((t) => t?.includes('Demander un prix en direct'))).toBe(true);
    expect(texts.some((t) => t?.includes('Je suis producteur'))).toBe(true);
  });

  it('devrait afficher les 3 badges de confiance', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Producteurs vérifiés');
    expect(text).toContain('Pas de commission produit');
    expect(text).toContain('Demandes gratuites pour les clients');
  });

  it('devrait afficher les 5 catégories populaires avec leur photo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Catégories populaires');

    const images: NodeListOf<HTMLImageElement> = compiled.querySelectorAll('img');
    expect(images.length).toBe(5);
    expect(images[0].src).toContain('/images/categories/fruits.jpg');
  });

  it('cache les flèches du carrousel tant qu\'il ne déborde pas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button[aria-label="Catégories précédentes"]')).toBeNull();
    expect(compiled.querySelector('button[aria-label="Catégories suivantes"]')).toBeNull();
  });

  it('affiche la flèche droite quand ça déborde, puis la gauche une fois scrollé', () => {
    const track: HTMLDivElement = fixture.nativeElement.querySelector('.overflow-x-auto');
    Object.defineProperty(track, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(track, 'scrollLeft', { value: 0, configurable: true, writable: true });

    fixture.componentInstance.updateScrollState();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories suivantes"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories précédentes"]')).toBeNull();

    track.scrollLeft = 700;
    fixture.componentInstance.updateScrollState();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Catégories précédentes"]')).toBeTruthy();
  });

  it('scrollCarousel fait défiler le carrousel dans le bon sens', () => {
    const track: HTMLDivElement = fixture.nativeElement.querySelector('.overflow-x-auto');
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    fixture.componentInstance.scrollCarousel('right');
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });

    fixture.componentInstance.scrollCarousel('left');
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -240, behavior: 'smooth' });
  });
});
