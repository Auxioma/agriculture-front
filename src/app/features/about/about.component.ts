import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// page "Qui sommes-nous ?" : pas de figma, le contenu vient des cahiers des charges (fonctionnel + design) et
// le style reprend celui des autres pages. Rien d'invente sur l'entreprise (equipe, dates...), le seul
// chiffre externe est celui d'Agreste cite dans le cahier design.
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  readonly stats = [
    { value: '1 sur 4', label: "Près d'une exploitation vend en circuit court (Agreste, 2023)" },
    { value: '0%', label: 'de commission sur les ventes de produits' },
    { value: '0', label: 'panier : la vente reste directe, entre client et producteur' },
  ];

  // icones = un seul path svg chacune
  readonly values = [
    {
      title: 'Proximité',
      text: 'Des producteurs près de chez vous, des échanges directs et une relation humaine et locale.',
      icon: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    },
    {
      title: 'Confiance',
      text: 'Des profils vérifiés, des labels visibles et des avis modérés pour acheter l’esprit tranquille.',
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    },
    {
      title: 'Transparence',
      text: 'Des prix indicatifs ou des devis, des conditions expliquées et aucune promesse trompeuse.',
      icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    },
    {
      title: 'Juste valorisation',
      text: 'Le travail agricole est reconnu à sa juste valeur : pas d’intermédiaire, pas de commission sur les ventes.',
      icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    },
  ];

  readonly proofs = [
    'Profil vérifié, avec date de vérification',
    'Labels et pratiques affichés : Bio, HVE, AOP/AOC, agriculture raisonnée',
    "Photos authentiques de l'exploitation, des produits et des récoltes",
    'Calendrier de saisonnalité',
    'Avis clients publiés après une vraie interaction, et modérés',
  ];
}
