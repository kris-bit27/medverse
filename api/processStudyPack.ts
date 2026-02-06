import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import { webcrypto } from 'node:crypto';
import { supabaseAdmin } from './_supabaseAdmin.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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
  const digest = await webcrypto.subtle.digest('SHA-256', data);
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
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str || '').join(' ');
      text += pageText + '\n';
      if (text.length > MAX_TEXT_CHARS) break;
    }
    return text;
  }

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
`;
};

const extractText = (response: any) => {
  if (!response?.content) return '';
  return response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');
};

const tryParseJson = (text: string) => {
  if (!text) return null;
  const clean = text.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
};

const invokeLLM = async (prompt: string, schema: any, maxTokens: number, temperature: number) => {
  const schemaHint = schema
    ? `\n\nReturn ONLY valid JSON that matches this schema:\n${JSON.stringify(schema)}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: `${prompt}${schemaHint}` }]
  });

  const text = extractText(response);
  const parsed = tryParseJson(text);
  if (!parsed) {
    throw new Error('LLM returned invalid JSON');
  }
  return parsed;
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packId, mode } = req.body || {};
    if (!packId) {
      return res.status(400).json({ error: 'packId is required' });
    }
    const targetMode = mode === 'HIGH_YIELD' ? 'HIGH_YIELD' : 'FULLTEXT';

    if (processingQueue.has(packId)) {
      return res.status(202).json({ queued: true, status: 'already_queued' });
    }

    processingQueue.add(packId);

    setTimeout(async () => {
      try {
        const { data: packList, error: packErr } = await supabaseAdmin
          .from('study_packs')
          .select('*')
          .eq('id', packId)
          .limit(1);
        if (packErr) throw packErr;
        const pack = packList?.[0];
        if (!pack) throw new Error('Pack not found.');

        await supabaseAdmin.from('study_packs').update({ status: 'CHUNKED' }).eq('id', packId);

        const { data: files, error: fileErr } = await supabaseAdmin
          .from('study_pack_files')
          .select('*')
          .eq('pack_id', packId);
        if (fileErr) throw fileErr;
        if (!files?.length) throw new Error('Missing StudyPackFile.');

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
        const chunkRecords: any[] = [];
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

        const { data: existingChunks } = await supabaseAdmin
          .from('study_pack_chunks')
          .select('id')
          .eq('pack_id', packId);

        if (existingChunks?.length) {
          const ids = existingChunks.map((c) => c.id);
          await supabaseAdmin.from('study_pack_chunks').delete().in('id', ids);
        }

        const { data: createdChunks, error: chunkErr } = await supabaseAdmin
          .from('study_pack_chunks')
          .insert(chunkRecords)
          .select();
        if (chunkErr) throw chunkErr;

        const chunkMap = createdChunks.map((c) => ({ id: c.id, content: c.content }));
        const focus = (pack.topic_focus || '').trim();
        const relevantChunks = selectRelevantChunks(chunkMap, focus);

        const fullPrompt = buildPrompt(pack.title, relevantChunks, 'FULLTEXT', focus);
        const fullResponse = await invokeLLM(
          fullPrompt,
          {
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
          },
          4096,
          0.2
        );

        const fullMarkdown = [
          `# ${fullResponse.title || pack.title}`,
          ...(fullResponse.sections || []).map((s: any) => `## ${s.title}\n\n${s.content_md}`)
        ].join('\n\n');

        const fullHtml = sanitizeHtml(marked.parse(fullMarkdown) as string);
        const fullCitations = (fullResponse.sections || []).map((s: any) => ({
          sectionTitle: s.title,
          chunkIds: s.chunk_ids,
          quoteSnippets: s.quote_snippets
        }));

        const outputs: any[] = [
          {
            pack_id: packId,
            mode: 'FULLTEXT',
            content_html: fullHtml,
            citations_json: fullCitations,
            model: 'claude-sonnet-4-20250514'
          }
        ];

        if (targetMode === 'HIGH_YIELD') {
          const highPrompt = buildHighYieldFromFullPrompt(pack.title, fullMarkdown, relevantChunks, focus);
          const highResponse = await invokeLLM(
            highPrompt,
            {
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
            },
            2048,
            0.1
          );

          const highMarkdown = [
            `# ${highResponse.title || pack.title}`,
            ...(highResponse.bullets || []).map((b: any) => `- ${b.text}`)
          ].join('\n');

          const highHtml = sanitizeHtml(marked.parse(highMarkdown) as string);
          const highCitations = (highResponse.bullets || []).map((b: any, idx: number) => ({
            sectionTitle: `Bullet ${idx + 1}`,
            chunkIds: b.chunk_ids,
            quoteSnippets: b.quote_snippets
          }));

          outputs.push({
            pack_id: packId,
            mode: 'HIGH_YIELD',
            content_html: highHtml,
            citations_json: highCitations,
            model: 'claude-sonnet-4-20250514'
          });
        }

        const { data: existingOutputs } = await supabaseAdmin
          .from('study_pack_outputs')
          .select('id')
          .eq('pack_id', packId);

        if (existingOutputs?.length) {
          const ids = existingOutputs.map((o) => o.id);
          await supabaseAdmin.from('study_pack_outputs').delete().in('id', ids);
        }

        const { error: outputErr } = await supabaseAdmin
          .from('study_pack_outputs')
          .insert(outputs);
        if (outputErr) throw outputErr;

        await supabaseAdmin.from('study_packs').update({ status: 'READY' }).eq('id', packId);
      } catch (error) {
        console.error('Study pack processing failed:', error);
        try {
          await supabaseAdmin.from('study_packs').update({ status: 'ERROR' }).eq('id', packId);
        } catch (updateError) {
          console.error('Failed to update status:', updateError);
        }
      } finally {
        processingQueue.delete(packId);
      }
    }, 0);

    return res.status(202).json({ queued: true });
  } catch (error: any) {
    console.error('Process study pack error:', error);
    return res.status(500).json({ error: error.message || 'Process failed' });
  }
}
