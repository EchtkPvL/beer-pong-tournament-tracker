import type { Match, Round } from '@/lib/db/schema';

export interface PodiumEntry {
  teamId: string;
  place: 1 | 2 | 3;
}

/**
 * Determine 1st, 2nd, and 3rd place from completed bracket matches.
 * Works for single elimination, double elimination, and group+knockout.
 */
export function getPodium(matches: Match[], rounds: Round[]): PodiumEntry[] {
  if (matches.length === 0 || rounds.length === 0) return [];

  const roundById = new Map(rounds.map(r => [r.id, r]));

  // Check if this is a double elimination bracket
  const hasLosers = rounds.some(r => r.phase === 'losers');

  // Find the final match - the match with no nextMatchId (or pointing
  // outside the match set) that isn't a bye
  const matchIds = new Set(matches.map(m => m.id));
  const finalMatch = matches.find(m =>
    m.status === 'completed' &&
    !m.isBye &&
    (!m.nextMatchId || !matchIds.has(m.nextMatchId))
  );

  if (!finalMatch || !finalMatch.winnerId) return [];

  const podium: PodiumEntry[] = [];

  // 1st place: winner of final match
  podium.push({ teamId: finalMatch.winnerId, place: 1 });

  // 2nd place: loser of final match
  const secondPlace = finalMatch.team1Id === finalMatch.winnerId
    ? finalMatch.team2Id
    : finalMatch.team1Id;
  if (secondPlace) {
    podium.push({ teamId: secondPlace, place: 2 });
  }

  // 3rd place: depends on format
  if (hasLosers) {
    // Double elimination: loser of losers bracket final (the match
    // feeding into grand finals from the losers side)
    const losersMatches = matches.filter(m => {
      const round = roundById.get(m.roundId);
      return round?.phase === 'losers';
    });
    // The losers bracket final is the losers match whose nextMatchId
    // points to the grand finals match
    const losersFinal = losersMatches.find(m =>
      m.nextMatchId === finalMatch.id && m.status === 'completed'
    );
    if (losersFinal) {
      const thirdPlace = losersFinal.team1Id === losersFinal.winnerId
        ? losersFinal.team2Id
        : losersFinal.team1Id;
      if (thirdPlace) {
        podium.push({ teamId: thirdPlace, place: 3 });
      }
    }
  } else {
    // Single elimination: losers of semi-finals
    const semiFinals = matches.filter(m =>
      m.nextMatchId === finalMatch.id &&
      m.status === 'completed' &&
      !m.isBye
    );
    for (const semi of semiFinals) {
      const loser = semi.team1Id === semi.winnerId
        ? semi.team2Id
        : semi.team1Id;
      if (loser) {
        podium.push({ teamId: loser, place: 3 });
      }
    }
  }

  return podium;
}
