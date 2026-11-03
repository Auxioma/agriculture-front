import { Observable, shareReplay, tap } from 'rxjs';

// garde la reponse d'une lecture publique en memoire pendant `ttlMs` : revenir sur une page qui la demande ne refait pas l'appel.
// Les abonnes qui arrivent pendant le chargement partagent le meme appel. Une erreur n'est pas gardee : l'appel suivant redemande.
// Une entree par combinaison d'arguments.
// A reserver aux donnees que l'utilisateur ne modifie pas lui-meme (FAQ, producteurs a la une...), jamais a ses propres donnees.
export function ttlCache<A extends unknown[], T>(
  ttlMs: number,
  load: (...args: A) => Observable<T>,
): (...args: A) => Observable<T> {
  const entries = new Map<string, { loadedAt: number; shared$: Observable<T> }>();

  return (...args: A) => {
    const key = JSON.stringify(args);
    const entry = entries.get(key);
    if (entry && Date.now() - entry.loadedAt < ttlMs) return entry.shared$;

    const shared$: Observable<T> = load(...args).pipe(
      tap({ error: () => entries.get(key)?.shared$ === shared$ && entries.delete(key) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    entries.set(key, { loadedAt: Date.now(), shared$ });
    return shared$;
  };
}
