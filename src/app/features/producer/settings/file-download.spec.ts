import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveFile } from './file-download';

describe('saveFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fait enregistrer le blob sous le nom donne, puis libere son adresse temporaire', () => {
    URL.createObjectURL = vi.fn(() => 'blob:fichier-temporaire');
    URL.revokeObjectURL = vi.fn();
    const clicked: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download });
    });
    const blob = new Blob(['{}']);

    saveFile(blob, 'mes-donnees.json');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: 'blob:fichier-temporaire', download: 'mes-donnees.json' }]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fichier-temporaire');
  });
});
