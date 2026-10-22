import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeocodingService } from '../../catalog/services/geocoding.service';
import { ProfileEditComponent } from './profile-edit.component';
import { Exploitation, ProfileService } from './profile.service';

const EXPLOITATION: Exploitation = {
  profile: {
    farmName: 'Ferme Dupont',
    description: 'Maraîchage bio en circuit court.',
    story: 'Depuis trois générations.',
    city: 'Lyon',
    postalCode: '69001',
    addressVisibility: 'city',
    verificationStatus: 'verified',
    pickupAvailable: true,
    deliveryAvailable: false,
    photoUrl: 'http://localhost/couverture.jpg',
  },
  labels: [
    { labelId: 'l-hve', name: 'HVE', verifiedAt: '2026-09-22T10:18:03+02:00', expiresAt: null },
    { labelId: 'l-local', name: 'Local', verifiedAt: null, expiresAt: null },
  ],
  zones: [
    { id: 'z-15', radiusKm: '15.00', rules: null },
    { id: 'z-40', radiusKm: '40.00', rules: null },
  ],
  openingHours: [
    { weekday: 1, opensAt: '09:00', closesAt: '18:00', isClosed: false },
    { weekday: 7, opensAt: null, closesAt: null, isClosed: true },
  ],
};

const CATALOG = [
  { id: 'l-bio', name: 'Bio' },
  { id: 'l-hve', name: 'HVE' },
  { id: 'l-local', name: 'Local' },
];

