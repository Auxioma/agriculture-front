import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { producerGuard } from './features/producer/producer.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'how-it-works',
    loadComponent: () =>
      import('./features/how-it-works/how-it-works.component').then((m) => m.HowItWorksComponent),
  },
  {
    path: 'producer-space',
    loadComponent: () =>
      import('./features/producer-space/producer-space.component').then((m) => m.ProducerSpaceComponent),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/pricing/pricing.component').then((m) => m.PricingComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./features/faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'resources',
    loadComponent: () =>
      import('./features/resources/resources.component').then((m) => m.ResourcesComponent),
  },
  {
    path: 'legal/:code',
    loadComponent: () => import('./features/legal/legal.component').then((m) => m.LegalComponent),
  },
  {
    path: 'producer',
    canActivate: [producerGuard],
    loadComponent: () =>
      import('./features/producer/producer-layout/producer-layout.component').then((m) => m.ProducerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/producer/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./features/producer/requests/requests.component').then((m) => m.RequestsComponent),
      },
      {
        path: 'requests/received',
        loadComponent: () =>
          import('./features/producer/requests/received/received.component').then((m) => m.ReceivedComponent),
      },
      {
        path: 'requests/quotes',
        loadComponent: () => import('./features/producer/requests/quotes/quotes.component').then((m) => m.QuotesComponent),
      },
      {
        path: 'requests/quotes/:id',
        loadComponent: () =>
          import('./features/producer/requests/quotes/detail/quote-detail.component').then((m) => m.QuoteDetailComponent),
      },
      // apres requests/received et requests/quotes : sinon "received" ou "quotes" serait pris pour un identifiant de demande
      {
        path: 'requests/:id',
        loadComponent: () => import('./features/producer/requests/detail/detail.component').then((m) => m.DetailComponent),
      },
      {
        path: 'requests/:id/reply',
        loadComponent: () => import('./features/producer/requests/reply/reply.component').then((m) => m.ReplyComponent),
      },
      {
        path: 'requests/:id/report',
        loadComponent: () => import('./features/producer/requests/report/report.component').then((m) => m.ReportComponent),
      },
      {
        path: 'subscription',
        loadComponent: () => import('./features/producer/subscription/subscription.component').then((m) => m.SubscriptionComponent),
      },
      {
        path: 'subscription/payment-methods',
        loadComponent: () =>
          import('./features/producer/subscription/payment-methods/payment-methods.component').then((m) => m.PaymentMethodsComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/producer/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/producer/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('./features/producer/profile/profile-edit.component').then((m) => m.ProfileEditComponent),
      },
      {
        path: 'profile/settings',
        loadComponent: () => import('./features/producer/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'profile/labels',
        loadComponent: () => import('./features/producer/labels/labels.component').then((m) => m.LabelsComponent),
      },
      {
        path: 'support',
        loadComponent: () => import('./features/producer/support/support.component').then((m) => m.SupportComponent),
      },
    ],
  },
  { path: 'auth', children: AUTH_ROUTES },
  {
    path: 'categories',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
  },
  {
    path: 'producers',
    loadComponent: () =>
      import('./features/catalog/pages/producers/producers.component').then(
        (m) => m.ProducersComponent,
      ),
  },
  {
    path: 'producers/:id',
    loadComponent: () =>
      import('./features/catalog/pages/producer-detail/producer-detail.component').then(
        (m) => m.ProducerDetailComponent,
      ),
  },
];
