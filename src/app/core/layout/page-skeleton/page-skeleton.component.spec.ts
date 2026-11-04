import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PageSkeletonComponent } from './page-skeleton.component';

describe('PageSkeletonComponent', () => {
  // les lecteurs d'ecran annoncent le chargement, au lieu de lire une page vide
  it('dit « Chargement… » aux lecteurs d’écran', () => {
    const fixture = TestBed.createComponent(PageSkeletonComponent);
    fixture.detectChanges();

    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.querySelector('.sr-only')?.textContent).toBe('Chargement…');
  });
});
