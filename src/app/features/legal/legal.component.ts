import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { LegalService } from './legal.service';

type Block = { heading: boolean; text: string };

// pages legales semblables au figma ("Mentions légales"), branchees sur GET /api/legal/{code} : un seul
// composant pour /legal/mentions-legales, /legal/cgu, /legal/confidentialite... Le contenu du back est du
// texte simple : une ligne "## Titre" = un titre de section, le reste = paragraphes (ligne vide entre deux).
@Component({
  selector: 'app-legal',
  standalone: true,
  templateUrl: './legal.component.html',
})
export class LegalComponent {
  private legalService = inject(LegalService);

  // undefined = chargement, null = page introuvable (404) ou back injoignable
  page = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) =>
        this.legalService.getPage(params.get('code') ?? '').pipe(catchError(() => of(null))),
      ),
    ),
  );

  blocks = computed(() => {
    const blocks: Block[] = [];
    let paragraph = '';
    const endParagraph = () => {
      if (paragraph) blocks.push({ heading: false, text: paragraph });
      paragraph = '';
    };

    for (const line of (this.page()?.content ?? '').split('\n')) {
      const text = line.trim();
      if (text.startsWith('## ')) {
        endParagraph();
        blocks.push({ heading: true, text: text.slice(3) });
      } else if (!text) {
        endParagraph();
      } else {
        paragraph += (paragraph ? ' ' : '') + text;
      }
    }
    endParagraph();

    return blocks;
  });
}
