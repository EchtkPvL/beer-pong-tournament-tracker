'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { TimerDisplay } from '@/components/timer/timer-display';
import { BracketView } from '@/components/bracket/bracket-view';
import { Badge } from '@/components/ui/badge';
import type { Event, Team, Match, Round } from '@/lib/db/schema';

function getTeamName(teams: Team[], teamId: string | null): string {
  if (!teamId) return 'TBD';
  const team = teams.find((t) => t.id === teamId);
  return team?.name ?? 'TBD';
}

function isTeamDQ(teams: Team[], teamId: string | null): boolean {
  if (!teamId) return false;
  const team = teams.find((t) => t.id === teamId);
  return team?.status === 'disqualified';
}

const CYCLE_MS = Number(process.env.NEXT_PUBLIC_BEAMER_CYCLE_MS) || 10000;

function BeamerContent({ eventId }: { eventId: string }) {
  const t = useTranslations('beamer');
  const tMatches = useTranslations('matches');
  const tBracket = useTranslations('bracket');
  const tCommon = useTranslations('common');

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerExpired, setTimerExpired] = useState(false);
  const [eventUrl, setEventUrl] = useState('');
  const expiredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTimerExpired = useCallback(() => {
    setTimerExpired(true);
    if (expiredTimeoutRef.current) clearTimeout(expiredTimeoutRef.current);
    expiredTimeoutRef.current = setTimeout(() => setTimerExpired(false), 30000);
  }, []);

  // Derive public event URL from current beamer URL
  useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/beamer$/, '');
    setEventUrl(url.toString());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (expiredTimeoutRef.current) clearTimeout(expiredTimeoutRef.current);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, teamsRes, matchesRes, roundsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/teams`),
        fetch(`/api/events/${eventId}/matches`),
        fetch(`/api/events/${eventId}/rounds`),
      ]);

      if (eventRes.ok) setEvent(await eventRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (matchesRes.ok) setMatches(await matchesRes.json());
      if (roundsRes.ok) setRounds(await roundsRes.json());
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRealtimeEvent = useCallback(() => {
    fetchData();
    setTimerExpired(false);
    if (expiredTimeoutRef.current) {
      clearTimeout(expiredTimeoutRef.current);
      expiredTimeoutRef.current = null;
    }
  }, [fetchData]);

  const isDoubleElim = event?.mode === 'double_elimination';

  // Determine which phases exist for double elimination cycling
  const phases = useMemo(() => {
    if (!isDoubleElim) return [] as ('winners' | 'losers' | 'finals')[];
    const phaseSet = new Set<string>();
    for (const r of rounds) {
      if (r.phase) phaseSet.add(r.phase);
    }
    const order: ('winners' | 'losers' | 'finals')[] = ['winners', 'losers', 'finals'];
    return order.filter((p) => phaseSet.has(p));
  }, [isDoubleElim, rounds]);

  const phaseLabels: Record<string, string> = useMemo(() => ({
    winners: tBracket('winnersBracket'),
    losers: tBracket('losersBracket'),
    finals: tBracket('grandFinals'),
  }), [tBracket]);

  // Auto-cycling state
  const [currentPage, setCurrentPage] = useState(0);

  // Reset page when phases change
  useEffect(() => {
    setCurrentPage(0);
  }, [phases.length]);

  // Auto-advance for double elimination
  const [cycleKey, setCycleKey] = useState(0);
  useEffect(() => {
    if (phases.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % phases.length);
      setCycleKey((k) => k + 1);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [phases.length]);

  const currentPhase = phases.length > 0 ? phases[currentPage % phases.length] : undefined;

  // Scale-to-fit refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const sw = content.scrollWidth;
      const sh = content.scrollHeight;
      if (sw > 0 && sh > 0) {
        const s = Math.min(cw / sw, ch / sh);
        setScale(s);
        setOffset({
          x: Math.max(0, (cw - sw * s) / 2),
          y: Math.max(0, (ch - sh * s) / 2),
        });
      }
    };

    // Measure after render
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [currentPage, matches, rounds]);

  // Playable matches: non-bye, both teams assigned, with a scheduled round
  const playable = matches.filter(
    (m) => !m.isBye && m.team1Id && m.team2Id && m.scheduledRound != null && m.scheduledRound > 0
  );

  // Current round = lowest scheduledRound with at least one non-completed match
  const incompleteRounds = playable
    .filter((m) => m.status !== 'completed')
    .map((m) => m.scheduledRound!);
  const currentPlayingRound = incompleteRounds.length > 0 ? Math.min(...incompleteRounds) : null;

  // Current matches: all non-completed matches from the current round
  const inProgress = currentPlayingRound != null
    ? playable
        .filter((m) => m.scheduledRound === currentPlayingRound && m.status !== 'completed')
        .sort((a, b) => a.matchNumber - b.matchNumber)
    : [];

  // Upcoming: non-completed matches from rounds after current
  const upcoming = playable
    .filter(
      (m) =>
        m.status !== 'completed' &&
        (currentPlayingRound == null || m.scheduledRound! > currentPlayingRound)
    )
    .sort((a, b) => (a.scheduledRound ?? 0) - (b.scheduledRound ?? 0) || a.matchNumber - b.matchNumber);

  // Group upcoming matches by scheduledRound
  const upcomingByRound: [number, Match[]][] = [];
  for (const m of upcoming) {
    const round = m.scheduledRound ?? 0;
    const last = upcomingByRound[upcomingByRound.length - 1];
    if (last && last[0] === round) {
      last[1].push(m);
    } else {
      upcomingByRound.push([round, [m]]);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-2xl">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <RealtimeProvider eventId={eventId} onEvent={handleRealtimeEvent}>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
        {/* Main content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left 70%: Bracket area */}
          <div className="flex w-[70%] flex-col border-r border-gray-800">
            {/* Phase label */}
            {isDoubleElim && currentPhase && (
              <div className="shrink-0 border-b border-gray-800 px-4 py-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  {phaseLabels[currentPhase]}
                </h3>
              </div>
            )}

            {/* Scaled bracket content */}
            <div ref={containerRef} className="relative flex-1 overflow-hidden">
              {rounds.length > 0 && matches.length > 0 ? (
                <div
                  ref={contentRef}
                  className="inline-block p-4"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <BracketView
                    matches={matches}
                    rounds={rounds}
                    teams={teams}
                    mode={(event?.mode as 'single_elimination' | 'double_elimination' | 'group') ?? 'single_elimination'}
                    isAdmin={false}
                    visiblePhase={currentPhase}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500">{tBracket('noMatches')}</p>
                </div>
              )}
            </div>

            {/* Page indicator dots */}
            {phases.length > 1 && (
              <div className="flex shrink-0 items-center justify-center gap-2 border-t border-gray-800 py-2">
                {phases.map((phase, i) => (
                  <button
                    key={phase}
                    onClick={() => { setCurrentPage(i); setCycleKey((k) => k + 1); }}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      i === currentPage % phases.length
                        ? 'bg-primary'
                        : 'bg-gray-600'
                    }`}
                    aria-label={phaseLabels[phase]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right 30%: Timer, current & next matches */}
          <div className="flex w-[30%] flex-col gap-6 overflow-y-auto p-6">
            {/* Timer + QR Code */}
            <div className="flex items-center justify-center gap-6">
              <TimerDisplay eventId={eventId} large onExpired={handleTimerExpired} />
              {eventUrl && (
                <div className="shrink-0">
                  <QRCodeSVG
                    value={eventUrl}
                    size={100}
                    bgColor="transparent"
                    fgColor="#f97316"
                    level="M"
                  />
                </div>
              )}
            </div>

            {/* Current Playing Round */}
            {currentPlayingRound != null && currentPlayingRound > 0 && (
              <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-center">
                <span className="text-2xl font-bold text-primary">
                  {tBracket('currentRound', { number: currentPlayingRound })}
                </span>
              </div>
            )}

            {/* Current Matches */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-300">
                {t('currentMatches')}
              </h2>
              {inProgress.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('noCurrentMatches')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {inProgress.map((match) => (
                    <li
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium${isTeamDQ(teams, match.team1Id) ? ' line-through opacity-60' : ''}`}>
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-gray-500">{tMatches('vs')}</span>
                        <span className={`font-medium${isTeamDQ(teams, match.team2Id) ? ' line-through opacity-60' : ''}`}>
                          {getTeamName(teams, match.team2Id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.team1Score !== null &&
                          match.team2Score !== null && (
                            <span className="font-mono text-sm tabular-nums">
                              {match.team1Score}:{match.team2Score}
                            </span>
                          )}
                        {match.tableNumber !== null && (
                          <Badge
                            variant="outline"
                            className="border-gray-600 text-gray-300"
                          >
                            {tBracket('table', {
                              number: match.tableNumber,
                            })}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Next Matches (grouped by round) */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-300">
                {t('nextMatches')}
              </h2>
              {upcomingByRound.length === 0 ? (
                <p className="text-sm text-gray-500">{tMatches('noMatches')}</p>
              ) : (
                <div className="space-y-4">
                  {upcomingByRound.slice(0, 3).map(([round, roundMatches]) => (
                    <div key={round}>
                      {round > 0 && (
                        <h3 className="mb-2 text-sm font-medium text-primary">
                          {tBracket('playingRound', { number: round })}
                          <span className="ml-2 text-xs text-gray-500">
                            {tMatches('concurrent', { count: roundMatches.length })}
                          </span>
                        </h3>
                      )}
                      <ul className="space-y-2">
                        {roundMatches.map((match) => (
                          <li
                            key={match.id}
                            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-3"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className={isTeamDQ(teams, match.team1Id) ? 'line-through opacity-60' : ''}>{getTeamName(teams, match.team1Id)}</span>
                              <span className="text-gray-500">{tMatches('vs')}</span>
                              <span className={isTeamDQ(teams, match.team2Id) ? 'line-through opacity-60' : ''}>{getTeamName(teams, match.team2Id)}</span>
                            </div>
                            {match.tableNumber !== null && (
                              <Badge
                                variant="outline"
                                className="border-gray-700 text-gray-400"
                              >
                                {tBracket('table', { number: match.tableNumber })}
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timer expired overlay */}
        {timerExpired && (
          <div
            className="pointer-events-none fixed inset-0 z-50 animate-expired-flash rounded-none border-[6px] border-red-600"
            onAnimationIteration={() => {
              // Keep flashing indefinitely until admin resets
            }}
          />
        )}

        {/* Cycle progress bar */}
        {phases.length > 1 && (
          <div className="h-1 shrink-0 bg-gray-800">
            <div
              key={cycleKey}
              className="h-full bg-primary/50"
              style={{
                animation: `beamer-progress ${CYCLE_MS}ms linear`,
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes beamer-progress {
            from { width: 0%; }
            to { width: 100%; }
          }
          @keyframes expired-flash {
            0%, 100% { opacity: 1; background-color: rgba(220, 38, 38, 0.25); }
            50% { opacity: 0.3; background-color: rgba(220, 38, 38, 0); }
          }
          .animate-expired-flash {
            animation: expired-flash 1s ease-in-out infinite;
          }
        `}</style>
      </div>
    </RealtimeProvider>
  );
}

export default function BeamerPage() {
  const params = useParams<{ eventId: string }>();

  return <BeamerContent eventId={params.eventId} />;
}
