import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { PasswordSectionComponent } from './password-section.component';
import { SettingsService } from './settings.service';

describe('PasswordSectionComponent', () => {
  let fixture: ComponentFixture<PasswordSectionComponent>;
  let compiled: HTMLElement;
  let changePassword: ReturnType<typeof vi.fn>;

  async function create(result$: Observable<null> = of(null)): Promise<void> {
    changePassword = vi.fn(() => result$);
    await TestBed.configureTestingModule({
      imports: [PasswordSectionComponent],
      providers: [{ provide: SettingsService, useValue: { changePassword } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordSectionComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  }

  const type = (id: string, value: string) => {
    const input = compiled.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fill = (current: string, next: string, confirm: string) => {
    type('current-password', current);
    type('new-password', next);
    type('confirm-password', confirm);
  };
  const submit = () => {
    compiled.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it('envoie le mot de passe actuel et le nouveau, puis vide le formulaire et le dit', async () => {
    await create();
    fill('ancien-mot-de-passe', 'un-tout-nouveau-mdp', 'un-tout-nouveau-mdp');

    submit();

    expect(changePassword).toHaveBeenCalledWith('ancien-mot-de-passe', 'un-tout-nouveau-mdp');
    expect(compiled.querySelector('[role=status]')?.textContent).toContain('Mot de passe mis à jour');
    expect(compiled.querySelector<HTMLInputElement>('#new-password')?.value).toBe('');
  });

  it('ne laisse pas partir un formulaire vide et dit ce qui manque', async () => {
    await create();

    submit();

    expect(changePassword).not.toHaveBeenCalled();
    expect(compiled.textContent).toContain('Entrez votre mot de passe actuel.');
    expect(compiled.textContent).toContain('12 caractères au moins');
  });

  it('refuse un nouveau mot de passe de moins de 12 caractères', async () => {
    await create();
    fill('ancien-mot-de-passe', 'court', 'court');

    submit();

    expect(changePassword).not.toHaveBeenCalled();
    expect(compiled.querySelector('#new-password')?.parentElement?.textContent).toContain('doit faire 12 caractères au moins');
  });

  it('refuse une confirmation différente', async () => {
    await create();
    fill('ancien-mot-de-passe', 'un-tout-nouveau-mdp', 'un-autre-mot-de-passe');

    submit();

    expect(changePassword).not.toHaveBeenCalled();
    expect(compiled.textContent).toContain('Les deux mots de passe ne sont pas identiques.');
  });

  it('affiche le message du back (mot de passe faux, trop d essais) et garde la saisie', async () => {
    await create(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'Mot de passe actuel incorrect.' } })));
    fill('mauvais-mot-de-passe', 'un-tout-nouveau-mdp', 'un-tout-nouveau-mdp');

    submit();

    expect(compiled.querySelector('[role=alert]')?.textContent).toContain('Mot de passe actuel incorrect.');
    expect(compiled.querySelector('[role=status]')).toBeNull();
    expect(compiled.querySelector<HTMLInputElement>('#new-password')?.value).toBe('un-tout-nouveau-mdp');
    expect(compiled.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(false);
  });
});
