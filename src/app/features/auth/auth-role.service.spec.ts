import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { AuthRoleService } from './auth-role.service';

describe('AuthRoleService', () => {
  let service: AuthRoleService;
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;

  function setup(initialQueryParam?: string): void {
    TestBed.configureTestingModule({
      providers: [
        AuthRoleService,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                initialQueryParam ? { role: initialQueryParam } : {},
              ),
            },
          },
        },
      ],
    });

    service = TestBed.inject(AuthRoleService);

    const router = TestBed.inject(Router);
    routerNavigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  it('devrait démarrer avec le rôle "client" par défaut', () => {
    setup();

    expect(service.role()).toBe('client');
    expect(service.pageTitle()).toBe('Espace client');
  });

  it('devrait démarrer avec le rôle "producer" si présent dans l\'URL', () => {
    setup('producer');

    expect(service.role()).toBe('producer');
    expect(service.pageTitle()).toBe('Espace producteur');
  });

  it('devrait passer à "producer" et mettre à jour le titre et l\'URL', () => {
    setup();

    service.selectRole('producer');

    expect(service.role()).toBe('producer');
    expect(service.pageTitle()).toBe('Espace producteur');
    expect(routerNavigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { role: 'producer' },
      }),
    );
  });

  it('devrait revenir à "client" après un aller-retour', () => {
    setup();

    service.selectRole('producer');
    service.selectRole('client');

    expect(service.role()).toBe('client');
    expect(service.pageTitle()).toBe('Espace client');
    expect(routerNavigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { role: 'client' },
      }),
    );
  });
});
