import { getUserFromRequest, getSupabaseAdmin, handleCors, corsHeaders } from './_shared/supabaseAdmin.ts';
import { marked } from 'https://esm.sh/marked@12.0.2';

const processingQueue = new Set<string>();
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const MAX_CHUNKS = 200;
const CHUNK_SIZE = 1600;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const sanitizeHtml = (html: string) =>
  html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');

const hashContent = async (content: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(content));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const chunkText = (text: string) => {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.slice(0, MAX_CHUNKS);
};

const normalizeTokens = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter((t) => t.length >= 3);

const scoreChunk = (chunk: string, focus: string) => {
  if (!focus) return 0;
  const focusTokens = new Set(normalizeTokens(focus));
  return normalizeTokens(chunk).filter((t) => focusTokens.has(t)).length;
};

const selectRelevantChunks = (chunks: { id: string; content: string }[], focus: string) => {
  if (!focus) return chunks;
  const scored = chunks.map((c) => ({ ...c, score: scoreChunk(c.content, focus) })).filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 60);
  return top.length > 0 ? top : chunks;
};

const extractTextFromFile = async (fileUrl: string, mimeType: string) => {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error('Nepodařilo se stáhnout soubor.');
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_BYTES) throw new Error('Soubor je příliš velký (limit 10MB).');

  const lowerType = (mimeType || '').toLowerCase();
  if (lowerType.includes('text') || lowerType.includes('markdown')) {
    return textDecoder.decode(arrayBuffer);
  }
  if (lowerType.includes('pdf')) {
    const pdfjs = await import('https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.mjs');
    const pdf = await (pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((i: any) => i.str || '').join(' ') + '\n';
      if (text.length > MAX_TEXT_CHARS) break;
    }
    return text;
  }
  return textDecoder.decode(arrayBuffer);
};

