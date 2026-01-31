import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { marked } from 'https://esm.sh/marked@12.0.2';

const processingQueue = new Set<string>();

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const MAX_CHUNKS = 200;
const CHUNK_SIZE = 1600;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const sanitizeHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
};

const hashContent = async (content: string) => {
  const data = textEncoder.encode(content);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const chunkText = (text: string) => {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = '';
    }
  };

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > CHUNK_SIZE) {
      pushCurrent();
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }
  pushCurrent();
  return chunks.slice(0, MAX_CHUNKS);
};

const normalizeTokens = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
};

const scoreChunk = (chunk: string, focus: string) => {
  if (!focus) return 0;
  const focusTokens = new Set(normalizeTokens(focus));
  if (focusTokens.size === 0) return 0;
  let score = 0;
  const chunkTokens = normalizeTokens(chunk);
  for (const token of chunkTokens) {
    if (focusTokens.has(token)) score += 1;
  }
  return score;
};

const selectRelevantChunks = (chunks: { id: string; content: string }[], focus: string) => {
  if (!focus) return chunks;
  const scored = chunks
    .map((c) => ({ ...c, score: scoreChunk(c.content, focus) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(60, scored.length));
  return top.length > 0 ? top : chunks;
};

const extractTextFromFile = async (fileUrl: string, mimeType: string) => {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error('Nepodařilo se stáhnout soubor.');
  }
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
    throw new Error('Soubor je příliš velký (limit 10MB).');
  }

  const lowerType = (mimeType || '').toLowerCase();
  if (lowerType.includes('text') || lowerType.includes('markdown')) {
    return textDecoder.decode(arrayBuffer);
  }

  if (lowerType.includes('pdf')) {
    const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
    const result = await pdfParse.default(new Uint8Array(arrayBuffer));
    return result.text || '';
  }

  // Fallback: try to decode as text
  return textDecoder.decode(arrayBuffer);
};

const buildPrompt = (
  title: string,
  chunks: { id: string; content: string }[],
  mode: 'FULLTEXT' | 'HIGH_YIELD',
  focus: string
) => {
  const chunkList = chunks.map((c) => `CHUNK ${c.id}\n${c.content}`).join('\n\n---\n\n');
  if (mode === 'FULLTEXT') {
    return `
Jsi specialista na medicínské kurikulum. Tvým úkolem je vytvořit KOMPLETNÍ studijní text z poskytnutých chunků.

Téma: ${title}
${focus ? `\nFokus: ${focus}\nVyfiltruj a použij pouze relevantní informace k tomuto fokusu.` : ''}

PRAVIDLA:
- Piš v češtině, odborně, strukturovaně.
- Používej pouze fakta z dodaných chunků. Nehalucinuj.
- Každá sekce musí uvést chunk ID, ze kterých vychází, a 1-2 krátké citace (přímé úryvky).

VRAŤ POUZE JSON:
{
  "title": "string",
  "sections": [
    {
      "title": "string",
      "content_md": "markdown text",
      "chunk_ids": ["id1","id2"],
      "quote_snippets": ["krátký úryvek 1", "krátký úryvek 2"]
    }
  ]
}

CHUNKY:
${chunkList}
`;
  }

  return `
Z následujícího studijního textu (chunky) vytvoř HIGH-YIELD shrnutí.

Téma: ${title}
${focus ? `\nFokus: ${focus}\nPoužij pouze relevantní informace k tomuto fokusu.` : ''}

PRAVIDLA:
- Pouze odrážky (max 12).
- Bez nových informací mimo chunky.
- Přidej chunk IDs a krátké citace.

VRAŤ POUZE JSON:
{
  "title": "string",
  "bullets": [
    {
      "text": "bullet",
      "chunk_ids": ["id1","id2"],
      "quote_snippets": ["krátký úryvek"]
    }
  ]
}

CHUNKY:
${chunkList}
`;
};

