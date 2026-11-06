import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// lectures publiques du back (catalogue, FAQ, pages legales, producteurs) : elles ne lisent jamais l'utilisateur, on n'y met pas le jeton.
// Sans en-tete Authorization c'est une requete CORS "simple" que le navigateur envoie directement, sans la requete OPTIONS qui
// precede chaque nouvelle adresse (un aller-retour de plus). Et un jeton expire ne les fait plus echouer en 401.
// Le chemin est celui qui suit l'adresse de l'API : /producers... mais pas /producer/... (l'espace producteur, lui, est connecte).
const PUBLIC_READ = /^\/(categories|products|labels|units|legal|faq|producers)(\/|\?|$)/;

const isPublicRead = (req: HttpRequest<unknown>): boolean =>
  req.method === 'GET' && req.url.startsWith(environment.apiURL) && PUBLIC_READ.test(req.url.slice(environment.apiURL.length));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && !isPublicRead(req)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