// --- Gemini LLM call (replaces base44.integrations.Core.InvokeLLM) ---
async function callGemini(prompt: string, schema: any, temperature = 0.2, maxTokens = 4096) {
  const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || '';
  if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const text = (json?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
  try { return JSON.parse(text.replace(/```json\n?|```/g, '').trim()); }
  catch { return { raw: text }; }
}

const buildPrompt = (title: string, chunks: { id: string; content: string }[], mode: string, focus: string) => {
  const chunkList = chunks.map((c) => `CHUNK ${c.id}\n${c.content}`).join('\n\n---\n\n');
  if (mode === 'FULLTEXT') {
    return `Jsi specialista na medicínské kurikulum. Vytvoř KOMPLETNÍ studijní text z chunků.\nTéma: ${title}${focus ? `\nFokus: ${focus}` : ''}\n\nPRAVIDLA: Piš česky, odborně. Používej pouze fakta z chunků.\nVRAŤ JSON: { "title": "string", "sections": [{ "title": "string", "content_md": "markdown", "chunk_ids": [], "quote_snippets": [] }] }\n\nCHUNKY:\n${chunkList}`;
  }
  return `Z chunků vytvoř HIGH-YIELD shrnutí.\nTéma: ${title}${focus ? `\nFokus: ${focus}` : ''}\n\nMax 12 odrážek. VRAŤ JSON: { "title": "string", "bullets": [{ "text": "string", "chunk_ids": [], "quote_snippets": [] }] }\n\nCHUNKY:\n${chunkList}`;
};

const buildHighYieldFromFullPrompt = (title: string, fullMarkdown: string, chunks: { id: string; content: string }[], focus: string) => {
  const chunkList = chunks.map((c) => `CHUNK ${c.id}\n${c.content}`).join('\n\n---\n\n');
  return `Vytvoř HIGH-YIELD shrnutí z tohoto textu.\nTéma: ${title}${focus ? `\nFokus: ${focus}` : ''}\n\nFULL TEXT:\n${fullMarkdown}\n\nCHUNKY (pro citace):\n${chunkList}\n\nVRAŤ JSON: { "title": "string", "bullets": [{ "text": "string", "chunk_ids": [], "quote_snippets": [] }] }`;
};

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const { packId, mode } = await req.json();
    if (!packId) {
      return Response.json({ error: 'packId is required' }, { status: 400, headers: corsHeaders() });
    }
    const targetMode = mode === 'HIGH_YIELD' ? 'HIGH_YIELD' : 'FULLTEXT';

    if (processingQueue.has(packId)) {
      return Response.json({ queued: true, status: 'already_queued' }, { headers: corsHeaders() });
    }

    processingQueue.add(packId);
    const supabaseAdmin = getSupabaseAdmin();

    // Background processing
    queueMicrotask(async () => {
      try {
        // Fetch pack
        const { data: pack, error: packErr } = await supabaseAdmin.from('study_packs').select('*').eq('id', packId).single();
        if (packErr || !pack) throw new Error('Pack not found.');

        // Update status
        await supabaseAdmin.from('study_packs').update({ status: 'CHUNKED' }).eq('id', packId);

        // Fetch files
        const { data: files } = await supabaseAdmin.from('study_pack_files').select('*').eq('pack_id', packId);
        if (!files?.length) throw new Error('Missing StudyPackFile.');

        const file = files[0];
        let text = file.content_text || '';
        if (!text && file.storage_url) {
          text = await extractTextFromFile(file.storage_url, file.mime_type || '');
        }
        if (!text) throw new Error('Nepodařilo se získat text ze souboru.');
        if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);

        // Chunk text
        const rawChunks = chunkText(text);
        const chunkRecords = [];
        for (let i = 0; i < rawChunks.length; i++) {
          const content = rawChunks[i];
          chunkRecords.push({
            pack_id: packId,
            idx: i,
            content,
            hash: await hashContent(content),
            token_count_estimate: Math.ceil(content.length / 4),
          });
        }

        // Delete old chunks, insert new
        await supabaseAdmin.from('study_pack_chunks').delete().eq('pack_id', packId);
        const { data: createdChunks } = await supabaseAdmin.from('study_pack_chunks').insert(chunkRecords).select('id, content');

        const chunkMap = (createdChunks || []).map((c) => ({ id: c.id, content: c.content }));
        const focus = (pack.topic_focus || '').trim();
        const relevantChunks = selectRelevantChunks(chunkMap, focus);

        // Generate fulltext via Gemini
        const fullPrompt = buildPrompt(pack.title, relevantChunks, 'FULLTEXT', focus);
        const fullResponse = await callGemini(fullPrompt, null, 0.2, 4096);

        const fullMarkdown = [
          `# ${fullResponse.title || pack.title}`,
          ...(fullResponse.sections || []).map((s: any) => `## ${s.title}\n\n${s.content_md}`),
        ].join('\n\n');

        const fullHtml = sanitizeHtml(marked.parse(fullMarkdown) as string);
        const fullCitations = (fullResponse.sections || []).map((s: any) => ({
          sectionTitle: s.title,
          chunkIds: s.chunk_ids,
          quoteSnippets: s.quote_snippets,
        }));

        const outputs: any[] = [
          { pack_id: packId, mode: 'FULLTEXT', content_html: fullHtml, citations_json: fullCitations, model: 'gemini-1.5-pro' },
        ];

        // Optionally generate high-yield
        if (targetMode === 'HIGH_YIELD') {
          const highPrompt = buildHighYieldFromFullPrompt(pack.title, fullMarkdown, relevantChunks, focus);
          const highResponse = await callGemini(highPrompt, null, 0.1, 2048);

          const highMarkdown = [`# ${highResponse.title || pack.title}`, ...(highResponse.bullets || []).map((b: any) => `- ${b.text}`)].join('\n');
          const highHtml = sanitizeHtml(marked.parse(highMarkdown) as string);
          const highCitations = (highResponse.bullets || []).map((b: any, idx: number) => ({
            sectionTitle: `Bullet ${idx + 1}`,
            chunkIds: b.chunk_ids,
            quoteSnippets: b.quote_snippets,
          }));

          outputs.push({ pack_id: packId, mode: 'HIGH_YIELD', content_html: highHtml, citations_json: highCitations, model: 'gemini-1.5-pro' });
        }

        // Delete old outputs, insert new
        await supabaseAdmin.from('study_pack_outputs').delete().eq('pack_id', packId);
        await supabaseAdmin.from('study_pack_outputs').insert(outputs);

        await supabaseAdmin.from('study_packs').update({ status: 'READY' }).eq('id', packId);
      } catch (error) {
        console.error('Study pack processing failed:', error);
        try { await supabaseAdmin.from('study_packs').update({ status: 'ERROR' }).eq('id', packId); } catch {}
      } finally {
        processingQueue.delete(packId);
      }
    });

    return Response.json({ queued: true }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Process study pack error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
});
