import { Component, computed, inject, signal } from '@angular/core';
import { FaqService } from '../home/faq.service';
import { FaqArticle } from '../home/faq.model';

// page "Questions fréquentes" semblable au figma, branchee sur GET /api/faq (le meme service que le bloc FAQ
// de l'accueil). Une colonne par categorie renvoyee par le back (Clients, Producteurs...), dans l'ordre des
// positions : ce qui est modifie dans l'admin se retrouve ici tel quel.
@Component({
  selector: 'app-faq',
  standalone: true,
  templateUrl: './faq.component.html',
})
export class FaqComponent {
  private faqService = inject(FaqService);

  private articles = signal<FaqArticle[]>([]);
  loaded = signal(false);

  groups = computed(() => {
    const byCategory = new Map<string, FaqArticle[]>();
    for (const article of this.articles()) {
      const label = article.category ?? 'Autre';
      byCategory.set(label, [...(byCategory.get(label) ?? []), article]);
    }
    return [...byCategory].map(([label, items]) => ({ label, items }));
  });

  // un seul accordeon ouvert par colonne, le premier au depart comme sur le figma
  private openIds = signal<Record<string, string>>({});

  constructor() {
    this.faqService.getAll().subscribe({
      next: (articles) => {
        this.articles.set(articles);
        this.openIds.set(Object.fromEntries(this.groups().map((g) => [g.label, g.items[0].id])));
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  isOpen(label: string, id: string): boolean {
    return this.openIds()[label] === id;
  }

  toggle(label: string, id: string): void {
    this.openIds.update((open) => ({ ...open, [label]: open[label] === id ? '' : id }));
  }
}
