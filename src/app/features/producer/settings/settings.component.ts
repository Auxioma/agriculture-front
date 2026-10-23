import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// tracés svg des icones (trait de 2), une ligne = un ou plusieurs <path>
const BELL = ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'];
const LOCK = ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'];
const SHIELD = ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'];
const HELP = ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'];
const GLOBE = ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20'];
const EURO = ['M18 7a6 6 0 1 0 0 10', 'M4 10h9', 'M4 14h9'];

//! page Parametres semblable au figma mobile : une ligne par rubrique, chacune ouvrira sa propre page. Seul "Aide et support"
// a une destination (la page support existe), les autres arrivent avec leur ecran. Le figma desktop les montre en accordeon
// et dans un autre ordre --> on garde la meme liste partout (ordre du mobile) en attendant leur contenu.
// Langue et devise affichent la seule valeur proposee aujourd'hui (francais, euro), pas encore lue dans les preferences.
@Component({
  selector: 'app-producer-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  readonly items: { title: string; hint: string; icon: string[]; link?: string }[] = [
    { title: 'Notifications', hint: 'Demandes, paiements, abonnement', icon: BELL },
    { title: 'Sécurité', hint: 'Mot de passe, connexion', icon: LOCK },
    { title: 'Données personnelles', hint: 'Export et suppression RGPD', icon: SHIELD },
    { title: 'Aide et support', hint: 'Contacter le support', icon: HELP, link: '/producer/support' },
    { title: 'Langue', hint: 'Français', icon: GLOBE },
    { title: 'Devise', hint: 'Euro (€)', icon: EURO },
  ];
}
