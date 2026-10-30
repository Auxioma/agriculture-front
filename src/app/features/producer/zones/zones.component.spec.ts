import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileZone } from '../profile/profile.service';
import { ZonesComponent } from './zones.component';
import { ZonesService } from './zones.service';

const ZONES: ProfileZone[] = [
  { id: 'z40', radiusKm: '40.00', rules: { frais: '6.00', minimum: '45.00' } },
  { id: 'z15', radiusKm: '15.00', rules: { frais: '3.00', minimum: '20.00' } },
];

describe('ZonesComponent', () => {
  let fixture: ComponentFixture<ZonesComponent>;
  let compiled: HTMLElement;
  let service: Record<'list' | 'create' | 'update' | 'remove', ReturnType<typeof vi.fn>>;

  async function create(data$: Observable<ProfileZone[]> = of(ZONES)): Promise<void> {
    service = {
      list: vi.fn(() => data$),
      create: vi.fn((payload: { radiusKm: number; rules: Record<string, unknown> | null }) => of({ id: 'new1', radiusKm: payload.radiusKm.toFixed(2), rules: payload.rules })),
      update: vi.fn((id: string, payload: { radiusKm: number; rules: Record<string, unknown> | null }) => of({ id, radiusKm: payload.radiusKm.toFixed(2), rules: payload.rules })),
      remove: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ZonesComponent],
      providers: [provideRouter([]), { provide: ZonesService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(ZonesComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | HTMLElement = compiled) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const titles = () => [...compiled.querySelectorAll('section h2')].map((h) => h.textContent?.trim());
  const card = (title: string) => [...compiled.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent?.trim() === title)!;
  const button = (label: string, scope: Element | HTMLElement = compiled) => [...scope.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  const field = (id: string) => compiled.querySelector<HTMLInputElement>(`#${id}`)!;
  const fill = (id: string, value: string) => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = async () => {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('liste les zones de la plus petite à la plus grande, avec leurs conditions', async () => {
    await create();

    expect(titles()).toEqual(["Jusqu'à 15 km", "Jusqu'à 40 km"]);
    expect(text(card("Jusqu'à 15 km"))).toContain('Frais de livraison : 3,00 €');
    expect(text(card("Jusqu'à 15 km"))).toContain('Commande minimum : 20,00 €');
    expect(text(card("Jusqu'à 40 km"))).toContain('Frais de livraison : 6,00 €');
  });

  it('une zone sans condition le dit, une zone tracée peut seulement être supprimée', async () => {
    await create(of([{ id: 'a', radiusKm: '10.00', rules: null }, { id: 'b', radiusKm: null, rules: null }]));

    expect(text(card("Jusqu'à 10 km"))).toContain('Aucune condition indiquée.');
    expect(button('Modifier', card("Jusqu'à 10 km"))).toBeTruthy();
    expect(button('Modifier', card('Zone tracée'))).toBeUndefined();
    expect(button('Supprimer', card('Zone tracée'))).toBeTruthy();
  });

  it('sans zone, invite à en ajouter une', async () => {
    await create(of([]));

    expect(text()).toContain('Aucune zone pour le moment.');
    expect(button('Ajouter une zone')).toBeTruthy();
  });

  it('rappelle que la fiche publique affiche la plus grande zone et ramène au profil', async () => {
    await create();

    expect(text()).toContain('Votre fiche publique affiche la plus grande.');
    expect(compiled.querySelector('a[href="/producer/profile"]')?.textContent?.trim()).toBe('Retour au profil');
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Zones de vente');
  });

  it('prévient quand les zones ne se chargent pas', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(text()).toContain('Impossible de charger vos zones pour le moment.');
    expect(button('Ajouter une zone')).toBeUndefined();
  });

  describe('ajouter', () => {
    it('crée la zone avec son rayon et ses conditions, la range à sa place et referme le formulaire', async () => {
      await create();
      button('Ajouter une zone')!.click();
      fixture.detectChanges();
      fill('zone-radius', '25');
      fill('zone-fee', '4,5');
      expect(button('Ajouter la zone')).toBeTruthy();

      await submit();

      expect(service.create).toHaveBeenCalledWith({ radiusKm: 25, rules: { frais: '4.50' } });
      expect(titles()).toEqual(["Jusqu'à 15 km", "Jusqu'à 25 km", "Jusqu'à 40 km"]);
      expect(compiled.querySelector('form')).toBeNull();
      expect(text()).toContain('Zone ajoutée.');
    });

    it('sans condition, envoie des conditions nulles', async () => {
      await create(of([]));
      button('Ajouter une zone')!.click();
      fixture.detectChanges();
      fill('zone-radius', '12,5');

      await submit();

      expect(service.create).toHaveBeenCalledWith({ radiusKm: 12.5, rules: null });
    });

    it('refuse un rayon vide, nul ou illisible, sans appeler le back', async () => {
      await create();
      button('Ajouter une zone')!.click();
      fixture.detectChanges();

      for (const value of ['', '0', 'abc', '-5']) {
        fill('zone-radius', value);
        await submit();
        expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Rayon : indiquez un nombre de kilomètres supérieur à 0.');
      }
      expect(service.create).not.toHaveBeenCalled();
    });

    it('refuse des frais ou un minimum illisibles, en le disant', async () => {
      await create();
      button('Ajouter une zone')!.click();
      fixture.detectChanges();
      fill('zone-radius', '20');

      fill('zone-fee', 'gratuit');
      await submit();
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Frais de livraison');

      fill('zone-fee', '');
      fill('zone-minimum', '20 euros');
      await submit();
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Commande minimum');
      expect(service.create).not.toHaveBeenCalled();
    });

    it('garde le formulaire et ce qui a été saisi quand le back refuse', async () => {
      await create();
      service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Fournissez un rayon (radiusKm) ou un polygone (polygon).' } })));
      button('Ajouter une zone')!.click();
      fixture.detectChanges();
      fill('zone-radius', '25');

      await submit();

      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Fournissez un rayon');
      expect(field('zone-radius').value).toBe('25');
      expect(titles().length).toBe(3);
    });

    it('« Annuler » referme le formulaire sans rien envoyer', async () => {
      await create();
      button('Ajouter une zone')!.click();
      fixture.detectChanges();

      button('Annuler')!.click();
      fixture.detectChanges();

      expect(compiled.querySelector('form')).toBeNull();
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('modifier', () => {
    it('ouvre la zone avec son rayon et ses conditions tels qu’on les taperait', async () => {
      await create(of([{ id: 'z40', radiusKm: '40.00', rules: { frais: '6.50', minimum: '45.00' } }]));

      button('Modifier')!.click();
      fixture.detectChanges();

      expect(field('zone-radius').value).toBe('40');
      expect(field('zone-fee').value).toBe('6,5');
      expect(field('zone-minimum').value).toBe('45');
      expect(button('Enregistrer')).toBeTruthy();
      expect(button('Ajouter la zone')).toBeUndefined();
    });

    it('enregistre le nouveau rayon en gardant les conditions, et met la liste à jour', async () => {
      await create();
      button('Modifier', card("Jusqu'à 40 km"))!.click();
      fixture.detectChanges();
      fill('zone-radius', '50');

      await submit();

      expect(service.update).toHaveBeenCalledWith('z40', { radiusKm: 50, rules: { frais: '6.00', minimum: '45.00' } });
      expect(titles()).toEqual(["Jusqu'à 15 km", "Jusqu'à 50 km"]);
      expect(text()).toContain('Zone enregistrée.');
    });

    it('garde les autres conditions de la zone (jours de livraison...) que la page ne montre pas', async () => {
      await create(of([{ id: 'z1', radiusKm: '20.00', rules: { frais: '3.00', jours: ['mardi'] } }]));
      button('Modifier')!.click();
      fixture.detectChanges();
      fill('zone-fee', '4');

      await submit();

      expect(service.update).toHaveBeenCalledWith('z1', { radiusKm: 20, rules: { jours: ['mardi'], frais: '4.00' } });
    });

    it('vider les deux champs retire les conditions', async () => {
      await create(of([{ id: 'z1', radiusKm: '20.00', rules: { frais: '3.00', minimum: '20.00' } }]));
      button('Modifier')!.click();
      fixture.detectChanges();
      fill('zone-fee', '');
      fill('zone-minimum', '');

      await submit();

      expect(service.update).toHaveBeenCalledWith('z1', { radiusKm: 20, rules: null });
      expect(text()).toContain('Aucune condition indiquée.');
    });
  });

  describe('supprimer', () => {
    it('demande confirmation, puis retire la zone', async () => {
      await create();
      button('Supprimer', card("Jusqu'à 15 km"))!.click();
      fixture.detectChanges();

      expect(text(card("Jusqu'à 15 km"))).toContain('Supprimer cette zone ?');
      expect(service.remove).not.toHaveBeenCalled();

      button('Confirmer la suppression')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(service.remove).toHaveBeenCalledWith('z15');
      expect(titles()).toEqual(["Jusqu'à 40 km"]);
      expect(text()).toContain('Zone supprimée.');
    });

    it('« Annuler » garde la zone', async () => {
      await create();
      button('Supprimer', card("Jusqu'à 15 km"))!.click();
      fixture.detectChanges();

      button('Annuler')!.click();
      fixture.detectChanges();

      expect(service.remove).not.toHaveBeenCalled();
      expect(text(card("Jusqu'à 15 km"))).not.toContain('Supprimer cette zone ?');
      expect(titles().length).toBe(2);
    });

    it('garde la zone et dit pourquoi quand le back refuse', async () => {
      await create();
      service.remove.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'Zone de livraison introuvable.' } })));
      button('Supprimer', card("Jusqu'à 15 km"))!.click();
      fixture.detectChanges();

      button('Confirmer la suppression')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(text(card("Jusqu'à 15 km"))).toContain('Zone de livraison introuvable.');
      expect(titles().length).toBe(2);
    });

    it('ouvrir la confirmation referme le formulaire en cours : une seule chose à la fois', async () => {
      await create();
      button('Ajouter une zone')!.click();
      fixture.detectChanges();
      expect(compiled.querySelector('form')).toBeTruthy();

      button('Supprimer', card("Jusqu'à 15 km"))!.click();
      fixture.detectChanges();

      expect(compiled.querySelector('form')).toBeNull();
      expect(text()).toContain('Supprimer cette zone ?');
    });
  });
});