describe('ProfileEditComponent', () => {
  let fixture: ComponentFixture<ProfileEditComponent>;
  let compiled: HTMLElement;
  let service: Record<string, ReturnType<typeof vi.fn>>;
  let geocoding: { locate: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.fn>;

  async function create(data$: Observable<Exploitation> = of(EXPLOITATION)): Promise<void> {
    service = {
      getExploitation: vi.fn(() => data$),
      getCatalogLabels: vi.fn(() => of(CATALOG)),
      saveProfile: vi.fn(() => of(null)),
      uploadCover: vi.fn(() => of({ id: 'p1', url: 'http://localhost/p1.jpg' })),
      syncLabels: vi.fn(() => of(null)),
      syncRadius: vi.fn(() => of(null)),
      saveHours: vi.fn(() => of([])),
    };
    geocoding = { locate: vi.fn(() => of({ latitude: 48.85, longitude: 2.35 })) };
    await TestBed.configureTestingModule({
      imports: [ProfileEditComponent],
      providers: [provideRouter([]), { provide: ProfileService, useValue: service }, { provide: GeocodingService, useValue: geocoding }],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as ReturnType<typeof vi.fn>;

    fixture = TestBed.createComponent(ProfileEditComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const field = <T extends HTMLElement>(selector: string) => compiled.querySelector<T>(selector)!;
  const type = (selector: string, value: string) => {
    const element = field<HTMLInputElement | HTMLTextAreaElement>(selector);
    element.value = value;
    element.dispatchEvent(new Event('input'));
  };
  const submit = () => {
    field('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const labelBox = (name: string) =>
    [...compiled.querySelectorAll('fieldset label')].find((label) => label.textContent?.includes(name))!.querySelector<HTMLInputElement>('input')!;
  const pick = (file: File) => {
    const input = field<HTMLInputElement>('input[type=file]');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => vi.clearAllMocks());

  it('remplit le formulaire avec le profil, le rayon le plus grand et les horaires', async () => {
    await create();

    expect(field<HTMLInputElement>('#farm-name').value).toBe('Ferme Dupont');
    expect(field<HTMLTextAreaElement>('#description').value).toBe('Maraîchage bio en circuit court.');
    expect(field<HTMLInputElement>('#city').value).toBe('Lyon');
    expect(field<HTMLInputElement>('#radius').value).toBe('40');
    const [pickup, delivery] = [...compiled.querySelectorAll<HTMLInputElement>('.space-y-2 input[type=checkbox]')];
    expect([pickup.checked, delivery.checked]).toEqual([true, false]);
    expect(field('app-hours-field').textContent).toContain('Fermé');
    expect(field<HTMLInputElement>('app-hours-field input[type=time]').value).toBe('09:00');
  });

  it('montre la couverture actuelle et les initiales', async () => {
    await create();

    expect(field('img').getAttribute('src')).toBe('http://localhost/couverture.jpg');
    expect(compiled.textContent).toContain('FD');
  });

  it('propose les labels du catalogue, coches s\'ils sont revendiques, avec leur etat', async () => {
    await create();

    expect([labelBox('Bio').checked, labelBox('HVE').checked, labelBox('Local').checked]).toEqual([false, true, true]);
    expect(compiled.textContent).toContain('HVE (Validé)');
    expect(compiled.textContent).toContain('Local (En attente de validation)');
    expect(compiled.querySelector('fieldset label')?.textContent).not.toContain('(');
  });

  it('enregistre dans l ordre puis revient au profil, sans chercher la position quand la ville est la meme', async () => {
    await create();
    type('#description', ' Nouvelle présentation ');
    labelBox('Bio').click();
    type('#radius', '25');
    compiled.querySelectorAll<HTMLInputElement>('.space-y-2 input[type=checkbox]')[1].click();
    fixture.detectChanges();

    submit();

    expect(service['saveProfile']).toHaveBeenCalledWith({
      farmName: 'Ferme Dupont',
      description: 'Nouvelle présentation',
      story: 'Depuis trois générations.',
      city: 'Lyon',
      postalCode: '69001',
      addressVisibility: 'city',
      pickupAvailable: true,
      deliveryAvailable: true,
    });
    expect(geocoding.locate).not.toHaveBeenCalled();
    expect(service['uploadCover']).not.toHaveBeenCalled();
    expect(service['syncLabels']).toHaveBeenCalledWith(expect.arrayContaining(['l-hve', 'l-local', 'l-bio']));
    expect(service['syncRadius']).toHaveBeenCalledWith(25);
    expect(service['saveHours']).toHaveBeenCalledWith([{ weekday: 1, opensAt: '09:00', closesAt: '18:00' }]);
    const order = ['saveProfile', 'syncLabels', 'syncRadius', 'saveHours'].map((name) => service[name].mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(navigate).toHaveBeenCalledWith(['/producer/profile']);
  });

  it('cherche la position de la nouvelle ville et l envoie avec le profil', async () => {
    await create();
    type('#city', ' Paris ');

    submit();

    expect(geocoding.locate).toHaveBeenCalledWith('Paris');
    expect(service['saveProfile']).toHaveBeenCalledWith(expect.objectContaining({ city: 'Paris', latitude: 48.85, longitude: 2.35 }));
  });

  it('enregistre quand meme, sans position, si la recherche de la ville echoue ou ne trouve rien', async () => {
    await create();
    geocoding.locate.mockReturnValueOnce(throwError(() => new Error('service indisponible')));
    type('#city', 'Namur');

    submit();

    const payload = service['saveProfile'].mock.calls[0][0];
    expect(payload.city).toBe('Namur');
    expect(payload).not.toHaveProperty('latitude');
    expect(navigate).toHaveBeenCalled();
  });

  it('envoie une ville vide comme null et ne cherche rien', async () => {
    await create();
    type('#city', '   ');

    submit();

    expect(geocoding.locate).not.toHaveBeenCalled();
    expect(service['saveProfile']).toHaveBeenCalledWith(expect.objectContaining({ city: null }));
  });

  it('laisse décochés le retrait et la livraison que le producteur n a pas encore configurés', async () => {
    await create(of({ ...EXPLOITATION, profile: { ...EXPLOITATION.profile, pickupAvailable: null, deliveryAvailable: true } }));

    const [pickup, delivery] = [...compiled.querySelectorAll<HTMLInputElement>('.space-y-2 input[type=checkbox]')];
    expect([pickup.checked, delivery.checked]).toEqual([false, true]);
  });

  it('envoie le retrait et la livraison comme ils sont cochés, chacun de son côté', async () => {
    await create();

    submit();

    expect(service['saveProfile']).toHaveBeenCalledWith(expect.objectContaining({ pickupAvailable: true, deliveryAvailable: false }));
  });

  it('refuse un nom d exploitation vide', async () => {
    await create();
    type('#farm-name', '  ');

    submit();

    expect(service['saveProfile']).not.toHaveBeenCalled();
    expect(compiled.textContent).toContain("Le nom de l'exploitation est obligatoire.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuse un rayon qui n est pas un nombre positif, et accepte un rayon vide', async () => {
    await create();
    for (const bad of ['abc', '0', '-5']) {
      type('#radius', bad);
      submit();
      expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Rayon de vente');
    }
    expect(service['saveProfile']).not.toHaveBeenCalled();

    type('#radius', '');
    submit();

    expect(service['syncRadius']).toHaveBeenCalledWith(null);
  });

  it('refuse des horaires incoherents sans rien enregistrer', async () => {
    await create();
    fixture.componentInstance.hours.set([{ weekday: 2, opensAt: '18:00', closesAt: '09:00' }]);

    submit();

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain("Mardi : l'ouverture doit précéder la fermeture.");
    expect(service['saveProfile']).not.toHaveBeenCalled();
  });

  it('affiche le message du back et reste sur la page quand l enregistrement echoue', async () => {
    await create();
    service['saveProfile'].mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Nom déjà pris.' } })));

    submit();

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Nom déjà pris.');
    expect(navigate).not.toHaveBeenCalled();
    expect(service['syncLabels']).not.toHaveBeenCalled();
    expect(field<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
  });

  it('prévient quand on retire un label déjà validé', async () => {
    await create();
    expect(compiled.textContent).not.toContain('devra être validé de nouveau');

    labelBox('Local').click();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('devra être validé de nouveau');

    labelBox('HVE').click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('devra être validé de nouveau');
    submit();
    expect(service['syncLabels']).toHaveBeenCalledWith([]);
  });

  it('refuse un fichier qui n est pas une image et garde la couverture actuelle', async () => {
    await create();

    pick(new File(['x'], 'cv.pdf', { type: 'application/pdf' }));

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('jpeg, png ou webp, 5 Mo maximum');
    submit();
    expect(service['uploadCover']).not.toHaveBeenCalled();
  });

  it('refuse une image de plus de 5 Mo', async () => {
    await create();
    const big = new File(['x'], 'grosse.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });

    pick(big);

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('5 Mo maximum');
  });

  it('envoie la couverture choisie apres le profil et avant les labels', async () => {
    await create();
    const file = new File(['x'], 'cv.png', { type: 'image/png' });
    pick(file);

    submit();

    expect(service['uploadCover']).toHaveBeenCalledWith(file);
    expect(service['saveProfile'].mock.invocationCallOrder[0]).toBeLessThan(service['uploadCover'].mock.invocationCallOrder[0]);
    expect(service['uploadCover'].mock.invocationCallOrder[0]).toBeLessThan(service['syncLabels'].mock.invocationCallOrder[0]);
  });

  it('ramene au profil avec Annuler et avec le lien de retour', async () => {
    await create();

    const links = [...compiled.querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Retour au profil', '/producer/profile'],
      ['Annuler', '/producer/profile'],
    ]);
  });

  it('affiche un message quand le profil ne peut pas etre charge', async () => {
    await create(throwError(() => new Error('API injoignable')));

    expect(compiled.textContent).toContain('Impossible de charger votre profil');
    expect(compiled.querySelector('form')).toBeNull();
  });
});
