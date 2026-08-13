import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import '@openmaic/renderer/fonts.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { isCaseOnlyModeEnabled } from '@/lib/jiuxuange/case-only/route-policy';

const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: '九轩阁 MAIC',
  description: 'Jiuxuange MAIC is an intelligent learning companion for the six core courses.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isCaseOnlyModeEnabled()) {
    return (
      <html lang="zh-CN" className={inter.variable}>
        <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  const { OpenMaicAppProviders } = await import('@/components/openmaic-app-providers');

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <OpenMaicAppProviders>{children}</OpenMaicAppProviders>
      </body>
    </html>
  );
}
