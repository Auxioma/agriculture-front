import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './api-error';

const DEFAULT_MESSAGE = 'Une erreur est survenue. Réessayez.';

describe('apiErrorMessage', () => {
  it("renvoie le message par défaut si l'erreur n'est pas une erreur HTTP", () => {
    expect(apiErrorMessage(new Error('boom'))).toBe(DEFAULT_MESSAGE);
    expect(apiErrorMessage('texte')).toBe(DEFAULT_MESSAGE);
  });

  it('utilise le message de repli fourni par le composant', () => {
    expect(apiErrorMessage(new Error('boom'), 'Suppression impossible.')).toBe(
      'Suppression impossible.',
    );
  });

  it('gère le 429 (trop de tentatives)', () => {
    const err = new HttpErrorResponse({ status: 429 });
    expect(apiErrorMessage(err)).toBe('Trop de tentatives, réessayez plus tard.');
  });

  it('le 429 est prioritaire sur le contenu du corps', () => {
    const err = new HttpErrorResponse({ status: 429, error: { error: 'autre message' } });
    expect(apiErrorMessage(err)).toBe('Trop de tentatives, réessayez plus tard.');
  });

  it('lit le format { error } de nos contrôleurs Symfony', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { error: 'Mot de passe actuel incorrect.' },
    });
    expect(apiErrorMessage(err)).toBe('Mot de passe actuel incorrect.');
  });

  it('lit la première violation du format { violations } (validation Symfony)', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { violations: [{ title: 'Code postal invalide.' }, { title: 'Autre.' }] },
    });
    expect(apiErrorMessage(err)).toBe('Code postal invalide.');
  });

  it('renvoie le message de repli si le corps est inconnu, vide ou sans violation', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500 }), 'Repli.')).toBe('Repli.');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: {} }), 'Repli.')).toBe(
      'Repli.',
    );
    expect(
      apiErrorMessage(new HttpErrorResponse({ status: 422, error: { violations: [] } }), 'Repli.'),
    ).toBe('Repli.');
  });
});
