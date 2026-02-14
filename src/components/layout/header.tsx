'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);

  const switchLocale = (newLocale: 'de' | 'en') => {
    router.replace(pathname, { locale: newLocale });
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            BPTT
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t('home')}
            </Link>
            <Link
              href="/admin"
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                pathname.startsWith('/admin')
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {t('admin')}
            </Link>
          </nav>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLangOpen(!langOpen)}
            className="gap-1 text-sm"
          >
            {locale === 'de' ? 'DE' : 'EN'}
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                langOpen && 'rotate-180'
              )}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
          {langOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border bg-card p-1 shadow-md">
                <button
                  onClick={() => switchLocale('de')}
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-1.5 text-sm',
                    locale === 'de'
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  Deutsch
                </button>
                <button
                  onClick={() => switchLocale('en')}
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-1.5 text-sm',
                    locale === 'en'
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  English
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
