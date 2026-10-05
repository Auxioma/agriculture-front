import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/category-producers/category-producers.component').then(
        (m) => m.CategoryProducersComponent,
      ),
  },
];
