import { Component, computed, model } from '@angular/core';
import { DAYS } from './hours-format';
import { HourSlot } from './profile.service';

// horaires de la semaine : un jour coche a un ou plusieurs creneaux (matin et apres-midi), un jour decoche est ferme.
// `hours` est la liste a plat des creneaux, la meme que celle envoyee au back (PUT /api/producer/opening-hours).
@Component({
  selector: 'app-hours-field',
  standalone: true,
  templateUrl: './hours-field.component.html',
})
export class HoursFieldComponent {
  hours = model.required<HourSlot[]>();

  // par jour, avec la place de chaque creneau dans la liste a plat (c'est elle qu'on modifie)
  days = computed(() =>
    DAYS.map((day) => ({
      ...day,
      entries: this.hours()
        .map((slot, index) => ({ slot, index }))
        .filter((entry) => entry.slot.weekday === day.weekday),
    })),
  );

  toggle(weekday: number): void {
    const open = this.hours().some((slot) => slot.weekday === weekday);
    this.hours.update((list) =>
      open ? list.filter((slot) => slot.weekday !== weekday) : [...list, { weekday, opensAt: '09:00', closesAt: '18:00' }],
    );
  }

  add(weekday: number): void {
    this.hours.update((list) => [...list, { weekday, opensAt: '14:00', closesAt: '18:00' }]);
  }

  remove(index: number): void {
    this.hours.update((list) => list.filter((_, i) => i !== index));
  }

  edit(index: number, field: 'opensAt' | 'closesAt', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.hours.update((list) => list.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
  }
}
