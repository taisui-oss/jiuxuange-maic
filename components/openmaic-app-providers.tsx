'use client';

import type { ReactNode } from 'react';
import { AccessCodeGuard } from '@/components/access-code-guard';
import { ServerProvidersInit } from '@/components/server-providers-init';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { ThemeProvider } from '@/lib/hooks/use-theme';

export function OpenMaicAppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ServerProvidersInit />
        <AccessCodeGuard>{children}</AccessCodeGuard>
        <Toaster position="top-center" />
      </I18nProvider>
    </ThemeProvider>
  );
}
