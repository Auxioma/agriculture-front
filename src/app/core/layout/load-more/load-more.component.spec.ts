import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoadMoreComponent } from './load-more.component';

describe('LoadMoreComponent', () => {
  let fixture: ComponentFixture<LoadMoreComponent>;
  let el: HTMLElement;

  function setup(inputs: {
    shown: number;
    total: number | null;
    loading?: boolean;
    failed?: boolean;
  }): void {
    fixture = TestBed.createComponent(LoadMoreComponent);
    el = fixture.nativeElement;
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  const button = () => el.querySelector<HTMLButtonElement>('button');

  beforeEach(() => TestBed.resetTestingModule());

  it('propose « Voir plus » et dit combien sont affichés quand il en reste', () => {
    setup({ shown: 20, total: 45 });

    expect(button()?.textContent?.trim()).toBe('Voir plus');
    expect(el.textContent).toContain('20 sur 45');
  });

  it("n'affiche rien quand tout est chargé, ni quand le total est inconnu", () => {
    setup({ shown: 45, total: 45 });
    expect(button()).toBeNull();

    TestBed.resetTestingModule();
    setup({ shown: 20, total: null });
    expect(button()).toBeNull();
  });

  it('émet « more » au clic', () => {
    setup({ shown: 20, total: 45 });
    let emitted = 0;
    fixture.componentInstance.more.subscribe(() => emitted++);

    button()!.click();

    expect(emitted).toBe(1);
  });

  it('se désactive et le dit pendant le chargement', () => {
    setup({ shown: 20, total: 45, loading: true });

    expect(button()!.disabled).toBe(true);
    expect(button()!.textContent?.trim()).toBe('Chargement…');
  });

  it("dit que la suite n'est pas arrivée, en laissant réessayer", () => {
    setup({ shown: 20, total: 45, failed: true });

    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Impossible de charger la suite',
    );
    expect(button()!.disabled).toBe(false);
  });
});
