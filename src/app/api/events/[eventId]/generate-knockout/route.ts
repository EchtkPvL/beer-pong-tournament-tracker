import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getEventById } from '@/lib/db/queries/events';
import { getTeamsByEvent } from '@/lib/db/queries/teams';
import { getMatchesByEvent, createMatch } from '@/lib/db/queries/matches';
import { getRoundsByEvent, createRound } from '@/lib/db/queries/rounds';
import { generateSingleEliminationBracket } from '@/lib/tournament/single-elimination';
import { generateDoubleEliminationBracket } from '@/lib/tournament/double-elimination';
import { processByes } from '@/lib/tournament/match-progression';
import { logEvent } from '@/lib/realtime/event-log';
import type { TeamSeed, GroupStanding } from '@/lib/tournament/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.mode !== 'group') {
      return NextResponse.json({ error: 'Event is not in group mode' }, { status: 400 });
    }

    // Check if knockout rounds already exist
    const existingRounds = await getRoundsByEvent(eventId);
    const hasKnockout = existingRounds.some(r => r.phase !== 'group');
    if (hasKnockout) {
      return NextResponse.json({ error: 'Knockout rounds already exist' }, { status: 400 });
    }

    // Check all group matches are completed
    const allMatches = await getMatchesByEvent(eventId);
    const groupMatches = allMatches.filter(m => m.groupId);
    const nonByeGroupMatches = groupMatches.filter(m => !m.isBye);
    const allGroupsDone = nonByeGroupMatches.every(m => m.status === 'completed');
    if (!allGroupsDone) {
      return NextResponse.json({ error: 'Not all group matches are completed' }, { status: 400 });
    }

    // Calculate standings per group
    const teams = await getTeamsByEvent(eventId);
    const teamsAdvance = event.teamsAdvancePerGroup ?? 2;

    // Discover groups
    const groupMap = new Map<string, string[]>();
    for (const team of teams) {
      if (team.groupId) {
        if (!groupMap.has(team.groupId)) groupMap.set(team.groupId, []);
        groupMap.get(team.groupId)!.push(team.id);
      }
    }

    const advancingTeams: TeamSeed[] = [];
    const groupIds = Array.from(groupMap.keys()).sort();

    for (const groupId of groupIds) {
      const groupTeamIds = groupMap.get(groupId)!;
      const teamMap = new Map(teams.map(t => [t.id, t]));

      // Calculate standings
      const standingsMap = new Map<string, GroupStanding>();
      for (const teamId of groupTeamIds) {
        const team = teamMap.get(teamId)!;
        standingsMap.set(teamId, {
          teamId,
          teamName: team.name,
          played: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDiff: 0,
          points: 0,
        });
      }

      const gMatches = groupMatches.filter(m => m.groupId === groupId && m.status === 'completed' && !m.isBye);
      for (const match of gMatches) {
        if (!match.team1Id || !match.team2Id) continue;
        const s1 = match.team1Score ?? 0;
        const s2 = match.team2Score ?? 0;

        const t1 = standingsMap.get(match.team1Id);
        const t2 = standingsMap.get(match.team2Id);

        if (t1) {
          t1.played++;
          t1.pointsFor += s1;
          t1.pointsAgainst += s2;
          if (match.winnerId === match.team1Id) t1.wins++;
          else t1.losses++;
        }
        if (t2) {
          t2.played++;
          t2.pointsFor += s2;
          t2.pointsAgainst += s1;
          if (match.winnerId === match.team2Id) t2.wins++;
          else t2.losses++;
        }
      }

      const standings = Array.from(standingsMap.values()).map(s => ({
        ...s,
        pointDiff: s.pointsFor - s.pointsAgainst,
        points: s.wins * 2 + s.losses,
      }));

      standings.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        return b.pointsFor - a.pointsFor;
      });

      // Take top N teams from this group
      const top = standings.slice(0, teamsAdvance);
      for (const s of top) {
        advancingTeams.push({
          id: s.teamId,
          seed: advancingTeams.length + 1,
          name: s.teamName,
        });
      }
    }

    if (advancingTeams.length < 2) {
      return NextResponse.json({ error: 'Not enough advancing teams' }, { status: 400 });
    }

    // Seed knockout: interleave group winners for balanced matchups
    // e.g. with 2 groups advancing 2 each: A1, B1, B2, A2
    // This avoids same-group teams meeting in early rounds
    const teamsPerGroup = teamsAdvance;
    const numGroups = groupIds.length;
    const seededTeams: TeamSeed[] = [];
    for (let rank = 0; rank < teamsPerGroup; rank++) {
      const groupOrder = rank % 2 === 0
        ? Array.from({ length: numGroups }, (_, i) => i)
        : Array.from({ length: numGroups }, (_, i) => numGroups - 1 - i);
      for (const g of groupOrder) {
        const idx = g * teamsPerGroup + rank;
        if (idx < advancingTeams.length) {
          seededTeams.push({
            ...advancingTeams[idx],
            seed: seededTeams.length + 1,
          });
        }
      }
    }

    // Generate knockout bracket
    const knockoutMode = event.knockoutMode ?? 'single_elimination';
    let bracket;
    if (knockoutMode === 'double_elimination') {
      bracket = generateDoubleEliminationBracket(eventId, seededTeams);
    } else {
      bracket = generateSingleEliminationBracket(eventId, seededTeams);
    }

    // Determine max round number from existing group rounds
    const maxGroupRound = existingRounds.reduce((max, r) => Math.max(max, r.roundNumber), 0);

    // Determine max match number from existing group matches
    const maxMatchNum = allMatches.reduce((max, m) => Math.max(max, m.matchNumber), 0);

    // Determine max scheduled round from existing matches
    const maxScheduledRound = allMatches.reduce((max, m) => Math.max(max, m.scheduledRound ?? 0), 0);

    // Offset round numbers
    for (const round of bracket.rounds) {
      round.roundNumber += maxGroupRound;
    }

    // Schedule knockout matches (assign matchNumber and scheduledRound)
    const tc = Math.max(1, event.tableCount);
    const sortedKnockoutRounds = [...bracket.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    let globalMatchNum = maxMatchNum + 1;
    let playingRound = maxScheduledRound + 1;

    for (const round of sortedKnockoutRounds) {
      const roundMatches = bracket.matches.filter(m => m.roundId === round.id && !m.isBye);
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
      if (slotsUsed > 0) {
        playingRound++;
      }
    }

    // Byes
    for (const match of bracket.matches) {
      if (match.isBye) {
        match.matchNumber = 0;
        match.scheduledRound = 0;
      }
    }

    // Insert knockout rounds
    for (const round of bracket.rounds) {
      await createRound({
        id: round.id,
        eventId,
        roundNumber: round.roundNumber,
        phase: round.phase,
        name: round.name,
        status: 'pending',
      });
    }

    // Insert knockout matches
    for (const match of bracket.matches) {
      await createMatch({
        id: match.id,
        eventId,
        roundId: match.roundId,
        matchNumber: match.matchNumber,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        isBye: match.isBye,
        status: 'pending',
        scheduledRound: match.scheduledRound,
        bracketPosition: match.bracketPosition,
        nextMatchId: match.nextMatchId,
        loserNextMatchId: match.loserNextMatchId,
        groupId: match.groupId,
      });
    }

    // Process byes in knockout
    await processByes(eventId);

    await logEvent(eventId, 'knockout_generated', {
      knockoutMode,
      advancingTeams: advancingTeams.length,
    });

    return NextResponse.json({
      ok: true,
      rounds: bracket.rounds.length,
      matches: bracket.matches.length,
      advancingTeams: advancingTeams.length,
    });
  } catch (error) {
    console.error('Knockout generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
