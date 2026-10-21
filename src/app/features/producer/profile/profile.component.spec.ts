import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ProfileComponent } from './profile.component';
import { Exploitation, ProfileService } from './profile.service';

const EXPLOITATION: Exploitation = {
  profile: {
    farmName: 'Ferme Dupont',
    description: 'Maraîchage bio en circuit court.',
    verificationStatus: 'verified',
    pickupAvailable: true,
    deliveryAvailable: false,
  },
  labels: [
    { name: 'HVE', verifiedAt: '2026-09-22T10:18:03+02:00', expiresAt: null },
    { name: 'Bio', verifiedAt: null, expiresAt: null },
  ],
  zones: [{ radiusKm: '15.00' }, { radiusKm: '40.00' }],
  openingHours: [
    { weekday: 1, opensAt: '09:00', closesAt: '18:00', isClosed: false },
    { weekday: 2, opensAt: '09:00', closesAt: '18:00', isClosed: false },
    { weekday: 7, opensAt: null, closesAt: null, isClosed: true },
  ],
};

describe('ProfileComponent', () => {
  let compiled: HTMLElement;

  async function create(data$: Observable<Exploitation> = of(EXPLOITATION)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideRouter([]), { provide: ProfileService, useValue: { getExploitation: vi.fn(() => data$) } }],
    }).compileComponents();

    const fixture: ComponentFixture<ProfileComponent> = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const text = (selector: string) => compiled.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const badges = () => [...compiled.querySelectorAll('ul[aria-label] > li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const rows = () =>
    [...compiled.querySelectorAll('dl > div')].map((row) => [row.querySelector('dt')?.textContent?.trim(), row.querySelector('dd')?.textContent?.trim()]);

  it('affiche le nom, les initiales et la presentation', async () => {
    await create();

    expect(text('h1')).toBe('Mon exploitation');
    expect(text('h2')).toBe('Ferme Dupont');
    expect(text('section [aria-hidden]')).toBe('FD');
    expect(compiled.textContent).toContain('Maraîchage bio en circuit court.');
  });

  it('affiche le badge vérifié puis seulement les labels validés', async () => {
    await create();

    expect(badges()).toEqual(['Vérifié', 'HVE']);
  });

  it('un producteur en attente de vérification le voit sans coche', async () => {
    await create(of({ ...EXPLOITATION, profile: { ...EXPLOITATION.profile, verificationStatus: 'pending' }, labels: [] }));

    expect(badges()).toEqual(['Vérification en cours']);
    expect(compiled.querySelector('ul[aria-label] svg')).toBeNull();
  });

  it('résume zone de vente, horaires, retrait et livraison', async () => {
    await create();

    expect(rows()).toEqual([
      ['Zone de vente', 'Rayon de 40 km'],
      ['Horaires', 'Lun-Mar 9h-18h'],
      ['Retrait', 'À la ferme'],
      ['Livraison', 'Non proposée'],
    ]);
  });

  it('met chaque plage d horaires sur sa ligne quand les jours diffèrent', async () => {
    await create(
      of({
        ...EXPLOITATION,
        openingHours: [
          { weekday: 1, opensAt: '08:30', closesAt: '17:30', isClosed: false },
          { weekday: 2, opensAt: '09:00', closesAt: '19:00', isClosed: false },
          { weekday: 6, opensAt: '08:00', closesAt: '13:00', isClosed: false },
        ],
      }),
    );

    const lines = [...compiled.querySelectorAll('dl > div')[1].querySelectorAll('dd > span')].map((span) => span.textContent?.trim());
    expect(lines).toEqual(['Lun 8h30-17h30', 'Mar 9h-19h', 'Sam 8h-13h']);
  });

  it('écrit « À renseigner » pour ce que le producteur n a pas encore rempli', async () => {
    await create(
      of({
        ...EXPLOITATION,
        profile: { ...EXPLOITATION.profile, description: null, pickupAvailable: null, deliveryAvailable: null },
        zones: [],
        openingHours: [],
      }),
    );

    expect(rows().map(([, value]) => value)).toEqual(['À renseigner', 'À renseigner', 'À renseigner', 'À renseigner']);
    expect(compiled.textContent).toContain('Ajoutez une description');
  });

  it('propose les quatre boutons du figma', async () => {
    await create();

    expect([...compiled.querySelectorAll('.flex-col > a')].map((a) => a.textContent?.trim())).toEqual([
      'Modifier mon profil',
      'Avis clients',
      'Statistiques',
      'Paramètres',
    ]);
  });

  it('affiche un message quand le profil ne peut pas être chargé', async () => {
    await create(throwError(() => new Error('API injoignable')));

    expect(compiled.textContent).toContain('Impossible de charger votre profil');
    expect(compiled.querySelector('dl')).toBeNull();
  });
});
