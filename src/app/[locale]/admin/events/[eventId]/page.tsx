'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TeamManager } from '@/components/admin/team-manager';
import { BracketAdmin } from '@/components/admin/bracket-admin';
import { MatchResultForm } from '@/components/admin/match-result-form';
import { TimerControls } from '@/components/timer/timer-controls';
import { cn } from '@/lib/utils';
import type { Event, Team, Match, Round } from '@/lib/db/schema';

interface MatchWithTeamNames {
  id: string;
  matchNumber: number;
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
}

interface AdminEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default function AdminEventPage({ params }: AdminEventPageProps) {
  const { eventId } = use(params);
  const t = useTranslations('events');
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tMatches = useTranslations('matches');
  const tBracket = useTranslations('bracket');
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Match result dialog state
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeamNames | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  // Settings edit state
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMode, setEditMode] = useState<string>('single_elimination');
  const [editTableCount, setEditTableCount] = useState(1);
  const [editGroupCount, setEditGroupCount] = useState<number | null>(null);
  const [editTeamsAdvance, setEditTeamsAdvance] = useState<number | null>(null);
  const [editKnockoutMode, setEditKnockoutMode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return tBracket('tbd');
    return teamMap.get(teamId)?.name ?? tBracket('tbd');
  };

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, teamsRes, matchesRes, roundsRes] =
        await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/teams`),
          fetch(`/api/events/${eventId}/matches`),
          fetch(`/api/events/${eventId}/rounds`),
        ]);

      if (eventRes.ok) {
        const eventData: Event = await eventRes.json();
        setEvent(eventData);
        setEditName(eventData.name);
        setEditDate(eventData.date ?? '');
        setEditLocation(eventData.location ?? '');
        setEditMode(eventData.mode);
        setEditTableCount(eventData.tableCount);
        setEditGroupCount(eventData.groupCount);
        setEditTeamsAdvance(eventData.teamsAdvancePerGroup);
        setEditKnockoutMode(eventData.knockoutMode);
      }
      if (teamsRes.ok) {
        const teamsData: Team[] = await teamsRes.json();
        setTeams(teamsData);
      }
      if (matchesRes.ok) {
        const matchesData: Match[] = await matchesRes.json();
        setMatches(matchesData);
      }
      if (roundsRes.ok) {
        const roundsData: Round[] = await roundsRes.json();
        setRounds(roundsData);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActivate = async () => {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleComplete = async () => {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.push('/admin');
    }
  };

  const handleMatchResult = async (
    matchId: string,
    team1Score: number,
    team2Score: number
  ) => {
    const res = await fetch(`/api/events/${eventId}/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team1Score,
        team2Score,
        status: 'completed',
      }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editName || undefined,
        date: editDate || undefined,
        location: editLocation || undefined,
        mode: editMode,
        tableCount: editTableCount,
      };
      if (editMode === 'group') {
        payload.groupCount = editGroupCount;
        payload.teamsAdvancePerGroup = editTeamsAdvance;
        payload.knockoutMode = editKnockoutMode;
      }
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft':
        return t('draft');
      case 'active':
        return t('active');
      case 'completed':
        return t('completed');
      default:
        return status;
    }
  };

  const getModeLabel = (mode: string): string => {
    switch (mode) {
      case 'single_elimination':
        return t('singleElimination');
      case 'double_elimination':
        return t('doubleElimination');
      case 'group':
        return t('group');
      default:
        return mode;
    }
  };

  const getMatchStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return tMatches('pending');
      case 'scheduled':
        return tMatches('scheduled');
      case 'in_progress':
        return tMatches('inProgress');
      case 'completed':
        return tBracket('score');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-16">
        <p className="text-muted-foreground">{tCommon('error')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin">{tCommon('back')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.name || t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {tAdmin('eventManagement')}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">{tCommon('back')}</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="overview">{tAdmin('overview')}</TabsTrigger>
          <TabsTrigger value="teams">{tAdmin('teamsTab')}</TabsTrigger>
          <TabsTrigger value="bracket">{tAdmin('bracketTab')}</TabsTrigger>
          <TabsTrigger value="matches">{tAdmin('matchesTab')}</TabsTrigger>
          <TabsTrigger value="timer">{tAdmin('timerTab')}</TabsTrigger>
          <TabsTrigger value="settings">{tAdmin('settingsTab')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tAdmin('overview')}</CardTitle>
                <Badge variant={getStatusVariant(event.status)}>
                  {getStatusLabel(event.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t('name')}</p>
                  <p className="font-medium">{event.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('date')}</p>
                  <p className="font-medium">{event.date || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('location')}
                  </p>
                  <p className="font-medium">{event.location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('mode')}</p>
                  <p className="font-medium">{getModeLabel(event.mode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('tables')}
                  </p>
                  <p className="font-medium">{event.tableCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="font-medium">
                    {t('teamCount', { count: teams.length })}
                  </p>
                </div>
                {event.mode === 'group' && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('groupCount')}
                      </p>
                      <p className="font-medium">{event.groupCount ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('teamsAdvancePerGroup')}
                      </p>
                      <p className="font-medium">
                        {event.teamsAdvancePerGroup ?? '-'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3 border-t pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/events/${eventId}`}>
                    {t('viewEvent')}
                  </Link>
                </Button>

                {event.status === 'draft' && (
                  <Button onClick={handleActivate}>{t('activate')}</Button>
                )}

                {event.status === 'active' && (
                  <Button onClick={handleComplete} variant="secondary">
                    {t('complete')}
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">{tCommon('delete')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tCommon('delete')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteConfirm')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {tCommon('cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        {tCommon('confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <TeamManager eventId={eventId} initialTeams={teams} />
        </TabsContent>

        {/* Bracket Tab */}
        <TabsContent value="bracket">
          <BracketAdmin
            eventId={eventId}
            matches={matches}
            rounds={rounds}
            teams={teams}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{tAdmin('matchesTab')}</h3>

            {matches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tMatches('noMatches')}
              </p>
            ) : (
              <div className="space-y-2">
                {matches
                  .sort((a, b) => a.matchNumber - b.matchNumber)
                  .map((match) => {
                    const team1Name = getTeamName(match.team1Id);
                    const team2Name = getTeamName(match.team2Id);
                    const round = rounds.find((r) => r.id === match.roundId);

                    return (
                      <button
                        key={match.id}
                        onClick={() => {
                          if (
                            match.team1Id &&
                            match.team2Id &&
                            !match.isBye
                          ) {
                            setSelectedMatch({
                              id: match.id,
                              matchNumber: match.matchNumber,
                              team1Name,
                              team2Name,
                              team1Score: match.team1Score,
                              team2Score: match.team2Score,
                            });
                            setResultDialogOpen(true);
                          }
                        }}
                        disabled={
                          !match.team1Id || !match.team2Id || match.isBye
                        }
                        className={cn(
                          'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors',
                          match.team1Id &&
                            match.team2Id &&
                            !match.isBye &&
                            'hover:bg-accent cursor-pointer',
                          (!match.team1Id ||
                            !match.team2Id ||
                            match.isBye) &&
                            'cursor-default opacity-60'
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {tBracket('matchNumber', {
                                number: match.matchNumber,
                              })}
                            </span>
                            {round && (
                              <Badge variant="outline" className="text-xs">
                                {round.name}
                              </Badge>
                            )}
                          </div>
                          <span className="font-medium">
                            {match.isBye
                              ? `${team1Name} (${tBracket('bye')})`
                              : `${team1Name} ${tMatches('vs')} ${team2Name}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {match.tableNumber && (
                            <Badge variant="outline">
                              {tBracket('table', {
                                number: match.tableNumber,
                              })}
                            </Badge>
                          )}
                          {match.status === 'completed' &&
                            match.team1Score !== null &&
                            match.team2Score !== null && (
                              <Badge variant="secondary">
                                {match.team1Score} : {match.team2Score}
                              </Badge>
                            )}
                          <Badge
                            variant={
                              match.status === 'completed'
                                ? 'default'
                                : match.status === 'in_progress'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {getMatchStatusLabel(match.status)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}

            {selectedMatch && (
              <MatchResultForm
                match={selectedMatch}
                open={resultDialogOpen}
                onOpenChange={(open) => {
                  setResultDialogOpen(open);
                  if (!open) setSelectedMatch(null);
                }}
                onResult={handleMatchResult}
              />
            )}
          </div>
        </TabsContent>

        {/* Timer Tab */}
        <TabsContent value="timer">
          <Card>
            <CardHeader>
              <CardTitle>{tAdmin('timerTab')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TimerControls eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{tAdmin('settingsTab')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('name')}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date">{t('date')}</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">{t('location')}</Label>
                <Input
                  id="edit-location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mode">{t('mode')}</Label>
                <Select
                  value={editMode}
                  onValueChange={(v) => setEditMode(v)}
                >
                  <SelectTrigger id="edit-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">
                      {t('singleElimination')}
                    </SelectItem>
                    <SelectItem value="double_elimination">
                      {t('doubleElimination')}
                    </SelectItem>
                    <SelectItem value="group">{t('group')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tables">{t('tables')}</Label>
                <Input
                  id="edit-tables"
                  type="number"
                  min={1}
                  max={20}
                  value={editTableCount}
                  onChange={(e) =>
                    setEditTableCount(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-24"
                />
              </div>

              {editMode === 'group' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-groups">{t('groupCount')}</Label>
                    <Input
                      id="edit-groups"
                      type="number"
                      min={2}
                      max={16}
                      value={editGroupCount ?? 2}
                      onChange={(e) =>
                        setEditGroupCount(parseInt(e.target.value, 10) || 2)
                      }
                      className="w-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-advance">
                      {t('teamsAdvancePerGroup')}
                    </Label>
                    <Input
                      id="edit-advance"
                      type="number"
                      min={1}
                      max={8}
                      value={editTeamsAdvance ?? 2}
                      onChange={(e) =>
                        setEditTeamsAdvance(parseInt(e.target.value, 10) || 1)
                      }
                      className="w-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-knockout">{t('knockoutMode')}</Label>
                    <Select
                      value={editKnockoutMode ?? 'single_elimination'}
                      onValueChange={(v) => setEditKnockoutMode(v)}
                    >
                      <SelectTrigger id="edit-knockout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">
                          {t('singleElimination')}
                        </SelectItem>
                        <SelectItem value="double_elimination">
                          {t('doubleElimination')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? tCommon('loading') : tCommon('save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
