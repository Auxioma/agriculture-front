import { describe, expect, it } from 'vitest';
import { clientDestination, destinationFor, iconOf, producerDestination, timeAgo } from './notification-format';

describe('timeAgo', () => {
  // dates locales (pas d'ISO fixe) : "hier" se compte dans le fuseau du navigateur, le test doit tenir dans n'importe lequel
  const at = (day: number, hour: number, minute = 0, month = 9, year = 2026) => new Date(year, month, day, hour, minute);
  const iso = (d: Date) => d.toISOString();
  const NOW = at(26, 14, 0).getTime();

  it("dit « à l'instant » sous la minute", () => {
    expect(timeAgo(iso(at(26, 14, 0)), NOW)).toBe("À l'instant");
  });

  it('compte en minutes sous l heure', () => {
    expect(timeAgo(iso(at(26, 13, 50)), NOW)).toBe('Il y a 10 min');
    expect(timeAgo(iso(at(26, 13, 1)), NOW)).toBe('Il y a 59 min');
  });

  it('compte en heures le meme jour', () => {
    expect(timeAgo(iso(at(26, 13, 0)), NOW)).toBe('Il y a 1 h');
    expect(timeAgo(iso(at(26, 11, 0)), NOW)).toBe('Il y a 3 h');
    expect(timeAgo(iso(at(26, 0, 5)), NOW)).toBe('Il y a 13 h');
  });

  it('dit « Hier » pour la veille, meme a moins de 24 h', () => {
    expect(timeAgo(iso(at(25, 23, 0)), NOW)).toBe('Hier');
    expect(timeAgo(iso(at(25, 9, 0)), NOW)).toBe('Hier');
  });

  it('compte en jours jusqu a une semaine', () => {
    expect(timeAgo(iso(at(24, 9, 0)), NOW)).toBe('Il y a 2 j');
    expect(timeAgo(iso(at(20, 9, 0)), NOW)).toBe('Il y a 6 j');
  });

  it('donne la date au dela, avec l annee seulement si ce n est pas la meme', () => {
    expect(timeAgo(iso(at(19, 9, 0)), NOW)).toBe('19 octobre');
    expect(timeAgo(iso(at(3, 9, 0, 2)), NOW)).toBe('3 mars');
    expect(timeAgo(iso(at(12, 9, 0, 11, 2025)), NOW)).toBe('12 décembre 2025');
  });

  it('ne casse pas sur une date illisible', () => {
    expect(timeAgo('pas une date', NOW)).toBe('');
  });

  it('reste sur « à l instant » pour une date legerement dans le futur (horloges decalees)', () => {
    expect(timeAgo(iso(at(26, 14, 3)), NOW)).toBe("À l'instant");
  });
});

describe('producerDestination', () => {
  it('mene chaque notification du producteur a la section de son espace qui la concerne', () => {
    expect(producerDestination('new_message')).toBe('/producer/messages');
    expect(producerDestination('new_relevant_request')).toBe('/producer/requests');
    expect(producerDestination('request_expiring_soon')).toBe('/producer/requests');
    expect(producerDestination('new_review')).toBe('/producer/profile/reviews');
    expect(producerDestination('payment_failed')).toBe('/producer/subscription');
    expect(producerDestination('subscription_renewing_soon')).toBe('/producer/subscription');
    expect(producerDestination('profile_validated')).toBe('/producer/profile');
    expect(producerDestination('profile_rejected')).toBe('/producer/profile');
    expect(producerDestination('support_reply')).toBe('/producer/support');
    expect(producerDestination('profile_more_info_needed')).toBe('/producer/profile');
    expect(producerDestination('subscription_duplicate_cancelled')).toBe('/producer/subscription');
    expect(producerDestination('client_replied')).toBe('/producer/requests/quotes');
  });

  it('ne mene nulle part pour un type du client, un type inconnu ou sans type', () => {
    expect(producerDestination('quote_received')).toBeNull();
    expect(producerDestination('producer_replied')).toBeNull();
    expect(producerDestination('request_sent')).toBeNull();
    expect(producerDestination('un_type_futur')).toBeNull();
    expect(producerDestination(null)).toBeNull();
  });
});

