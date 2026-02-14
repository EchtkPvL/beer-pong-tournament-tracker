import type { GeneratedBracket } from './types';

/**
 * Assigns global sequential matchNumbers and scheduledRound (playing round)
 * to all matches in a bracket based on:
 * - Bracket round order (each bracket round must complete before the next)
 * - Table count (how many matches can run simultaneously)
 * - Byes are excluded from scheduling (they resolve instantly)
 */
export function assignSchedule(bracket: GeneratedBracket, tableCount: number): void {
  const tc = Math.max(1, tableCount);

  // Sort rounds by roundNumber
  const sortedRounds = [...bracket.rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  let globalMatchNum = 1;
  let playingRound = 1;

  for (const round of sortedRounds) {
    // Get non-bye matches for this round, in their original order
    const roundMatches = bracket.matches
      .filter((m) => m.roundId === round.id && !m.isBye);

    let slotsUsed = 0;

    for (const match of roundMatches) {
      match.matchNumber = globalMatchNum++;
      match.scheduledRound = playingRound;
      slotsUsed++;

      if (slotsUsed >= tc) {
        slotsUsed = 0;
        playingRound++;
      }
    }

    // Bracket round boundary → start a new playing round
    if (slotsUsed > 0) {
      playingRound++;
    }
  }

  // Byes get scheduledRound 0 and matchNumber 0 (they don't appear in the schedule)
  for (const match of bracket.matches) {
    if (match.isBye) {
      match.matchNumber = 0;
      match.scheduledRound = 0;
    }
  }
}
