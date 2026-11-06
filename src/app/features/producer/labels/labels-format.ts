import { longDate } from '../request-format';
import { ClaimedLabel } from './labels.service';

// les justificatifs acceptes par le back (verification_documents) : images ou pdf, 10 Mo
export const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

//! l'etat d'un label cote serveur (pas le choix en cours) :
//  verified = approuve par l'equipe, expired = approuve mais la validite est passee, pending = justificatif recu et pas encore examine,
//  rejected = justificatif refuse, declared = declare sans justificatif, none = pas declare
export type LabelKind = 'verified' | 'expired' | 'pending' | 'rejected' | 'declared' | 'none';

export function labelKind(claimed: ClaimedLabel | undefined, now: Date = new Date()): LabelKind {
  if (!claimed) return 'none';
  if (claimed.verifiedAt !== null) {
    return claimed.expiresAt !== null && new Date(claimed.expiresAt) <= now ? 'expired' : 'verified';
  }
  if (claimed.documentStatus === 'pending') return 'pending';
  if (claimed.documentStatus === 'rejected') return 'rejected';

  return 'declared';
}

// la pastille de chaque etat : son texte et ses couleurs
export const BADGES: Record<LabelKind, { text: string; style: string }> = {
  verified: { text: 'Vérifié', style: 'bg-badge-bg text-agri' },
  expired: { text: 'Expiré', style: 'bg-amber-100 text-amber-800' },
  pending: { text: 'En attente', style: 'bg-amber-100 text-amber-800' },
  rejected: { text: 'Refusé', style: 'bg-red-100 text-red-800' },
  declared: { text: 'Déclaré', style: 'bg-grey-200 text-grey-700' },
  none: { text: 'Non déclaré', style: 'bg-grey-200 text-grey-700' },
};

// la ligne sous la pastille
export function labelDetail(kind: LabelKind, claimed: ClaimedLabel | undefined): string {
  switch (kind) {
    case 'verified':
      return claimed?.verifiedAt ? `Vérifié le ${longDate(claimed.verifiedAt)}` : '';
    case 'expired':
      return claimed?.expiresAt ? `Vérification expirée le ${longDate(claimed.expiresAt)}` : 'Vérification expirée';
    case 'pending':
      return "Justificatif reçu, en cours d'examen";
    case 'rejected':
      return 'Justificatif refusé : ajoutez-en un autre';
    case 'declared':
      return 'Sans justificatif, ce label ne sera pas vérifié';
    default:
      return '';
  }
}

// on peut joindre un justificatif tant que l'equipe n'en examine pas un et que le label n'est pas deja verifie
export function canAddDocument(kind: LabelKind): boolean {
  return kind !== 'verified' && kind !== 'pending';
}

// null si le fichier peut partir
export function documentError(file: File): string | null {
  return DOCUMENT_TYPES.includes(file.type) && file.size <= DOCUMENT_MAX_BYTES ? null : 'Justificatif : jpeg, png, webp ou pdf, 10 Mo maximum.';
}
