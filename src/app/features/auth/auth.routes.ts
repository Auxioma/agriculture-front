import { Routes } from '@angular/router';
import { AuthRoleService } from './auth-role.service';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    providers: [AuthRoleService],
    loadComponent: () =>
      import('./auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./register/register.component').then((m) => m.RegisterComponent),
      },
    ],
  },
];
