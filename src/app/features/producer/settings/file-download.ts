import { InjectionToken } from '@angular/core';

// fait enregistrer un fichier par le navigateur : un lien temporaire sur lequel on clique, puis qu'on jette
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// injectable : les tests le remplacent (jsdom n'a rien a enregistrer) sans avoir a simuler un module
export const SAVE_FILE = new InjectionToken<typeof saveFile>('SAVE_FILE', { providedIn: 'root', factory: () => saveFile });
