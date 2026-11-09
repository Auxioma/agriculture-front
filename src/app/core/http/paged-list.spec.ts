import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Page } from './paged';
import { PagedList } from './paged-list';

interface Item {
  id: string;
}
const item = (id: string): Item => ({ id });
const page = (ids: string[], total: number | null): Page<Item> => ({ items: ids.map(item), total });

describe('PagedList', () => {
  const keyOf = (i: Item) => i.id;

  it('attend la première page (undefined), puis garde ses éléments et le total', () => {
    const first = new Subject<Page<Item>>();
    const list = new PagedList(() => first, keyOf);
    expect(list.items()).toBeUndefined();

    first.next(page(['a', 'b'], 5));

    expect(list.items()).toEqual([item('a'), item('b')]);
    expect(list.total()).toBe(5);
    expect(list.loaded()).toBe(2);
    expect(list.hasMore()).toBe(true);
  });

  it("passe à null quand la première page n'arrive pas", () => {
    const list = new PagedList(() => throwError(() => new Error('API down')), keyOf);

    expect(list.items()).toBeNull();
    expect(list.hasMore()).toBe(false);
  });

  it('ne dit pas « il en reste » quand le total est inconnu ou atteint', () => {
    expect(new PagedList(() => of(page(['a'], null)), keyOf).hasMore()).toBe(false);
    expect(new PagedList(() => of(page(['a', 'b'], 2)), keyOf).hasMore()).toBe(false);
  });

  it('loadMore() demande la page suivante et la met à la suite', () => {
    const fetchPage = vi.fn((n: number) => of(n === 1 ? page(['a', 'b'], 3) : page(['c'], 3)));
    const list = new PagedList(fetchPage, keyOf);

    list.loadMore();

    expect(fetchPage).toHaveBeenLastCalledWith(2);
    expect(list.items()).toEqual([item('a'), item('b'), item('c')]);
    expect(list.hasMore()).toBe(false);
  });

  it('ne répète pas un élément déjà chargé (la liste a bougé entre deux pages)', () => {
    const fetchPage = (n: number) => of(n === 1 ? page(['a', 'b'], 4) : page(['b', 'c', 'd'], 4));
    const list = new PagedList(fetchPage, keyOf);

    list.loadMore();

    expect(list.items()?.map(keyOf)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ne lance pas deux chargements en même temps, ni un chargement sans suite', () => {
    const second = new Subject<Page<Item>>();
    const fetchPage = vi.fn((n: number) => (n === 1 ? of(page(['a'], 3)) : second));
    const list = new PagedList(fetchPage, keyOf);

    list.loadMore();
    list.loadMore();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(list.loadingMore()).toBe(true);

    second.next(page(['b', 'c'], 3));
    list.loadMore();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(list.loadingMore()).toBe(false);
  });

  it("garde les éléments chargés quand la page suivante n'arrive pas, et laisse réessayer", () => {
    let fail = true;
    const fetchPage = (n: number) =>
      n === 1
        ? of(page(['a'], 2))
        : fail
          ? throwError(() => new Error('API down'))
          : of(page(['b'], 2));
    const list = new PagedList(fetchPage, keyOf);

    list.loadMore();
    expect(list.moreFailed()).toBe(true);
    expect(list.items()).toEqual([item('a')]);
    expect(list.loadingMore()).toBe(false);

    fail = false;
    list.loadMore();
    expect(list.moreFailed()).toBe(false);
    expect(list.items()).toEqual([item('a'), item('b')]);
  });
});
