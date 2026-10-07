import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// espace producteur (semblable au figma) : barre laterale en desktop, barre d'onglets en bas en mobile. Pas de
// navbar ni de footer du site public ici (voir App)

@Component({
  selector: 'app-producer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './producer-layout.component.html',
})
export class ProducerLayoutComponent {
  readonly items = [
    { label: 'Accueil', link: '/producer', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
    { label: 'Demandes', link: '/producer/requests', icon: 'M4 6h16 M4 12h16 M4 18h10' },
    { label: 'Messages', link: undefined, icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    {
      label: 'Abonnement',
      link: undefined,
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    { label: 'Profil', link: undefined, icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  ];
}
