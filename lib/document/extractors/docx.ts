import mammoth from 'mammoth';

import { DOCUMENT_MIME_TYPES } from '../mime';
import type { DocumentExtractorProvider } from '../types';

function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

export const docxDocumentExtractorProvider: DocumentExtractorProvider = {
  id: 'docx-local',
  displayName: 'Local DOCX',
  supportedMimeTypes: [DOCUMENT_MIME_TYPES.docx],
  capabilities: {
    text: true,
    images: false,
    tables: false,
    formulas: false,
    layout: false,
    ocr: false,
    async: false,
  },
  async extract(input) {
    const startedAt = Date.now();
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    const text = normalizeExtractedText(result.value);

    if (!text) {
      throw new Error('The DOCX file does not contain readable text');
    }

    return {
      metadata: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        providerId: 'docx-local',
        processingTime: Date.now() - startedAt,
      },
      blocks: [
        {
          id: 'docx_text_1',
          type: 'text',
          text,
        },
      ],
      assets: [],
      diagnostics: result.messages.map((message) => ({
        severity: message.type === 'error' ? ('error' as const) : ('warning' as const),
        message: message.message,
        providerId: 'docx-local',
      })),
    };
  },
};
