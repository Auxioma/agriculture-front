import { Routes } from '@angular/router';
import { RequestFunnelComponent } from './request-funnel.component';
import { RequestDraftStore } from './state/request-draft.store';
import { stepGuard } from './funnel-steps';

// Les chemins ci-dessous doivent rester synchronisés avec STEP_PATHS (funnel-steps.ts).
export const REQUEST_FUNNEL_ROUTES: Routes = [
  {
    path: '',
    component: RequestFunnelComponent,
    providers: [RequestDraftStore], // une instance du store partagée par toutes les étapes
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'product' },
      {
        path: 'product',
        canActivate: [stepGuard(1)],
        loadComponent: () =>
          import('./components/steps/step-product.component').then((m) => m.StepProductComponent),
      },
      {
        path: 'needs',
        canActivate: [stepGuard(2)],
        loadComponent: () =>
          import('./components/steps/step-need.component').then((m) => m.StepNeedComponent),
      },
      {
        path: 'details',
        canActivate: [stepGuard(3)],
        loadComponent: () =>
          import('./components/steps/step-details.component').then((m) => m.StepDetailsComponent),
      },
      {
        path: 'localisation',
        canActivate: [stepGuard(4)],
        loadComponent: () =>
          import('./components/steps/step-location.component').then((m) => m.StepLocationComponent),
      },
      {
        path: 'message',
        canActivate: [stepGuard(5)],
        loadComponent: () =>
          import('./components/steps/step-message.component').then((m) => m.StepMessageComponent),
      },
      {
        path: 'summary',
        canActivate: [stepGuard(6)],
        loadComponent: () =>
          import('./components/steps/step-summary.component').then((m) => m.StepSummaryComponent),
      },
      {
        // Pas de guard : le store est vidé juste avant d'arriver ici.
        path: 'sent',
        loadComponent: () =>
          import('./components/steps/step-sent.component').then((m) => m.StepSentComponent),
      },
    ],
  },
];
