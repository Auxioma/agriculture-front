import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Address, AddressPayload } from '../profile.model';
import { ProfileService } from '../profile.service';
import { AddressesSectionComponent } from './addresses-section.component';

const homePayload: AddressPayload = {
  label: 'Domicile',
  address1: '12 rue de la Paix',
  address2: null,
  city: 'Lyon',
  postalCode: '69000',
  countryCode: 'FR',
  isDefault: true,
};
const home: Address = { id: 'a1', ...homePayload };

function setup(list: Address[] = [home]) {
  const profile = {
    addresses: vi.fn(() => of(list)),
    createAddress: vi.fn(() => of(home)),
    updateAddress: vi.fn(() => of(home)),
    deleteAddress: vi.fn(() => of(undefined)),
  };
  TestBed.configureTestingModule({
    imports: [AddressesSectionComponent],
    providers: [{ provide: ProfileService, useValue: profile }],
  });
  const fixture = TestBed.createComponent(AddressesSectionComponent);
  fixture.detectChanges(); // déclenche ngOnInit → chargement de la liste
  return { fixture, component: fixture.componentInstance, profile };
}

describe('AddressesSectionComponent', () => {
  describe('chargement', () => {
    it('charge et affiche les adresses', () => {
      const { fixture, component } = setup();
      const text = fixture.nativeElement.textContent;

      expect(component.addresses()).toEqual([home]);
      expect(component.loading()).toBe(false);
      expect(text).toContain('Domicile');
      expect(text).toContain('12 rue de la Paix, 69000 Lyon');
    });

    it('affiche un message quand il y a aucune adresse', () => {
      const { fixture } = setup([]);
      expect(fixture.nativeElement.textContent).toContain('Aucune adresse enregistrée.');
    });

    it('affiche une erreur si le chargement échoue', () => {
      const profile = {
        addresses: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500, error: {} }))),
      };
      TestBed.configureTestingModule({
        imports: [AddressesSectionComponent],
        providers: [{ provide: ProfileService, useValue: profile }],
      });
      const fixture = TestBed.createComponent(AddressesSectionComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.error()).toBe('Impossible de charger vos adresses.');
      expect(fixture.componentInstance.loading()).toBe(false);
    });
  });

  describe('formulaire', () => {
    it('propose « par défaut » pour la première adresse seulement', () => {
      const empty = setup([]);
      empty.component.startAdd();
      expect(empty.component.form.getRawValue().isDefault).toBe(true);
      TestBed.resetTestingModule();

      const filled = setup([home]);
      filled.component.startAdd();
      expect(filled.component.form.getRawValue().isDefault).toBe(false);
    });

    it('préremplit le formulaire en modification (address2 null devient vide)', () => {
      const { component } = setup();
      component.startEdit(home);

      expect(component.editing()).toBe('a1');
      expect(component.form.getRawValue().address2).toBe('');
      expect(component.form.getRawValue().city).toBe('Lyon');
    });

    it('« Annuler » ferme le formulaire', () => {
      const { component } = setup();
      component.startAdd();
      component.cancel();
      expect(component.editing()).toBeNull();
    });
  });

  describe('enregistrement', () => {
    it("n'appelle pas l'API si le formulaire est invalide", () => {
      const { component, profile } = setup();
      component.startAdd(); // champs obligatoires vides
      component.save();

      expect(profile.createAddress).not.toHaveBeenCalled();
      expect(profile.updateAddress).not.toHaveBeenCalled();
    });

    it('crée une adresse, envoie address2 à null, ferme le formulaire et recharge la liste', () => {
      const { component, profile } = setup([]);
      component.startAdd();
      component.form.patchValue({ ...homePayload, address2: '   ' }); // espaces seuls = vide
      component.save();

      expect(profile.createAddress).toHaveBeenCalledWith(homePayload);
      expect(profile.updateAddress).not.toHaveBeenCalled();
      expect(component.editing()).toBeNull();
      expect(profile.addresses).toHaveBeenCalledTimes(2); // chargement initial + rechargement
    });

    it("modifie l'adresse existante avec son id", () => {
      const { component, profile } = setup();
      component.startEdit(home);
      component.form.patchValue({ city: 'Villeurbanne' });
      component.save();

      expect(profile.updateAddress).toHaveBeenCalledWith('a1', {
        ...homePayload,
        city: 'Villeurbanne',
      });
      expect(profile.createAddress).not.toHaveBeenCalled();
    });

    it("garde le formulaire ouvert et affiche l'erreur si l'API refuse", () => {
      const { component, profile } = setup([]);
      profile.createAddress.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 422, error: { error: 'Adresse invalide.' } }),
        ),
      );
      component.startAdd();
      component.form.patchValue({ ...homePayload, address2: '' });
      component.save();

      expect(component.error()).toBe('Adresse invalide.');
      expect(component.editing()).toBe('new');
      expect(component.saving()).toBe(false);
    });
  });

  describe('suppression', () => {
    it('supprime puis recharge la liste', () => {
      const { component, profile } = setup();
      component.remove(home);

      expect(profile.deleteAddress).toHaveBeenCalledWith('a1');
      expect(profile.addresses).toHaveBeenCalledTimes(2);
    });

    it("affiche l'erreur si la suppression échoue", () => {
      const { component, profile } = setup();
      profile.deleteAddress.mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 404, error: { error: 'Adresse introuvable.' } }),
        ),
      );
      component.remove(home);

      expect(component.error()).toBe('Adresse introuvable.');
      expect(profile.addresses).toHaveBeenCalledOnce(); // pas de rechargement
    });
  });
});
