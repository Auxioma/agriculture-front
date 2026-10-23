import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { messageOf } from '../message-of';
import { longDate } from '../request-format';
import { SubscriptionService } from '../subscription/subscription.service';
import { SAVE_FILE } from './file-download';
import { SettingsService } from './settings.service';

// les statuts d'un abonnement qui donne encore des droits : ceux que la suppression du compte resilie (voir le back)
const IN_FORCE = ['active', 'trialing', 'past_due'];

// rubrique "Donnees personnelles" des parametres (RGPD) : exporter ses donnees, supprimer son compte.
// La suppression anonymise le compte et retire la fiche (le back garde les factures, obligation legale). Un abonnement en cours
// est resilie tout de suite, sans remboursement : la carte le dit et le bouton vaut "J'accepte". Le back refuse de toute facon
// (409) tant que ce n'est pas accepte, la carte n'est donc pas la seule barriere.
@Component({
  selector: 'app-personal-data-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './personal-data-section.component.html',
})
export class PersonalDataSectionComponent {
  private service = inject(SettingsService);
  private subscriptions = inject(SubscriptionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private saveFile = inject(SAVE_FILE);

  password = new FormControl('', { nonNullable: true });

  exporting = signal(false);
  exportError = signal('');

  confirming = signal(false);
  // l'abonnement en jeu : undefined = on le cherche, null = aucun (la carte n'en parle pas)
  atStake = signal<{ planName: string; currentPeriodEnd: string } | null | undefined>(undefined);
  busy = signal(false);
  error = signal('');

  readonly hasSubscription = computed(() => !!this.atStake());
  readonly endDate = computed(() => {
    const end = this.atStake()?.currentPeriodEnd;
    return end ? longDate(end) : '';
  });

  exportData(): void {
    this.exportError.set('');
    this.exporting.set(true);
    this.service.exportData().subscribe({
      next: (file) => {
        this.exporting.set(false);
        this.saveFile(file, 'trouvemoi-mes-donnees.json');
      },
      error: () => {
        this.exporting.set(false);
        this.exportError.set("L'export n'a pas pu être préparé. Réessayez dans un instant.");
      },
    });
  }

  openConfirmation(): void {
    this.confirming.set(true);
    this.error.set('');
    this.password.reset();
    this.atStake.set(undefined);
    this.subscriptions.getCurrent().subscribe({
      next: (current) => this.atStake.set(current && IN_FORCE.includes(current.status) ? current : null),
      // sans la reponse on ne l'affiche pas : si un abonnement existe, le back repond 409 et la carte le montre alors
      error: () => this.atStake.set(null),
    });
  }

  cancelConfirmation(): void {
    this.confirming.set(false);
    this.error.set('');
  }

  deleteAccount(): void {
    this.error.set('');
    if (!this.password.value) {
      this.error.set('Entrez votre mot de passe pour confirmer.');
      return;
    }

    this.busy.set(true);
    this.service.deleteAccount(this.password.value, this.hasSubscription()).subscribe({
      next: () => {
        // le compte n'existe plus : on oublie la session sans attendre le back, puis retour a l'accueil
        this.auth.logout(false);
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 409 && err.error?.subscription) {
          // un abonnement que la carte ne montrait pas : on le montre, l'utilisateur confirme en connaissance de cause
          this.atStake.set(err.error.subscription);
          this.error.set('Relisez l’avertissement ci-dessus, puis confirmez.');
          return;
        }
        this.error.set(messageOf(err));
      },
    });
  }
}
