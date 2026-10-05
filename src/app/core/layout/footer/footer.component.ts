import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// footer semblable au figma, visuel seulement : les liens ne redirigent nulle part pour l'instant, on
// branchera les routes quand les pages existeront. "Mes demandes" au lieu de "Mes annonces" (le cahier des
// charges parle de demandes, comme le back) et le nom du site est celui du cahier/back (TrouveMoi Agri).
// Pas encore de fichier logo dans le projet : le nom en texte fait office de logo pour le moment.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  // seuls les liens listés ici redirigent (les autres pages n'existent pas encore), a completer au fur et a mesure
  readonly paths: Record<string, string> = {
    'Qui sommes-nous ?': '/about',
    'Comment ça marche ?': '/how-it-works',
    'Espace producteurs': '/producer-space',
  };

  readonly groups = [
    {
      title: 'Explorer',
      links: ['Toutes les catégories', 'Producteurs', 'Espace producteurs', 'Tarifs producteurs'],
    },
    {
      title: 'A propos',
      links: ['Qui sommes-nous ?', 'Comment ça marche ?', 'Ressources', 'Contact'],
    },
    {
      title: 'Aide & support',
      links: [
        'FAQ',
        "Conditions générales d'utilisation",
        'Politique de confidentialité',
        'Mentions légales',
      ],
    },
    {
      title: 'Mon compte',
      links: ['Mes demandes', 'Mes favoris', 'Messages', 'Connexion', 'Inscription'],
    },
  ];

  readonly year = new Date().getFullYear();
}
