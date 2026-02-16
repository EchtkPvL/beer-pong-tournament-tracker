import type { Round } from '@/lib/db/schema';

/**
 * Translate a round name based on phase and position.
 * @param round - The round to translate
 * @param allRounds - All rounds for the event (needed to determine context)
 * @param t - Translation function for the 'rounds' namespace
 */
export function translateRoundName(
  round: Round,
  allRounds: Round[],
  t: (key: string, params?: Record<string, string | number | Date>) => string
): string {
  const phaseRounds = allRounds
    .filter(r => r.phase === round.phase)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const indexInPhase = phaseRounds.findIndex(r => r.id === round.id);
  if (indexInPhase < 0) return round.name;

  switch (round.phase) {
    case 'finals':
      return indexInPhase === 0 ? t('grandFinals') : t('resetMatch');
    case 'losers':
      return t('losersRound', { n: indexInPhase + 1 });
    case 'winners': {
      const isDoubleElim = allRounds.some(r => r.phase === 'losers');
      if (isDoubleElim) {
        return t('winnersRound', { n: indexInPhase + 1 });
      }
      // Single elimination: name by distance from final
      const distFromEnd = phaseRounds.length - indexInPhase;
      if (distFromEnd === 1) return t('finals');
      if (distFromEnd === 2) return t('semiFinals');
      if (distFromEnd === 3) return t('quarterFinals');
      if (distFromEnd === 4) return t('roundOf16');
      return t('roundN', { n: indexInPhase + 1 });
    }
    case 'group':
      return t('roundN', { n: indexInPhase + 1 });
    default:
      return round.name;
  }
}
