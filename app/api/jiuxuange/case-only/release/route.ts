import { NextResponse } from 'next/server';
import { JIUXUANGE_CASE_ONLY_RELEASE } from '@/lib/jiuxuange/case-only/release';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      release: {
        ...JIUXUANGE_CASE_ONLY_RELEASE,
        commitRef: process.env.JIUXUANGE_BUILD_COMMIT_REF || null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
