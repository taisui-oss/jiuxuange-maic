import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import JSZip from 'jszip';

const mocks = vi.hoisted(() => ({
  isServerConfiguredProvider: vi.fn(() => false),
  resolvePDFApiKey: vi.fn((_providerId: string, clientKey?: string) => clientKey || ''),
  resolvePDFBaseUrl: vi.fn((_providerId: string, clientBaseUrl?: string) => clientBaseUrl),
  parseWithMinerUCloud: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/server/provider-config', () => ({
  isServerConfiguredProvider: mocks.isServerConfiguredProvider,
  resolvePDFApiKey: mocks.resolvePDFApiKey,
  resolvePDFBaseUrl: mocks.resolvePDFBaseUrl,
}));

vi.mock('@/lib/pdf/mineru-cloud', () => ({
  parseWithMinerUCloud: mocks.parseWithMinerUCloud,
}));

async function postExtractDocument(input: {
  file: File;
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
}) {
  const { POST } = await import('@/app/api/extract-document/route');
  const formData = new FormData();
  formData.append('file', input.file);
  if (input.providerId) formData.append('providerId', input.providerId);
  if (input.apiKey) formData.append('apiKey', input.apiKey);
  if (input.baseUrl) formData.append('baseUrl', input.baseUrl);

  const request = new Request('http://localhost/api/extract-document', {
    method: 'POST',
    body: formData,
  });
  return POST(request as unknown as NextRequest);
}

async function createDocxFile(text: string): Promise<File> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
        </w:body>
      </w:document>`,
  );
  const buffer = await zip.generateAsync({ type: 'uint8array' });
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return new File([arrayBuffer], 'lesson.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

describe('POST /api/extract-document', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mocks.isServerConfiguredProvider.mockReturnValue(false);
    mocks.resolvePDFApiKey.mockImplementation(
      (_providerId: string, clientKey?: string) => clientKey || '',
    );
    mocks.resolvePDFBaseUrl.mockImplementation(
      (_providerId: string, clientBaseUrl?: string) => clientBaseUrl,
    );
    mocks.parseWithMinerUCloud.mockReset();
    mocks.parseWithMinerUCloud.mockResolvedValue({
      text: 'cloud parsed text',
      images: [],
      metadata: {
        pageCount: 1,
        parser: 'mineru-cloud',
      },
    });
    delete process.env.PDF_MINERU_BASE_URL;
    delete process.env.PDF_MINERU_API_KEY;
  });

  it('returns 400 for unsupported course material MIME types', async () => {
    const res = await postExtractDocument({
      file: new File(['x,y'], 'sheet.csv', { type: 'text/csv' }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'INVALID_REQUEST',
    });
  });

  it('returns 400 for an unknown requested provider', async () => {
    const res = await postExtractDocument({
      file: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
      providerId: 'missing-provider',
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'INVALID_REQUEST',
      error: 'Unknown document extractor provider: missing-provider',
    });
  });

  it('treats an incompatible preferred provider as a hint and falls back by MIME type', async () => {
    const res = await postExtractDocument({
      file: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
      providerId: 'unpdf',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        text: 'hello',
        metadata: {
          mimeType: 'text/plain',
          parser: 'plain-text',
        },
      },
    });
  });

  it('extracts DOCX text locally when MinerU is not configured', async () => {
    const res = await postExtractDocument({
      file: await createDocxFile('商业模式课程导读'),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        metadata: {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          parser: 'docx-local',
        },
      },
    });
    expect(json.data.text).toContain('商业模式课程导读');
  });

  it('returns actionable 422 diagnostics when explicitly selected MinerU is unconfigured', async () => {
    const res = await postExtractDocument({
      file: new File(['not really docx'], 'lesson.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      providerId: 'mineru',
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'INVALID_REQUEST',
    });
    expect(json.error).toContain('DOCX extraction requires a configured MinerU document extractor');
    expect(json.error).toContain('self-hosted MinerU base URL or a MinerU Cloud API key');
  });

  it('allows MinerU Cloud PDF extraction with an API key and no base URL', async () => {
    const res = await postExtractDocument({
      file: new File(['%PDF-1.4'], 'lesson.pdf', { type: 'application/pdf' }),
      providerId: 'mineru-cloud',
      apiKey: 'cloud-key',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        text: 'cloud parsed text',
        metadata: {
          parser: 'mineru-cloud',
        },
      },
    });
    expect(mocks.parseWithMinerUCloud).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'mineru-cloud',
        apiKey: 'cloud-key',
        baseUrl: undefined,
      }),
      expect.any(Buffer),
      'lesson.pdf',
    );
  });

  it('allows explicitly selected MinerU Cloud extraction for DOCX', async () => {
    const res = await postExtractDocument({
      file: new File(['not really docx'], 'lesson.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      providerId: 'mineru-cloud',
      apiKey: 'cloud-key',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        text: 'cloud parsed text',
        metadata: {
          parser: 'mineru-cloud',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      },
    });
    expect(mocks.parseWithMinerUCloud).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'mineru-cloud',
        apiKey: 'cloud-key',
        baseUrl: undefined,
      }),
      expect.any(Buffer),
      'lesson.docx',
    );
  });
});
