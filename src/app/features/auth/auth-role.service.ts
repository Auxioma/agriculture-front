import { Injectable, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export type AuthRole = 'client' | 'producer';

@Injectable() // pas de providedIn: 'root' — fourni uniquement au niveau des routes /auth/*
export class AuthRoleService {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private initialRole = (): AuthRole => {
    const fromUrl = this.route.snapshot.queryParamMap.get('role');
    return fromUrl === 'producer' ? 'producer' : 'client';
  };

  role = signal<AuthRole>(this.initialRole());

  pageTitle = computed(() => (this.role() === 'client' ? 'Espace client' : 'Espace producteur'));
  titleDesc = computed(() =>
    this.role() === 'client'
      ? 'Déposez des demandes et échangez avec des producteurs.'
      : 'Recevez des demandes qualifiées près de chez vous.',
  );

  selectRole(role: AuthRole): void {
    this.role.set(role);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { role },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
