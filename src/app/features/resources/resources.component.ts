import { Component } from '@angular/core';

// page "Blog & ressources" semblable au figma (mobile first). Pas de blog cote back (ni dans le MCD ni dans
// les cahiers, juste une page "Blog / ressources" dans la liste des pages publiques), donc les 3 articles
// sont ecrits en dur et ne menent nulle part pour l'instant. Photos unsplash (licence libre) en attendant
// les vraies images des articles : photo-1471193945509, photo-1586819158505, photo-1725380054710.
@Component({
  selector: 'app-resources',
  standalone: true,
  templateUrl: './resources.component.html',
})
export class ResourcesComponent {
  readonly articles = [
    {
      tag: 'Saisonnalité',
      title: 'Que manger en septembre ? Le calendrier des fruits et légumes de saison',
      excerpt: 'Retrouvez tous les produits de saison à demander à vos producteurs locaux ce mois-ci.',
      date: '12 août 2026',
      image: '/images/blog/saisonnalite.jpg',
      alt: 'Poireaux, carottes et pommes de terre sur un étal de marché',
    },
    {
      tag: 'Producteurs',
      title: '3 conseils pour bien répondre à une demande client',
      excerpt: 'Comment transformer une demande en vente en direct grâce à une réponse claire et rapide.',
      date: '5 août 2026',
      image: '/images/blog/producteurs.jpg',
      alt: 'Mains tenant un smartphone devant un champ',
    },
    {
      tag: 'Circuits courts',
      title: 'Pourquoi acheter en direct auprès des producteurs ?',
      excerpt: 'Les bénéfices de la vente directe pour les consommateurs et les agriculteurs locaux.',
      date: '28 juillet 2026',
      image: '/images/blog/circuits-courts.jpg',
      alt: 'Clients et vendeurs autour des étals de fruits et légumes d’un marché',
    },
  ];
}
