import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import {
  JIUXUANGE_PLAYER_VERSION,
  MAIC_COURSE_PACKAGE_FORMAT_VERSION,
  OPENMAIC_COMPATIBILITY_VERSION,
} from '@/lib/jiuxuange/player/types';
import { getCaseOnlyDatabase } from '@/lib/server/jiuxuange-case-only/db/client';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';

const REQUIRED_PACKAGES = [
  'breakfast-chain-six-elements-foundation',
  'convenience-bee',
  'fresh-grocery-comparison',
  'shein-system-capabilities',
  'florasis-business-model',
] as const;

export async function GET() {
  try {
    await getCaseOnlyDatabase().execute(sql`select 1`);
    const packages = await Promise.all(
      REQUIRED_PACKAGES.map((packageId) => readPlayerPackage(packageId)),
    );
    if (packages.some((value) => value === null)) {
      throw new Error('One or more required player packages are missing');
    }
    return NextResponse.json({
      status: 'ready',
      playerVersion: JIUXUANGE_PLAYER_VERSION,
      openMaicCompatibility: OPENMAIC_COMPATIBILITY_VERSION,
      packageFormatVersion: MAIC_COURSE_PACKAGE_FORMAT_VERSION,
      requiredPackageCount: REQUIRED_PACKAGES.length,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'not_ready',
        playerVersion: JIUXUANGE_PLAYER_VERSION,
      },
      { status: 503 },
    );
  }
}