const buildHighYieldFromFullPrompt = (
  title: string,
  fullMarkdown: string,
  chunks: { id: string; content: string }[],
  focus: string
) => {
  const chunkList = chunks.map((c) => `CHUNK ${c.id}\n${c.content}`).join('\n\n---\n\n');
  return `
Vytvoř HIGH-YIELD shrnutí z následujícího studijního textu. Použij pouze informace obsažené ve FULL TEXTU.

Téma: ${title}
${focus ? `\nFokus: ${focus}\nPoužij pouze relevantní informace k tomuto fokusu.` : ''}

FULL TEXT:
${fullMarkdown}

CHUNKY (pro citace):
${chunkList}

VRAŤ POUZE JSON:
{
  "title": "string",
  "bullets": [
    {
      "text": "bullet",
      "chunk_ids": ["id1","id2"],
      "quote_snippets": ["krátký úryvek"]
    }
  ]
}
`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packId, mode } = await req.json();
    if (!packId) {
      return Response.json({ error: 'packId is required' }, { status: 400 });
    }
    const targetMode = mode === 'HIGH_YIELD' ? 'HIGH_YIELD' : 'FULLTEXT';

    if (processingQueue.has(packId)) {
      return Response.json({ queued: true, status: 'already_queued' });
    }

    processingQueue.add(packId);

    queueMicrotask(async () => {
      try {
        const pack = await base44.asServiceRole.entities.StudyPack.filter({ id: packId }).then((r) => r[0]);
        if (!pack) throw new Error('Pack not found.');

        await base44.asServiceRole.entities.StudyPack.update(packId, { status: 'CHUNKED' });

        const files = await base44.asServiceRole.entities.StudyPackFile.filter({ pack_id: packId });
        if (!files.length) throw new Error('Missing StudyPackFile.');

        const file = files[0];
        let text = file.content_text || '';
        if (!text && file.storage_url) {
          text = await extractTextFromFile(file.storage_url, file.mime_type || '');
        }

        if (!text) throw new Error('Nepodařilo se získat text ze souboru.');

        if (text.length > MAX_TEXT_CHARS) {
          text = text.slice(0, MAX_TEXT_CHARS);
        }

        const rawChunks = chunkText(text);
        const chunkRecords = [];
        for (let i = 0; i < rawChunks.length; i += 1) {
          const content = rawChunks[i];
          const hash = await hashContent(content);
          chunkRecords.push({
            pack_id: packId,
            idx: i,
            content,
            hash,
            token_count_estimate: Math.ceil(content.length / 4)
          });
        }

        const existingChunks = await base44.asServiceRole.entities.StudyPackChunk.filter({ pack_id: packId });
        await Promise.all(existingChunks.map((c) => base44.asServiceRole.entities.StudyPackChunk.delete(c.id)));
        const createdChunks = await base44.asServiceRole.entities.StudyPackChunk.bulkCreate(chunkRecords);

        const chunkMap = createdChunks.map((c) => ({ id: c.id, content: c.content }));
        const focus = (pack.topic_focus || '').trim();
        const relevantChunks = selectRelevantChunks(chunkMap, focus);

        const fullPrompt = buildPrompt(pack.title, relevantChunks, 'FULLTEXT', focus);
        const fullResponse = await base44.integrations.Core.InvokeLLM({
          prompt: fullPrompt,
          add_context_from_internet: false,
          model: 'gemini-1.5-pro',
          temperature: 0.2,
          maxTokens: 4096,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content_md: { type: 'string' },
                    chunk_ids: { type: 'array', items: { type: 'string' } },
                    quote_snippets: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['title', 'content_md', 'chunk_ids', 'quote_snippets']
                }
              }
            },
            required: ['title', 'sections']
          }
        });

        const fullMarkdown = [
          `# ${fullResponse.title || pack.title}`,
          ...(fullResponse.sections || []).map((s) => `## ${s.title}\n\n${s.content_md}`)
        ].join('\n\n');

        const fullHtml = sanitizeHtml(marked.parse(fullMarkdown));
        const fullCitations = (fullResponse.sections || []).map((s) => ({
          sectionTitle: s.title,
          chunkIds: s.chunk_ids,
          quoteSnippets: s.quote_snippets
        }));

        const outputs = [
          {
            pack_id: packId,
            mode: 'FULLTEXT',
            content_html: fullHtml,
            citations_json: fullCitations,
            model: 'gemini-1.5-pro'
          }
        ];

        if (targetMode === 'HIGH_YIELD') {
          const highPrompt = buildHighYieldFromFullPrompt(pack.title, fullMarkdown, relevantChunks, focus);
          const highResponse = await base44.integrations.Core.InvokeLLM({
            prompt: highPrompt,
            add_context_from_internet: false,
            model: 'gemini-1.5-pro',
            temperature: 0.1,
            maxTokens: 2048,
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                bullets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      chunk_ids: { type: 'array', items: { type: 'string' } },
                      quote_snippets: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['text', 'chunk_ids', 'quote_snippets']
                  }
                }
              },
              required: ['title', 'bullets']
            }
          });

          const highMarkdown = [
            `# ${highResponse.title || pack.title}`,
            ...(highResponse.bullets || []).map((b) => `- ${b.text}`)
          ].join('\n');

          const highHtml = sanitizeHtml(marked.parse(highMarkdown));
          const highCitations = (highResponse.bullets || []).map((b, idx) => ({
            sectionTitle: `Bullet ${idx + 1}`,
            chunkIds: b.chunk_ids,
            quoteSnippets: b.quote_snippets
          }));

          outputs.push({
            pack_id: packId,
            mode: 'HIGH_YIELD',
            content_html: highHtml,
            citations_json: highCitations,
            model: 'gemini-1.5-pro'
          });
        }

        const existingOutputs = await base44.asServiceRole.entities.StudyPackOutput.filter({ pack_id: packId });
        await Promise.all(existingOutputs.map((o) => base44.asServiceRole.entities.StudyPackOutput.delete(o.id)));
        await base44.asServiceRole.entities.StudyPackOutput.bulkCreate(outputs);

        await base44.asServiceRole.entities.StudyPack.update(packId, { status: 'READY' });
      } catch (error) {
        console.error('Study pack processing failed:', error);
        try {
          await base44.asServiceRole.entities.StudyPack.update(packId, { status: 'ERROR' });
        } catch (updateError) {
          console.error('Failed to update status:', updateError);
        }
      } finally {
        processingQueue.delete(packId);
      }
    });

    return Response.json({ queued: true });
  } catch (error) {
    console.error('Process study pack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
