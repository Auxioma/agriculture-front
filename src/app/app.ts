import { Component, Injector, afterNextRender, inject, OnInit } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { NavbarComponent } from './core/layout/navbar/navbar.component';
import { FooterComponent } from './core/layout/footer/footer.component';

// l'espace producteur (/producer...) a son propre menu : pas de navbar ni de footer du site public. /producer-space est une page publique,
// pas de l'espace (index.html applique la meme regle a son squelette)
const inProducerArea = (url: string) => /^\/producer(\/|\?|#|$)/.test(url);

// la navigation est finie. Une redirection de la garde (vers la connexion...) n'est pas la fin : la page d'arrivee n'est pas encore la
const endsNavigation = (event: RouterEvent) =>
  event instanceof NavigationEnd ||
  event instanceof NavigationError ||
  (event instanceof NavigationCancel && event.code === NavigationCancellationCode.GuardRejected);
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
  private document = inject(DOCUMENT);
  private injector = inject(Injector);

  // Location.path() donne deja la bonne adresse au premier affichage, avant la fin de la navigation
  showSiteChrome = toSignal(
    inject(Router).events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => !inPrivateArea(event.urlAfterRedirects)),
    ),
    { initialValue: !inPrivateArea(inject(Location).path()) },
  );

  constructor() {
    // le squelette de index.html (espace producteur) s'efface quand la 1re navigation est finie et affichee
    inject(Router)
      .events.pipe(filter(endsNavigation), take(1), takeUntilDestroyed())
      .subscribe(() => afterNextRender(() => this.document.getElementById('boot-skeleton')?.remove(), { injector: this.injector }));
  }

  ngOnInit(): void {
    this.authService.initAuthState().subscribe();
  }
}
