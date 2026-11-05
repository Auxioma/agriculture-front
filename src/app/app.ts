import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { NavbarComponent } from './core/layout/navbar/navbar.component';
import { FooterComponent } from './core/layout/footer/footer.component';

// les espaces connectés (/producer..., /client...) ont leur propre menu : pas de navbar ni de footer du site public
const AREAS_WITHOUT_CHROME = /^\/(producer|client)(\/|\?|#|$)/;
const inPrivateArea = (url: string) => AREAS_WITHOUT_CHROME.test(url);

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
      map((event) => !inPrivateArea(event.urlAfterRedirects)),
    ),
    { initialValue: !inPrivateArea(inject(Location).path()) },
  );

  ngOnInit(): void {
    this.authService.initAuthState().subscribe();
  }
}
