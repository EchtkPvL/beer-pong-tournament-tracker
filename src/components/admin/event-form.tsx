'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EventMode = 'group' | 'single_elimination' | 'double_elimination';
type KnockoutMode = 'single_elimination' | 'double_elimination';

export interface EventFormData {
  name: string;
  date: string;
  location: string;
  mode: EventMode;
  tableCount: number;
  groupCount: number | null;
  teamsAdvancePerGroup: number | null;
  knockoutMode: KnockoutMode | null;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void> | void;
}

export function EventForm({ initialData, onSubmit }: EventFormProps) {
  const t = useTranslations('events');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<EventFormData>({
    name: initialData?.name ?? '',
    date: initialData?.date ?? '',
    location: initialData?.location ?? '',
    mode: initialData?.mode ?? 'single_elimination',
    tableCount: initialData?.tableCount ?? 1,
    groupCount: initialData?.groupCount ?? 2,
    teamsAdvancePerGroup: initialData?.teamsAdvancePerGroup ?? 2,
    knockoutMode: initialData?.knockoutMode ?? 'single_elimination',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? tCommon('edit') : tCommon('create')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ef-name">{t('name')}</Label>
            <Input
              id="ef-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ef-date">{t('date')}</Label>
            <Input
              id="ef-date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ef-location">{t('location')}</Label>
            <Input
              id="ef-location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ef-mode">{t('mode')}</Label>
            <Select
              value={formData.mode}
              onValueChange={(value: EventMode) =>
                setFormData((prev) => ({ ...prev, mode: value }))
              }
            >
              <SelectTrigger id="ef-mode">
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
            <Label htmlFor="ef-tableCount">{t('tables')}</Label>
            <Input
              id="ef-tableCount"
              type="number"
              min={1}
              max={20}
              value={formData.tableCount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  tableCount: parseInt(e.target.value, 10) || 1,
                }))
              }
              required
            />
          </div>

          {formData.mode === 'group' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ef-groupCount">{t('groupCount')}</Label>
                <Input
                  id="ef-groupCount"
                  type="number"
                  min={2}
                  max={16}
                  value={formData.groupCount ?? 2}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      groupCount: parseInt(e.target.value, 10) || 2,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ef-teamsAdvancePerGroup">
                  {t('teamsAdvancePerGroup')}
                </Label>
                <Input
                  id="ef-teamsAdvancePerGroup"
                  type="number"
                  min={1}
                  max={8}
                  value={formData.teamsAdvancePerGroup ?? 2}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      teamsAdvancePerGroup:
                        parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ef-knockoutMode">{t('knockoutMode')}</Label>
                <Select
                  value={formData.knockoutMode ?? 'single_elimination'}
                  onValueChange={(value: KnockoutMode) =>
                    setFormData((prev) => ({
                      ...prev,
                      knockoutMode: value,
                    }))
                  }
                >
                  <SelectTrigger id="ef-knockoutMode">
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

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
