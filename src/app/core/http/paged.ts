import { HttpClient, HttpResponse } from '@angular/common/http';
import { EMPTY, Observable, defer, expand, last, map } from 'rxjs';

// Les listes de l'API sont paginées (cahier DevOps : « pagination obligatoire ») : le corps reste un tableau, et le total de TOUTES
// les pages voyage dans l'en-tête X-Total-Count (voir Pagination côté back). Sans cet en-tête (une liste qui n'est pas paginée, ou une
// réponse d'avant), la page reçue est la liste entière.

const TOTAL_COUNT_HEADER = 'X-Total-Count';

type Params = Record<string, string | number | boolean>;

export interface Page<T> {
  items: T[];
  /** Le total de toutes les pages ; null si le back ne l'a pas donné */
  total: number | null;
}

/** Lit le total de l'en-tête ; null s'il est absent ou illisible. */
function totalOf(response: HttpResponse<unknown>): number | null {
  const total = Number(response.headers.get(TOTAL_COUNT_HEADER));

  return response.headers.has(TOTAL_COUNT_HEADER) && Number.isInteger(total) && total >= 0
    ? total
    : null;
}

/** Une page d'une liste (la première quand `page` n'est pas dans `params`), avec le total de toutes les pages. */
export function getPage<T>(
  http: HttpClient,
  url: string,
  params: Params = {},
): Observable<Page<T>> {
  return http
    .get<T[]>(url, { params, observe: 'response' })
    .pipe(map((response) => ({ items: response.body ?? [], total: totalOf(response) })));
}

/** Reste-t-il des éléments à charger ? Faux quand le total est inconnu (la liste reçue est alors entière). */
export function hasMore(loaded: number, total: number | null): boolean {
  return total !== null && loaded < total;
}

/**
 * Toute la liste, page après page, pour un écran qui en a besoin en entier (favoris, adresses...). La première requête est celle
 * d'avant, sans `page` : une liste qui tient en une page ne coûte pas une requête de plus, et une page vide arrête la boucle
 * même si le total annoncé ne se laisse pas atteindre.
 */
export function getAllPages<T>(
  http: HttpClient,
  url: string,
  params: Params = {},
): Observable<T[]> {
  interface Loaded {
    items: T[];
    total: number | null;
    page: number;
    received: number;
  }
  const fetch = (page: number, before: T[]): Observable<Loaded> =>
    getPage<T>(http, url, page === 1 ? params : { ...params, page }).pipe(
      map((result) => ({
        items: [...before, ...result.items],
        total: result.total,
        page,
        received: result.items.length,
      })),
    );

  return defer(() => fetch(1, [])).pipe(
    expand((loaded) =>
      loaded.received > 0 && hasMore(loaded.items.length, loaded.total)
        ? fetch(loaded.page + 1, loaded.items)
        : EMPTY,
    ),
    last(),
    map((loaded) => loaded.items),
  );
}