describe('clientDestination', () => {
  it('mène une réponse, un devis ou une demande qui expire à la demande concernée quand le back en donne l’identifiant', () => {
    expect(clientDestination('producer_replied', { requestId: 'r-1' })).toBe('/client/requests/r-1');
    expect(clientDestination('quote_received', { requestId: 'r-2', conversationId: 'c-2' })).toBe('/client/requests/r-2');
    expect(clientDestination('request_expiring_soon', { requestId: 'r-3' })).toBe('/client/requests/r-3');
  });

  it('mène un avis à laisser à la demande, où se trouve le formulaire d’avis', () => {
    expect(clientDestination('review_reminder', { requestId: 'r-4', conversationId: 'c-4' })).toBe('/client/requests/r-4');
    expect(clientDestination('review_reminder', null)).toBe('/client/requests');
  });

  it('mène un producteur favori qui propose du nouveau à sa fiche, sinon à la liste des producteurs', () => {
    expect(clientDestination('favorite_producer_available', { producerSlug: 'ferme-du-soleil', producerId: 'p-1' })).toBe('/producers/ferme-du-soleil');
    expect(clientDestination('favorite_producer_available', null)).toBe('/producers');
    expect(clientDestination('favorite_producer_available', [])).toBe('/producers');
  });

  it('mène un nouveau message à sa conversation, sinon à la messagerie', () => {
    expect(clientDestination('new_message', { conversationId: 'c-9' })).toBe('/client/messages/c-9');
    expect(clientDestination('new_message', null)).toBe('/client/messages');
  });

  it('se rabat sur la liste des demandes sans identifiant, ou quand data est vide (le back renvoie [])', () => {
    expect(clientDestination('producer_replied', null)).toBe('/client/requests');
    expect(clientDestination('quote_received', [])).toBe('/client/requests');
    expect(clientDestination('request_expiring_soon', {})).toBe('/client/requests');
    expect(clientDestination('request_sent', { requestId: 'r-1' })).toBe('/client/requests');
  });

  it('ne mène nulle part pour un type du producteur, un type inconnu ou sans type', () => {
    expect(clientDestination('new_relevant_request', { requestId: 'r-1' })).toBeNull();
    expect(clientDestination('un_type_futur', null)).toBeNull();
    expect(clientDestination(null, null)).toBeNull();
  });
});

describe('destinationFor', () => {
  it('suit le rôle : producteur, équipe du producteur, client', () => {
    expect(destinationFor(['ROLE_PRODUCER'], 'new_message', null)).toBe('/producer/messages');
    expect(destinationFor(['ROLE_PRODUCER_TEAM'], 'new_message', null)).toBe('/producer/messages');
    expect(destinationFor(['ROLE_CLIENT'], 'new_message', { conversationId: 'c-1' })).toBe('/client/messages/c-1');
  });

  it('ne mène nulle part sans rôle connu : visiteur, administrateur', () => {
    expect(destinationFor(null, 'new_message', null)).toBeNull();
    expect(destinationFor(undefined, 'new_message', null)).toBeNull();
    expect(destinationFor(['ROLE_ADMIN'], 'new_message', null)).toBeNull();
  });
});

describe('iconOf', () => {
  const bell = iconOf(null);

  it('donne une icone propre a chaque famille de notification', () => {
    const icons = new Set(['producer_replied', 'new_message', 'request_expiring_soon', 'profile_validated', 'payment_failed'].map(iconOf));
    expect(icons.size).toBe(5);
    expect(icons.has(bell)).toBe(false);
  });

  it('regroupe les types voisins', () => {
    expect(iconOf('quote_received')).toBe(iconOf('producer_replied'));
    expect(iconOf('support_reply')).toBe(iconOf('new_message'));
    expect(iconOf('subscription_renewing_soon')).toBe(iconOf('request_expiring_soon'));
    expect(iconOf('request_sent')).toBe(iconOf('profile_validated'));
    expect(iconOf('profile_rejected')).toBe(iconOf('payment_failed'));
  });

  it('donne un cœur à un producteur favori qui propose du nouveau et une étoile à un avis à laisser', () => {
    const heart = iconOf('favorite_producer_available');
    const star = iconOf('review_reminder');

    expect(heart).not.toBe(bell);
    expect(star).not.toBe(bell);
    expect(heart).not.toBe(star);
  });

  it('prend la cloche pour un type inconnu ou absent', () => {
    expect(iconOf('type_de_demain')).toBe(bell);
    expect(iconOf(null)).toBe(bell);
    expect(iconOf('new_relevant_request')).toBe(bell);
  });
});
