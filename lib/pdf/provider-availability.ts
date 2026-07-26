import type { PDFProviderId } from './types';

export interface PDFProviderAvailabilityConfig {
  apiKey?: string;
  baseUrl?: string;
  isServerConfigured?: boolean;
}

export function isPdfProviderAvailable(
  providerId: PDFProviderId,
  config: PDFProviderAvailabilityConfig | undefined,
): boolean {
  if (providerId === 'unpdf') return true;
  if (config?.isServerConfigured) return true;

  if (providerId === 'mineru') {
    return Boolean(config?.baseUrl?.trim());
  }

  return Boolean(config?.apiKey?.trim());
}
