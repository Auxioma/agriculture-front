import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { HoursFieldComponent } from './hours-field.component';
import { HourSlot } from './profile.service';

@Component({
  standalone: true,
  imports: [HoursFieldComponent],
  template: '<app-hours-field [(hours)]="hours" />',
})
class HostComponent {
  hours = signal<HourSlot[]>([
    { weekday: 1, opensAt: '08:30', closesAt: '17:30' },
    { weekday: 6, opensAt: '08:00', closesAt: '13:00' },
  ]);
}

describe('HoursFieldComponent', () => {
  let host: HostComponent;
  let compiled: HTMLElement;

  function create(): void {
    const fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    // les actions sont jouees puis le DOM relu
    refresh = () => fixture.detectChanges();
  }
  let refresh: () => void;

  const rows = () => [...compiled.querySelectorAll('li')];
  const row = (label: string) => rows().find((li) => li.querySelector('label')?.textContent?.trim() === label)!;
  const times = (label: string) => [...row(label).querySelectorAll<HTMLInputElement>('input[type=time]')].map((input) => input.value);
  const checkbox = (label: string) => row(label).querySelector<HTMLInputElement>('input[type=checkbox]')!;
  const button = (label: string, text: string) => [...row(label).querySelectorAll('button')].find((b) => b.textContent?.includes(text));

  it('liste les sept jours, ouverts ou fermes', () => {
    create();

    expect(rows().map((li) => li.querySelector('label')?.textContent?.trim())).toEqual(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']);
    expect(checkbox('Lundi').checked).toBe(true);
    expect(times('Lundi')).toEqual(['08:30', '17:30']);
    expect(checkbox('Mardi').checked).toBe(false);
    expect(row('Mardi').textContent).toContain('Fermé');
  });

  it('ouvre un jour avec 9h-18h puis le ferme en retirant ses creneaux', () => {
    create();

    checkbox('Mardi').click();
    refresh();
    expect(host.hours().filter((s) => s.weekday === 2)).toEqual([{ weekday: 2, opensAt: '09:00', closesAt: '18:00' }]);
    expect(times('Mardi')).toEqual(['09:00', '18:00']);

    checkbox('Mardi').click();
    refresh();
    expect(host.hours().some((s) => s.weekday === 2)).toBe(false);
    expect(row('Mardi').textContent).toContain('Fermé');
  });

  it('ajoute un second creneau, que seul un jour a plusieurs creneaux peut retirer', () => {
    create();
    expect(button('Lundi', '×')).toBeUndefined();

    button('Lundi', 'Ajouter un créneau')!.click();
    refresh();
    expect(host.hours().filter((s) => s.weekday === 1)).toEqual([
      { weekday: 1, opensAt: '08:30', closesAt: '17:30' },
      { weekday: 1, opensAt: '14:00', closesAt: '18:00' },
    ]);

    button('Lundi', '×')!.click();
    refresh();
    expect(host.hours().filter((s) => s.weekday === 1)).toEqual([{ weekday: 1, opensAt: '14:00', closesAt: '18:00' }]);
  });

  it('modifie l heure du bon creneau, sans toucher aux autres jours', () => {
    create();

    const [opens, closes] = row('Samedi').querySelectorAll<HTMLInputElement>('input[type=time]');
    opens.value = '09:15';
    opens.dispatchEvent(new Event('change'));
    closes.value = '12:00';
    closes.dispatchEvent(new Event('change'));
    refresh();

    expect(host.hours()).toEqual([
      { weekday: 1, opensAt: '08:30', closesAt: '17:30' },
      { weekday: 6, opensAt: '09:15', closesAt: '12:00' },
    ]);
  });
});
