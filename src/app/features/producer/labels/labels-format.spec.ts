import { describe, it, expect } from 'vitest';
import { BADGES, canAddDocument, documentError, labelDetail, labelKind } from './labels-format';
import { ClaimedLabel } from './labels.service';

const NOW = new Date('2026-10-26T10:00:00Z');
const claimed = (changes: Partial<ClaimedLabel> = {}): ClaimedLabel => ({
  labelId: 'l1',
  code: 'bio',
  name: 'Bio',
  verifiedAt: null,
  expiresAt: null,
  documentId: null,
  documentStatus: null,
  ...changes,
});

describe('labelKind', () => {
  it('ne declare rien quand le label n est pas declare', () => {
    expect(labelKind(undefined, NOW)).toBe('none');
  });

  it('distingue verifie, expire, en attente, refuse et declare sans justificatif', () => {
    expect(labelKind(claimed({ verifiedAt: '2026-03-12T10:00:00Z', expiresAt: '2027-03-12T10:00:00Z' }), NOW)).toBe('verified');
    expect(labelKind(claimed({ verifiedAt: '2026-03-12T10:00:00Z' }), NOW)).toBe('verified');
    expect(labelKind(claimed({ verifiedAt: '2025-03-12T10:00:00Z', expiresAt: '2026-03-12T10:00:00Z' }), NOW)).toBe('expired');
    expect(labelKind(claimed({ documentId: 'd1', documentStatus: 'pending' }), NOW)).toBe('pending');
    expect(labelKind(claimed({ documentId: 'd1', documentStatus: 'rejected' }), NOW)).toBe('rejected');
    expect(labelKind(claimed(), NOW)).toBe('declared');
  });

  it('un label verifie reste verifie meme si son justificatif est approuve', () => {
    expect(labelKind(claimed({ verifiedAt: '2026-03-12T10:00:00Z', documentId: 'd1', documentStatus: 'approved' }), NOW)).toBe('verified');
  });
});

describe('BADGES', () => {
  it('donne les mots du figma', () => {
    expect([BADGES.verified.text, BADGES.pending.text, BADGES.none.text]).toEqual(['Vérifié', 'En attente', 'Non déclaré']);
  });
});

describe('labelDetail', () => {
  it('ecrit la date de verification', () => {
    expect(labelDetail('verified', claimed({ verifiedAt: '2026-03-12T10:00:00+01:00' }))).toBe('Vérifié le 12 mars 2026');
  });

  it('dit ou en est chaque etat', () => {
    expect(labelDetail('pending', claimed())).toBe("Justificatif reçu, en cours d'examen");
    expect(labelDetail('rejected', claimed())).toBe('Justificatif refusé : ajoutez-en un autre');
    expect(labelDetail('declared', claimed())).toBe('Sans justificatif, ce label ne sera pas vérifié');
    expect(labelDetail('expired', claimed({ expiresAt: '2026-03-12T10:00:00+01:00' }))).toBe('Vérification expirée le 12 mars 2026');
  });

  it('ne dit rien d un label non declare', () => {
    expect(labelDetail('none', undefined)).toBe('');
  });
});

describe('canAddDocument', () => {
  it('permet d en ajouter sauf si le label est verifie ou qu un justificatif est en cours d examen', () => {
    expect(['none', 'declared', 'rejected', 'expired'].map((kind) => canAddDocument(kind as never))).toEqual([true, true, true, true]);
    expect(canAddDocument('verified')).toBe(false);
    expect(canAddDocument('pending')).toBe(false);
  });
});

describe('documentError', () => {
  // * 10 Mo, la limite du back (verification_documents) : écrite en dur pour que le test dise la règle, pas la constante
  const TEN_MB = 10 * 1024 * 1024;
  const file = (type: string, size = 100) => {
    const f = new File(['x'], 'justificatif', { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepte une image ou un pdf de 10 Mo au plus', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      expect(documentError(file(type))).toBeNull();
    }
    expect(documentError(file('application/pdf', TEN_MB))).toBeNull();
  });

  it('refuse un autre format ou un fichier trop lourd', () => {
    expect(documentError(file('text/plain'))).toBe('Justificatif : jpeg, png, webp ou pdf, 10 Mo maximum.');
    expect(documentError(file('application/pdf', TEN_MB + 1))).toBe('Justificatif : jpeg, png, webp ou pdf, 10 Mo maximum.');
  });
});
