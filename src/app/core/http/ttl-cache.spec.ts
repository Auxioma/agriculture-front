import { Observable, Subject, defer, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ttlCache } from './ttl-cache';

const TTL = 60_000;

describe('ttlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
  });

  afterEach(() => vi.useRealTimers());

  const read = <T>(source$: Observable<T>): T => {
    let value: T | undefined;
    source$.subscribe((v) => (value = v));
    return value as T;
  };

  it('ne redemande pas pendant la durée, et rend la même valeur', () => {
    const load = vi.fn(() => of('a'));
    const cached = ttlCache(TTL, load);

    expect(read(cached())).toBe('a');
    vi.advanceTimersByTime(TTL - 1);
    expect(read(cached())).toBe('a');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('redemande une fois la durée écoulée, et garde la nouvelle valeur', () => {
    let n = 0;
    const load = vi.fn(() => of(`v${++n}`));
    const cached = ttlCache(TTL, load);

    expect(read(cached())).toBe('v1');
    vi.advanceTimersByTime(TTL);
    expect(read(cached())).toBe('v2');
    expect(read(cached())).toBe('v2');

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('ceux qui arrivent pendant le chargement partagent le même appel', () => {
    const pending = new Subject<string>();
    const load = vi.fn(() => pending.asObservable());
    const cached = ttlCache(TTL, load);
    const seen: string[] = [];

    cached().subscribe((v) => seen.push(`1:${v}`));
    cached().subscribe((v) => seen.push(`2:${v}`));
    pending.next('a');

    expect(load).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(['1:a', '2:a']);
  });

  it('la lecture va à son terme même si la page qui la demandait est partie : on la garde pour le retour', () => {
    const pending = new Subject<string>();
    let reads = 0;
    const cached = ttlCache(TTL, () =>
      defer(() => {
        reads++;
        return pending;
      }),
    );

    cached().subscribe().unsubscribe();
    pending.next('a');
    pending.complete();

    expect(read(cached())).toBe('a');
    expect(reads).toBe(1);
  });

  it('ne garde pas une erreur : l’abonné suivant redemande', () => {
    let fail = true;
    const load = vi.fn(() => (fail ? throwError(() => new Error('API injoignable')) : of('ok')));
    const cached = ttlCache(TTL, load);
    let error: unknown;

    cached().subscribe({ error: (e) => (error = e) });
    expect((error as Error).message).toBe('API injoignable');

    fail = false;
    expect(read(cached())).toBe('ok');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('garde une entrée par combinaison d’arguments', () => {
    const load = vi.fn((limit: number) => of(`limite ${limit}`));
    const cached = ttlCache(TTL, load);

    expect(read(cached(3))).toBe('limite 3');
    expect(read(cached(5))).toBe('limite 5');
    expect(read(cached(3))).toBe('limite 3');

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenNthCalledWith(1, 3);
    expect(load).toHaveBeenNthCalledWith(2, 5);
  });

  it('chaque cache a ses propres entrées', () => {
    const a = ttlCache(TTL, vi.fn(() => of('a')));
    const b = ttlCache(TTL, vi.fn(() => of('b')));

    expect(read(a())).toBe('a');
    expect(read(b())).toBe('b');
  });
});
