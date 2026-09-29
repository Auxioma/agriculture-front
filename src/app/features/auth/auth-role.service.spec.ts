import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthRoleService } from './auth-role.service';

describe('AuthRoleService', () => {
  let service: AuthRoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthRoleService],
    });
    service = TestBed.inject(AuthRoleService);
  });

  it('devrait démarrer avec le rôle "client" par défaut', () => {
    expect(service.role()).toBe('client');
    expect(service.pageTitle()).toBe('Espace client');
  });

  it('devrait passer à "producer" et mettre à jour le titre', () => {
    service.selectRole('producer');

    expect(service.role()).toBe('producer');
    expect(service.pageTitle()).toBe('Espace producteur');
  });

  it('devrait revenir à "client" après un aller-retour', () => {
    service.selectRole('producer');
    service.selectRole('client');

    expect(service.role()).toBe('client');
    expect(service.pageTitle()).toBe('Espace client');
  });
});
