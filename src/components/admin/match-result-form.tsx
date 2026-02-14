'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MatchData {
  id: string;
  matchNumber: number;
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
}

interface MatchResultFormProps {
  match: MatchData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (matchId: string, team1Score: number, team2Score: number) => Promise<void> | void;
}

export function MatchResultForm({
  match,
  open,
  onOpenChange,
  onResult,
}: MatchResultFormProps) {
  const t = useTranslations('bracket');
  const tCommon = useTranslations('common');
  const tMatches = useTranslations('matches');

  const [team1Score, setTeam1Score] = useState<string>(
    match.team1Score?.toString() ?? ''
  );
  const [team2Score, setTeam2Score] = useState<string>(
    match.team2Score?.toString() ?? ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const score1 = parseInt(team1Score, 10);
    const score2 = parseInt(team2Score, 10);

    if (isNaN(score1) || isNaN(score2)) {
      setError('Bitte beide Ergebnisse eingeben');
      return;
    }

    if (score1 === score2) {
      setError('Die Ergebnisse dürfen nicht gleich sein');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResult(match.id, score1, score2);
      onOpenChange(false);
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('setResult')} - {t('matchNumber', { number: match.matchNumber })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="mr-score1">{match.team1Name}</Label>
              <Input
                id="mr-score1"
                type="number"
                min={0}
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
                required
              />
            </div>

            <div className="flex items-end justify-center pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {tMatches('vs')}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mr-score2">{match.team2Name}</Label>
              <Input
                id="mr-score2"
                type="number"
                min={0}
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
