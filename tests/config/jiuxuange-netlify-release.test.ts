import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Jiuxuange Netlify release configuration', () => {
  it('keeps the formal course portal visible on the deployed home page', () => {
    const config = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');

    expect(config).toContain('NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE = "true"');
    expect(config).toContain('NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = "true"');
    expect(config).toContain('NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1 = "true"');
    expect(config).toContain('NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1 = "true"');
  });
});
