import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// page "Espace producteurs" semblable au figma (mobile first). Contenu statique, chiffres a faire valider
// par le client : le 9€ vient du cahier des charges (forfait Essentiel), pas des forfaits du back.
@Component({
  selector: 'app-producer-space',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './producer-space.component.html',
})
export class ProducerSpaceComponent {
  readonly stats = [
    { value: '0%', label: 'commission sur vos ventes' },
    { value: '9€', label: 'abonnement dès /mois' },
  ];

  readonly benefits = [
    'Visibilité locale auprès de particuliers et professionnels qualifiés',
    'Demandes qualifiées uniquement, adaptées à vos produits et votre zone',
    'Un outil simple, utilisable même sur le terrain, sur mobile',
    'Aucune commission sur vos ventes, un abonnement transparent',
  ];
}
