import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// page "Comment ça marche ?" semblable au figma. Contenu statique, rien a aller chercher cote back. Les 3 etapes
// client reprennent celles du cahier des charges (demande, reponses, achat direct).
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './how-it-works.component.html',
})
export class HowItWorksComponent {
  readonly columns = [
    {
      label: 'Pour les clients',
      steps: [
        {
          title: 'Demandez un prix',
          text: 'Choisissez un produit, décrivez votre besoin et envoyez votre demande en moins de 3 minutes.',
        },
        {
          title: 'Recevez des réponses',
          text: 'Les producteurs pertinents autour de vous vous répondent avec un prix et une disponibilité.',
        },
        {
          title: 'Achetez en direct',
          text: "Discutez, mettez-vous d'accord et organisez le retrait ou la livraison directement avec le producteur.",
        },
      ],
    },
    {
      label: 'Pour les producteurs',
      steps: [
        {
          title: 'Créez votre profil',
          text: 'Décrivez votre exploitation, vos produits, vos disponibilités et vos zones de vente.',
        },
        {
          title: 'Recevez des demandes',
          text: 'Vous recevez uniquement des demandes qualifiées, pertinentes autour de vous.',
        },
        {
          title: 'Répondez et vendez',
          text: 'Proposez un prix, discutez et organisez la vente en direct — sans commission.',
        },
      ],
    },
  ];
}
