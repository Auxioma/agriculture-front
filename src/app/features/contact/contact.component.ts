import { Component } from '@angular/core';

// page "Contactez-nous" semblable au figma (mobile first). Le formulaire n'envoie rien pour l'instant : cote
// back il n'y a que POST /api/support/tickets, qui demande d'etre connecte et ne prend pas nom/email, donc pas
// de route publique pour un visiteur. A brancher quand elle existera.
@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  readonly fields = [
    { id: 'name', label: 'Nom complet', type: 'text', autocomplete: 'name', placeholder: 'Votre nom' },
    { id: 'email', label: 'Adresse email', type: 'email', autocomplete: 'email', placeholder: 'vous@email.com' },
    { id: 'subject', label: 'Sujet', type: 'text', autocomplete: 'off', placeholder: 'Question sur mon abonnement' },
  ];
}
