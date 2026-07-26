import { describe, expect, it } from 'vitest';
import { isPdfProviderAvailable } from '@/lib/pdf/provider-availability';

describe('PDF provider availability', () => {
  it('keeps the built-in local parser available without configuration', () => {
    expect(isPdfProviderAvailable('unpdf', undefined)).toBe(true);
  });

  it('does not present an unconfigured self-hosted MinerU as available', () => {
    expect(
      isPdfProviderAvailable('mineru', {
        apiKey: '',
        baseUrl: '',
        isServerConfigured: false,
      }),
    ).toBe(false);
  });

  it('accepts configured local and cloud MinerU paths', () => {
    expect(isPdfProviderAvailable('mineru', { baseUrl: 'http://127.0.0.1:8080' })).toBe(true);
    expect(isPdfProviderAvailable('mineru-cloud', { apiKey: 'configured-key' })).toBe(true);
    expect(isPdfProviderAvailable('mineru-cloud', { isServerConfigured: true })).toBe(true);
  });
});
