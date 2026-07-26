import { NextRequest } from 'next/server';
import {
  isServerConfiguredProvider,
  resolvePDFApiKey,
  resolvePDFBaseUrl,
} from '@/lib/server/provider-config';
import { PDF_PROVIDERS } from '@/lib/pdf/constants';
import type { PDFProviderId } from '@/lib/pdf/types';
import type { ParsedPdfContent } from '@/lib/types/pdf';
import {
  documentArtifactToParsedPdfContent,
  getDocumentExtractorProvider,
  selectDocumentExtractorProvider,
} from '@/lib/document';
import { normalizeDocumentMimeType } from '@/lib/document/mime';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';

const log = createLogger('Extract Document');

function isPdfProviderId(providerId: string): providerId is PDFProviderId {
  return providerId in PDF_PROVIDERS;
}

function supportsMimeType(provider: { supportedMimeTypes: string[] }, mimeType: string): boolean {
  return provider.supportedMimeTypes.map((type) => type.toLowerCase()).includes(mimeType);
}

function isSelfHostedMinerUProvider(
  providerId: string,
): providerId is Extract<PDFProviderId, 'mineru'> {
  return providerId === 'mineru';
}

function isMinerUProvider(
  providerId: string,
): providerId is Extract<PDFProviderId, 'mineru' | 'mineru-cloud'> {
  return providerId === 'mineru' || providerId === 'mineru-cloud';
}

function getLocalTextFallbackProvider(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return getDocumentExtractorProvider('unpdf');
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return getDocumentExtractorProvider('docx-local');
  }
  return undefined;
}

function requestedTypeLabel(mimeType: string): string {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'DOCX';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return 'PPTX';
  }
  return mimeType;
}

export async function POST(req: NextRequest) {
  let fileName: string | undefined;
  let resolvedProviderId: string | undefined;
  let fallbackFromProviderId: string | undefined;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      log.error('Invalid Content-Type for document upload:', contentType);
      return apiError(
        'INVALID_REQUEST',
        400,
        `Invalid Content-Type: expected multipart/form-data, got "${contentType}"`,
      );
    }

    const formData = await req.formData();
    const documentFile = (formData.get('file') || formData.get('pdf')) as File | null;
    const preferredProviderId = formData.get('providerId') as string | null;
    const apiKey = formData.get('apiKey') as string | null;
    const baseUrl = formData.get('baseUrl') as string | null;

    if (!documentFile) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'No course material file provided');
    }

    fileName = documentFile.name;
    const mimeType = normalizeDocumentMimeType({
      mimeType: documentFile.type,
      fileName: documentFile.name,
    });
    if (!mimeType) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `Unsupported course material type for "${documentFile.name}"`,
      );
    }

    let provider = preferredProviderId
      ? getDocumentExtractorProvider(preferredProviderId)
      : undefined;
    if (preferredProviderId && !provider) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `Unknown document extractor provider: ${preferredProviderId}`,
      );
    }

    if (provider && !supportsMimeType(provider, mimeType)) provider = undefined;

    try {
      provider =
        provider ||
        selectDocumentExtractorProvider({
          mimeType,
          requiredCapabilities: { text: true },
        });
    } catch (error) {
      return apiError(
        'INVALID_REQUEST',
        400,
        error instanceof Error ? error.message : `Unsupported course material type "${mimeType}"`,
      );
    }
    resolvedProviderId = provider.id;

    let managed = isPdfProviderId(provider.id) && isServerConfiguredProvider('pdf', provider.id);
    let clientBaseUrl = managed ? undefined : baseUrl || undefined;
    if (isSelfHostedMinerUProvider(provider.id) && !managed && !clientBaseUrl) {
      const cloudProvider = getDocumentExtractorProvider('mineru-cloud');
      const cloudManaged = isServerConfiguredProvider('pdf', 'mineru-cloud');
      const cloudApiKey = resolvePDFApiKey(
        'mineru-cloud',
        cloudManaged ? undefined : apiKey || undefined,
      );
      if (cloudProvider && supportsMimeType(cloudProvider, mimeType) && cloudApiKey) {
        provider = cloudProvider;
        managed = cloudManaged;
        clientBaseUrl = managed ? undefined : baseUrl || undefined;
        resolvedProviderId = provider.id;
      }
    }

    const resolvedApiKey =
      isPdfProviderId(provider.id) && provider.id === 'mineru-cloud'
        ? resolvePDFApiKey(provider.id, managed ? undefined : apiKey || undefined)
        : undefined;
    const minerUUnavailable =
      isSelfHostedMinerUProvider(provider.id) && !managed && !clientBaseUrl
        ? true
        : provider.id === 'mineru-cloud' && !managed && !resolvedApiKey;

    if (isMinerUProvider(provider.id) && minerUUnavailable) {
      const localFallback = getLocalTextFallbackProvider(mimeType);
      if (localFallback) {
        fallbackFromProviderId = provider.id;
        provider = localFallback;
        managed = false;
        clientBaseUrl = undefined;
        resolvedProviderId = provider.id;
      }
    }

    if (isMinerUProvider(provider.id) && minerUUnavailable) {
      return apiError(
        'INVALID_REQUEST',
        422,
        `${requestedTypeLabel(mimeType)} extraction requires a configured MinerU document extractor. Configure a self-hosted MinerU base URL or a MinerU Cloud API key in PDF provider settings.`,
      );
    }
    if (clientBaseUrl && process.env.NODE_ENV === 'production') {
      const ssrfError = await validateUrlForSSRF(clientBaseUrl);
      if (ssrfError) {
        return apiError('INVALID_URL', 403, ssrfError);
      }
    }

    const config = {
      providerId: provider.id,
      apiKey: isPdfProviderId(provider.id)
        ? resolvePDFApiKey(provider.id, managed ? undefined : apiKey || undefined)
        : apiKey || undefined,
      baseUrl: isPdfProviderId(provider.id)
        ? resolvePDFBaseUrl(provider.id, clientBaseUrl)
        : clientBaseUrl,
    };

    const arrayBuffer = await documentFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const artifact = await provider.extract({
      buffer,
      fileName: documentFile.name,
      fileSize: documentFile.size,
      mimeType,
      config,
    });
    const result = documentArtifactToParsedPdfContent(artifact);
    if (!result.text.trim()) {
      return apiError(
        'PARSE_FAILED',
        422,
        '本地 PDF 解析器没有识别到可读文字。若文件是扫描件或主要由图片、复杂表格组成，请配置 MinerU OCR 后重试。',
      );
    }

    const resultWithMetadata: ParsedPdfContent = {
      ...result,
      metadata: {
        ...result.metadata,
        pageCount: result.metadata?.pageCount ?? 0,
        fileName: documentFile.name,
        fileSize: documentFile.size,
        mimeType,
        parser: result.metadata?.parser ?? provider.id,
        ...(fallbackFromProviderId ? { fallbackFromProviderId } : {}),
      },
    };

    return apiSuccess({ data: resultWithMetadata });
  } catch (error) {
    log.error(
      `Document extraction failed [provider=${resolvedProviderId ?? 'unknown'}, file="${fileName ?? 'unknown'}"]:`,
      error,
    );
    return apiError('PARSE_FAILED', 500, error instanceof Error ? error.message : 'Unknown error');
  }
}
