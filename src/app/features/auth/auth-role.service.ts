import { Injectable, signal, computed } from '@angular/core';

export type AuthRole = 'client' | 'producer';

@Injectable() // pas de providedIn: 'root' — fourni uniquement au niveau des routes /auth/*
export class AuthRoleService {
  role = signal<AuthRole>('client');

  pageTitle = computed(() => (this.role() === 'client' ? 'Espace client' : 'Espace producteur'));
  titleDesc = computed(() =>
    this.role() === 'client'
      ? 'Déposez des demandes et échangez avec des producteurs.'
      : 'Recevez des demandes qualifiées près de chez vous.',
  );

  selectRole(role: AuthRole): void {
    this.role.set(role);
  }
}
