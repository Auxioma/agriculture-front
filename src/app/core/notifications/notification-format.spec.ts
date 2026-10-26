import { describe, expect, it } from 'vitest';
import { iconOf, timeAgo } from './notification-format';

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

  it('prend la cloche pour un type inconnu ou absent', () => {
    expect(iconOf('type_de_demain')).toBe(bell);
    expect(iconOf(null)).toBe(bell);
    expect(iconOf('new_relevant_request')).toBe(bell);
  });
});
