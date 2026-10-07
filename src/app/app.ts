import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { NavbarComponent } from './core/layout/navbar/navbar.component';
import { FooterComponent } from './core/layout/footer/footer.component';

// l'espace producteur (/producer...) a son propre menu : pas de navbar ni de footer du site public
const inProducerArea = (url: string) => url.startsWith('/producer');

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  authService = inject(AuthService);

  // Location.path() donne deja la bonne adresse au premier affichage, avant la fin de la navigation
  showSiteChrome = toSignal(
    inject(Router).events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => !inProducerArea(event.urlAfterRedirects)),
    ),
    { initialValue: !inProducerArea(inject(Location).path()) },
  );

  ngOnInit(): void {
    this.authService.initAuthState().subscribe();
  }
}
