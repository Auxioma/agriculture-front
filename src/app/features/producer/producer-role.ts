// un producteur, ou un membre de son equipe : meme regle pour la navbar, la garde de /producer et la
// redirection apres connexion
export const hasProducerRole = (roles: string[]): boolean =>
  roles.includes('ROLE_PRODUCER') || roles.includes('ROLE_PRODUCER_TEAM');
