import { getUserFromRequest, handleCors, corsHeaders } from './_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const { disciplineName, sourceUrl } = await req.json();

    if (!disciplineName) {
      return Response.json({ error: 'Discipline name is required' }, { status: 400, headers: corsHeaders() });
    }

    // --- SSRF protection ---
    const isPrivateHost = (host: string) => {
      const lower = host.toLowerCase();
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(lower)) return true;
      if (lower.startsWith('10.') || lower.startsWith('192.168.') || lower.startsWith('169.254.')) return true;
      const match172 = lower.match(/^172\.(\d+)\./);
      if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
      return false;
    };

    const safeFetchText = async (url: string) => {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL protocol');
      if (isPrivateHost(parsed.hostname)) throw new Error('Blocked private host');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const fetchResponse = await fetch(url, { signal: controller.signal });
        if (!fetchResponse.ok) return '';
        const contentType = fetchResponse.headers.get('content-type') || '';
        if (!contentType.includes('text/plain') && !contentType.includes('text/html')) return '';
        const buffer = await fetchResponse.arrayBuffer();
        return new TextDecoder().decode(buffer.byteLength > 30000 ? buffer.slice(0, 30000) : buffer);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let sourceContent = '';
    if (sourceUrl) {
      try { sourceContent = await safeFetchText(sourceUrl); } catch (e) { console.log('Source fetch failed:', e); }
    }

    let prompt = `Vytvoř KOMPLETNÍ strukturu okruhů a témat pro klinickou disciplínu: ${disciplineName}\n`;
    if (sourceContent) {
      prompt += `\n=== ZDROJOVÁ DATA ===\n${sourceContent.substring(0, 20000)}\n=== KONEC ===\nAnalyzuj data a přepiš do JSON.\n`;
    } else if (sourceUrl) {
      prompt += `\nPoužij znalosti oficiálních kurikul MZČR pro daný obor. URL: ${sourceUrl}\n`;
    }
    prompt += `\nPro každý okruh vygeneruj 3-5 témat a pro každé 2-3 otázky s odpověďmi (definice, diagnostika, léčba, komplikace).\nVrať POUZE validní JSON.`;

    const systemPrompt = `Jsi elitní atestační komisař. Vytváříš strukturovaný vzdělávací obsah dle českých zdravotnických standardů.\n\n${prompt}`;

    // --- Direct Gemini API (replaces base44.integrations.Core.InvokeLLM) ---
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || '';
    if (!geminiKey) {
      return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500, headers: corsHeaders() });
    }

    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: `Generuj taxonomii pro: ${disciplineName}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API failed (${geminiRes.status}): ${errText}`);
    }

    const geminiJson = await geminiRes.json();
    const textContent = (geminiJson?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');

    let generatedData;
    try { generatedData = JSON.parse(textContent.replace(/```json\n?|```/g, '').trim()); }
    catch { generatedData = { raw: textContent }; }

    return Response.json({ success: true, data: generatedData, model: geminiModel }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Generation error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
});
