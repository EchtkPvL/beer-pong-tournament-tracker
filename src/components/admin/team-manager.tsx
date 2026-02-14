'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { Team } from '@/lib/db/schema';

interface TeamManagerProps {
  eventId: string;
  initialTeams: Team[];
}

interface TeamFormData {
  name: string;
  members: string;
  seed: string;
}

const emptyForm: TeamFormData = { name: '', members: '', seed: '' };

export function TeamManager({ eventId, initialTeams }: TeamManagerProps) {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');

  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshTeams = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/teams`);
      if (res.ok) {
        const data: Team[] = await res.json();
        setTeams(data);
      }
    } catch {
      // silently fail
    }
  };

  const handleAdd = async () => {
    setIsSubmitting(true);
    try {
      const members = formData.members
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
      const seed = formData.seed ? parseInt(formData.seed, 10) : null;

      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          members: members.length > 0 ? members : null,
          seed,
        }),
      });

      if (res.ok) {
        setFormData(emptyForm);
        setAddOpen(false);
        await refreshTeams();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingTeam) return;
    setIsSubmitting(true);
    try {
      const members = formData.members
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
      const seed = formData.seed ? parseInt(formData.seed, 10) : null;

      const res = await fetch(
        `/api/events/${eventId}/teams/${editingTeam.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            members: members.length > 0 ? members : null,
            seed,
          }),
        }
      );

      if (res.ok) {
        setFormData(emptyForm);
        setEditOpen(false);
        setEditingTeam(null);
        await refreshTeams();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    const res = await fetch(`/api/events/${eventId}/teams/${teamId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await refreshTeams();
    }
  };

  const handleDisqualify = async (teamId: string) => {
    const res = await fetch(`/api/events/${eventId}/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'disqualified' }),
    });
    if (res.ok) {
      await refreshTeams();
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      members: team.members?.join(', ') ?? '',
      seed: team.seed?.toString() ?? '',
    });
    setEditOpen(true);
  };

  const teamFormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tm-name">{t('name')}</Label>
        <Input
          id="tm-name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tm-members">{t('members')}</Label>
        <Input
          id="tm-members"
          value={formData.members}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, members: e.target.value }))
          }
          placeholder={t('membersPlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tm-seed">{t('seed')}</Label>
        <Input
          id="tm-seed"
          type="number"
          min={1}
          value={formData.seed}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, seed: e.target.value }))
          }
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('title')} ({teams.length})
        </h3>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setFormData(emptyForm);
                setAddOpen(true);
              }}
            >
              {t('add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('add')}</DialogTitle>
            </DialogHeader>
            {teamFormFields}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isSubmitting || !formData.name}>
                {isSubmitting ? tCommon('loading') : tCommon('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('noTeams')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">
                  {t('name')}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t('members')}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t('seed')}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t('status')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {tCommon('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2 font-medium">{team.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {team.members?.join(', ') ?? '-'}
                  </td>
                  <td className="px-4 py-2">{team.seed ?? '-'}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        team.status === 'active' ? 'default' : 'destructive'
                      }
                    >
                      {team.status === 'active'
                        ? t('active')
                        : t('disqualified')}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(team)}
                      >
                        {tCommon('edit')}
                      </Button>

                      {team.status === 'active' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {t('disqualify')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t('disqualify')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('disqualifyConfirm', {
                                  name: team.name,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {tCommon('cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisqualify(team.id)}
                              >
                                {tCommon('confirm')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {tCommon('delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {tCommon('delete')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteConfirm')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {tCommon('cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(team.id)}
                            >
                              {tCommon('confirm')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon('edit')}</DialogTitle>
          </DialogHeader>
          {teamFormFields}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingTeam(null);
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
