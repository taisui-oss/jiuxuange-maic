import { describe, it, expect } from 'vitest';
import { inlineSceneContent } from '@/lib/export/use-export-classroom';

const fetchImpl = (async (_url: string) => {
  if (_url === 'https://cdn.tailwindcss.com')
    return new Response('/*tw*/', { status: 200, headers: { 'content-type': 'text/javascript' } });
  return new Response('', { status: 404 });
}) as unknown as typeof fetch;

type AnyContent = Record<string, unknown>;

describe('inlineSceneContent', () => {
  it('inlines external assets in an interactive scene content.html', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = {
      type: 'interactive',
      html: '<script src="https://cdn.tailwindcss.com"></script>',
      url: 'https://x',
    };
    const { content: out, report } = await inlineSceneContent(content, { fetchImpl });
    expect((out as unknown as AnyContent).html).toContain('data:text/javascript;base64,');
    expect((out as unknown as AnyContent).html).not.toContain('cdn.tailwindcss.com');
    expect(report.inlined).toContain('https://cdn.tailwindcss.com');
  });

  it('passes through non-interactive scenes untouched (same reference)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = { type: 'slide', elements: [] };
    const { content: out, report } = await inlineSceneContent(content, { fetchImpl });
    expect(out).toBe(content);
    expect(report.inlined).toEqual([]);
  });

  it('preserves Jiuxuange V5 learning evidence in the exported PBL scene content', async () => {
    // The classroom ZIP serializes this returned object into manifest.json.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = {
      type: 'pbl',
      projectV2: {
        jiuxuange: {
          courseVersion: '5.0.0-learning-loop-pilot',
          learningLoop: {
            claims: [{ id: 'claim-1', messageId: 'message-1', evidenceLevel: 'autonomous' }],
            disclosures: [{ id: 'disclosure-1', factIds: ['bee-loop-f3'] }],
            revisions: [{ id: 'revision-1', sourceMessageId: 'message-2' }],
            feedback: {
              id: 'feedback-1',
              evidenceRefs: ['message:message-1', 'fact:bee-loop-f3'],
            },
          },
        },
      },
    };

    const { content: out } = await inlineSceneContent(content, { fetchImpl });
    const manifestRoundTrip = JSON.parse(JSON.stringify(out)) as typeof content;
    const learningLoop = manifestRoundTrip.projectV2.jiuxuange.learningLoop;

    expect(learningLoop.claims[0]).toMatchObject({
      id: 'claim-1',
      messageId: 'message-1',
      evidenceLevel: 'autonomous',
    });
    expect(learningLoop.disclosures[0].factIds).toEqual(['bee-loop-f3']);
    expect(learningLoop.revisions[0].sourceMessageId).toBe('message-2');
    expect(learningLoop.feedback.evidenceRefs).toEqual(['message:message-1', 'fact:bee-loop-f3']);
  });

  it('passes through interactive scenes with no html (url-only) untouched', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = { type: 'interactive', url: 'https://x' };
    const { content: out } = await inlineSceneContent(content, { fetchImpl });
    expect(out).toBe(content);
  });

  it('preserves other content fields while replacing html', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = {
      type: 'interactive',
      html: '<img src="https://cdn.tailwindcss.com">',
      widgetType: 'game',
      url: 'u',
    };
    const { content: out } = await inlineSceneContent(content, { fetchImpl });
    expect((out as unknown as AnyContent).widgetType).toBe('game');
    expect((out as unknown as AnyContent).url).toBe('u');
  });
});
