import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// AI Version Tag - centrální konstanta pro verzování AI systému
const AI_VERSION_TAG = "edu_v1";

// Import není podporován v Deno functions - definice přímo zde
const MEDVERSE_EDU_CORE_PROMPT = `Jsi AI asistent pro lékařskou edukaci v systému MedVerse EDU.

HLAVNÍ PRAVIDLA:
1. Jazyk: čeština (pokud uživatel nespecifikuje jinak)
2. Styl: precizní, zkouškový, strukturovaný, stručné nadpisy, žádné "storytelling"
3. Bezpečnost: pokud uživatel zadá osobní data pacienta nebo žádá klinické rozhodování pro konkrétního pacienta, odpověz edukativně obecně a doporuč konzultaci se školeným lékařem
4. Důraz na interní kurikulum: pokud je k dispozici interní text z témat, MUSÍŠ ho primárně používat a citovat
5. Pokud nejsou zdroje: přiznej nejistotu (confidence low) a navrhni doplnění zdrojů / otázky

STRUKTURA KAŽDÉ ODPOVĚDI:
- Hlavní odpověď (strukturovaná, s markdownem)
- Citations (internal/external odkazy)
- Confidence level (high/medium/low) + stručný důvod (1-2 věty)
- Missing topics (krátký seznam, co by měl student doplnit)

DŮLEŽITÉ:
- Při atestačních otázkách VŽDY cituj zdroje
- Nehalucinuj - pokud nevíš, řekni to
- Používaj oficiální terminologii a klasifikace
- Pro medicínské postupy se řiď guidelines (ESC, ERC, ESMO, NCCN, ČLS atd.)
`;

const MODE_PROMPTS = {
  question_exam_answer: `Odpovídáš na atestační otázku. Výstup MUSÍ být strukturovaný. CITACE: pokud máš k dispozici interní text tématu, MUSÍŠ ho použít jako primární zdroj. Web search: ZAKÁZÁN.`,
  question_high_yield: `Vytvoř HIGH-YIELD shrnutí - klíčové body pro rychlé opakování před zkouškou. Formát: bullet points, max 10-12 bodů.`,
  question_quiz: `Vytvoř 5 MCQ otázek (A/B/C/D) testujících pochopení tématu. Mix obtížnosti: 2 easy, 2 medium, 1 hard.`,
  question_simplify: `Zjednoduš téma pro studenta medicíny. Zachovej faktickou správnost.`,
  topic_generate_fulltext: `Generuješ kompletní studijní text pro atestační přípravu. Rozsah: 2-4 stránky textu. Styl: učebnicový, ale srozumitelný.`,
  topic_summarize: `Vytvoř shrnutí v odrážkách z poskytnutého plného textu. Zachyť všechny klíčové body, definice, postupy.`,
  topic_deep_dive: `Vytvoř rozšířený obsah zahrnující nejnovější výzkum, pokročilé koncepty, komplikace a edge cases.`,
  content_review_critic: `Prováděj odborné kritické hodnocení studijního materiálu. Buď konstruktivní ale přísný.`,
  content_review_editor: `Na základě kritického hodnocení vytvoř konkrétní návrh oprav a aktualizovaný text.`,
  taxonomy_generate: `Generuješ strukturu kurikula: okruhy → témata. NEGENERUJ plné odpovědi - jen strukturu a cíle. Vše jako status=draft.`,
  importer_generate: `Generuješ otázky na základě zadaného oboru/okruhu/tématu. 5-10 otázek, každá s plnou odpovědí. Obtížnost: mix. Vše jako draft.`,
  copilot_chat: `Volný chat s fokusem na studium medicíny. Můžeš: vysvětlovat, vytvářet poznámky, odpovídat na otázky. Vždy cituj zdroje.`
};

const OUTPUT_SCHEMAS = {
  question_exam_answer: {
    type: "object",
    properties: {
      answer_md: { type: "string" },
      structure: {
        type: "object",
        properties: {
          definice: { type: "string" },
          etiologie_klasifikace: { type: "string" },
          diagnostika: { type: "string" },
          lecba: { type: "string" },
          komplikace: { type: "string" },
          chyby: { type: "string" },
          kontrolni_otazky: { type: "array", items: { type: "string" } }
        }
      },
      citations: { type: "object" },
      confidence: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" }
        }
      },
      missing_topics: { type: "array", items: { type: "string" } }
    }
  },
  question_quiz: {
    type: "object",
    properties: {
      mcq: {
        type: "array",
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correct_index: { type: "number" },
            explanation: { type: "string" }
          }
        }
      },
      citations: { type: "object" },
      confidence: { type: "object" }
    }
  },
  content_review_critic: {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 10 },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      missing_topics: { type: "array", items: { type: "string" } },
      factual_risks: { type: "array", items: { type: "string" } },
      suggested_improvements: { type: "array", items: { type: "string" } }
    }
  }
};

/**
 * Centrální wrapper pro všechna AI volání v MedVerse EDU
 * 
 * @param {Object} params
 * @param {string} params.mode - AI režim (question_exam_answer, topic_generate_fulltext, atd.)
 * @param {Object} params.entityContext - Kontext z DB (topic, question, okruh, obor)
 * @param {string} params.userPrompt - Prompt od uživatele
 * @param {boolean} params.allowWeb - Povolit web search (default false)
 * @returns {Object} {text, citations, confidence, structuredData, mode, cache}
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode, entityContext = {}, userPrompt, allowWeb = false } = await req.json();

    if (!mode || !MODE_PROMPTS[mode]) {
      return Response.json({ 
        error: 'Invalid mode', 
        validModes: Object.keys(MODE_PROMPTS) 
      }, { status: 400 });
    }

    // Sestavení cache key
    const cacheKey = await generateCacheKey(mode, entityContext.entityId, userPrompt);

    // Pokus o cache hit
    const cachedResult = await checkCache(base44, cacheKey, mode, entityContext);
    if (cachedResult) {
      // Log cache hit
      await base44.asServiceRole.entities.AIInteractionLog.create({
        user_id: user.id,
        mode: mode,
        entity_type: entityContext.entityType || 'none',
        entity_id: entityContext.entityId || null,
        prompt_version: AI_VERSION_TAG,
        input_summary: userPrompt.substring(0, 200),
        output_text: cachedResult.text.substring(0, 500),
        citations_json: cachedResult.citations,
        confidence: cachedResult.confidence?.level || 'medium',
        confidence_reason: cachedResult.confidence?.reason || '',
        cache_key: cacheKey,
        is_cache_hit: true,
        success: true,
        duration_ms: Date.now() - startTime
      });

      return Response.json({
        text: cachedResult.text,
        citations: cachedResult.citations,
        confidence: cachedResult.confidence,
        structuredData: cachedResult.structuredData,
        mode: mode,
        cache: { hit: true, key: cacheKey }
      });
    }

    // Sestavení retrieval contextu (RAG)
    const retrievalContext = await buildRetrievalContext(base44, mode, entityContext);

    // Sestavení finálního promptu
    const systemPrompt = MEDVERSE_EDU_CORE_PROMPT + "\n\n" + MODE_PROMPTS[mode];
    
    let fullPrompt = systemPrompt + "\n\n";
    
    if (retrievalContext.internal) {
      fullPrompt += "=== INTERNÍ ZDROJE (POVINNÉ K POUŽITÍ) ===\n" + retrievalContext.internal + "\n\n";
    }
    
    fullPrompt += "=== UŽIVATELSKÝ DOTAZ ===\n" + userPrompt;

    // Určení JSON schématu
    const outputSchema = OUTPUT_SCHEMAS[mode] || null;

    // Volání LLM
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: allowWeb,
      response_json_schema: outputSchema
    });

    // Normalizace výstupu
    const result = normalizeAIResponse(llmResponse, mode, outputSchema);

    // Logování do AI_Interaction_Log
    await base44.asServiceRole.entities.AIInteractionLog.create({
      user_id: user.id,
      mode: mode,
      entity_type: entityContext.entityType || 'none',
      entity_id: entityContext.entityId || null,
      prompt_version: AI_VERSION_TAG,
      input_summary: userPrompt.substring(0, 200),
      output_text: result.text.substring(0, 500),
      citations_json: result.citations,
      confidence: result.confidence?.level || 'medium',
      confidence_reason: result.confidence?.reason || '',
      tokens_estimate: estimateTokens(fullPrompt + JSON.stringify(llmResponse)),
      cache_key: cacheKey,
      is_cache_hit: false,
      success: true,
      duration_ms: Date.now() - startTime
    });

    return Response.json({
      text: result.text,
      citations: result.citations,
      confidence: result.confidence,
      structuredData: result.structuredData,
      mode: mode,
      cache: { hit: false, key: cacheKey }
    });

  } catch (error) {
    console.error('invokeEduLLM error:', error);
    
    // Normalized error response
    const errorResult = {
      text: `⚠️ Chyba při volání AI: ${error.message}`,
      citations: { internal: [], external: [] },
      confidence: { level: 'low', reason: 'Volání selhalo' },
      structuredData: null,
      mode: 'unknown',
      cache: { hit: false }
    };

    // Log error
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      if (user) {
        const payload = await req.json().catch(() => ({}));
        await base44.asServiceRole.entities.AIInteractionLog.create({
          user_id: user.id,
          mode: payload.mode || 'unknown',
          entity_type: payload.entityContext?.entityType || 'none',
          entity_id: payload.entityContext?.entityId || null,
          prompt_version: AI_VERSION_TAG,
          input_summary: (payload.userPrompt || 'Error occurred').substring(0, 200),
          output_text: errorResult.text,
          success: false,
          error_text: error.message,
          duration_ms: Date.now() - startTime
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return Response.json(errorResult);
  }
});

/**
 * Sestaví retrieval kontext podle režimu a entity
 */
async function buildRetrievalContext(base44, mode, entityContext) {
  const context = { internal: '', external: '' };

  // Pro question režimy - vezmi Topic a související témata
  if (mode.startsWith('question_')) {
    if (entityContext.question) {
      const question = entityContext.question;
      
      // Primární topic
      if (question.topic_id || question.linked_topic_id) {
        const topicId = question.topic_id || question.linked_topic_id;
        try {
          const topic = await base44.asServiceRole.entities.Topic.get(topicId);
          if (topic) {
            context.internal += `\n### Hlavní téma: ${topic.title}\n\n`;
            if (topic.full_text_content) {
              context.internal += `${topic.full_text_content}\n\n`;
            }
            if (topic.bullet_points_summary) {
              context.internal += `**Shrnutí:**\n${topic.bullet_points_summary}\n\n`;
            }
            if (topic.learning_objectives?.length > 0) {
              context.internal += `**Výukové cíle:**\n${topic.learning_objectives.map(o => `- ${o}`).join('\n')}\n\n`;
            }
          }
        } catch (err) {
          console.error('Failed to fetch topic:', err);
        }
      }

      // Související témata ze stejného okruhu (max 2)
      if (question.okruh_id) {
        try {
          const relatedTopics = await base44.asServiceRole.entities.Topic.filter(
            { okruh_id: question.okruh_id },
            null,
            3
          );
          if (relatedTopics.length > 0) {
            context.internal += `\n### Související témata z okruhu:\n\n`;
            for (const rt of relatedTopics.slice(0, 2)) {
              if (rt.id !== (question.topic_id || question.linked_topic_id)) {
                context.internal += `**${rt.title}**\n`;
                if (rt.bullet_points_summary) {
                  context.internal += `${rt.bullet_points_summary.substring(0, 300)}...\n\n`;
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch related topics:', err);
        }
      }

      // Existující odpověď (pokud existuje)
      if (question.answer_rich) {
        context.internal += `\n### Existující odpověď (pro referenci):\n${question.answer_rich}\n\n`;
      }
    }
  }

  // Pro topic režimy
  if (mode.startsWith('topic_')) {
    if (entityContext.topic) {
      const topic = entityContext.topic;
      
      if (mode === 'topic_summarize' && topic.full_text_content) {
        context.internal += `### Plný text k sumarizaci:\n\n${topic.full_text_content}\n\n`;
      }
      
      if (mode === 'topic_deep_dive') {
        if (topic.full_text_content) {
          context.internal += `### Základní text:\n\n${topic.full_text_content}\n\n`;
        }
        if (topic.bullet_points_summary) {
          context.internal += `### Shrnutí:\n\n${topic.bullet_points_summary}\n\n`;
        }
      }

      // Související témata z okruhu
      if (topic.okruh_id) {
        try {
          const relatedTopics = await base44.asServiceRole.entities.Topic.filter(
            { okruh_id: topic.okruh_id },
            null,
            3
          );
          if (relatedTopics.length > 0) {
            context.internal += `\n### Kontext z okruhu:\n`;
            for (const rt of relatedTopics) {
              if (rt.id !== topic.id && rt.title) {
                context.internal += `- ${rt.title}\n`;
              }
            }
            context.internal += '\n';
          }
        } catch (err) {
          console.error('Failed to fetch related topics:', err);
        }
      }
    }
  }

  return context;
}

/**
 * Generuje cache key pro request
 */
async function generateCacheKey(mode, entityId, userPrompt) {
  const normalized = (userPrompt || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const input = `${mode}:${entityId || 'none'}:${AI_VERSION_TAG}:${normalized}`;
  
  // Simple hash (pro production use crypto)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cache_${Math.abs(hash).toString(36)}`;
}

/**
 * Zkontroluje cache pro daný request
 */
async function checkCache(base44, cacheKey, mode, entityContext) {
  try {
    const logs = await base44.asServiceRole.entities.AIInteractionLog.filter(
      { 
        cache_key: cacheKey,
        mode: mode,
        success: true
      },
      '-created_date',
      1
    );

    if (!logs || logs.length === 0) return null;

    const cached = logs[0];

    // Zkontroluj, zda entity nebyla změněna
    if (entityContext.entityId && entityContext.entityType) {
      try {
        const EntityClass = entityContext.entityType === 'question' ? 'Question' 
          : entityContext.entityType === 'topic' ? 'Topic' 
          : null;
        
        if (EntityClass) {
          const entity = await base44.asServiceRole.entities[EntityClass].get(entityContext.entityId);
          const entityUpdated = new Date(entity.updated_date);
          const cacheCreated = new Date(cached.created_date);
          
          if (entityUpdated > cacheCreated) {
            return null; // Entity změněna, cache neplatná
          }
        }
      } catch (e) {
        console.warn('Failed to check entity freshness:', e);
        return null;
      }
    }

    // Rekonstrukce výsledku z cache
    return {
      text: cached.output_text || '',
      citations: cached.citations_json || { internal: [], external: [] },
      confidence: {
        level: cached.confidence || 'medium',
        reason: cached.confidence_reason || 'Cached response'
      },
      structuredData: null // Cache neobsahuje structured data pro zjednodušení
    };
  } catch (e) {
    console.error('Cache check failed:', e);
    return null;
  }
}

/**
 * Normalizuje AI odpověď do jednotného tvaru
 */
function normalizeAIResponse(llmResponse, mode, outputSchema) {
  const parsed = (outputSchema && typeof llmResponse === 'object') ? llmResponse : null;
  const rawText = typeof llmResponse === 'string' ? llmResponse : null;

  // 1. TEXT - prioritizovaná extrakce
  let text = '';
  if (parsed) {
    text = parsed.answer_md 
      || parsed.answer_text 
      || parsed.output_text 
      || parsed.content 
      || '';
    
    // Speciální handling pro question_quiz
    if (mode === 'question_quiz' && !text && parsed.questions) {
      text = generateQuizMarkdown(parsed.questions);
    }
    
    // Speciální handling pro question_high_yield
    if (mode === 'question_high_yield' && !text && parsed.high_yield_points) {
      text = generateHighYieldMarkdown(parsed.high_yield_points, parsed.common_mistakes);
    }

    // Speciální handling pro question_simplify
    if (mode === 'question_simplify' && !text && parsed.simplified_explanation) {
      text = generateSimplifiedMarkdown(parsed.simplified_explanation);
    }

    // Fallback: generuj text ze structure
    if (!text && parsed.structure) {
      text = generateStructuredAnswerMarkdown(parsed.structure);
    }
  }
  
  if (!text && rawText) {
    text = rawText;
  }
  
  if (!text) {
    text = JSON.stringify(llmResponse || {});
  }

  // 2. CITATIONS - prioritizovaná extrakce
  const citations = parsed?.citations 
    || parsed?.citations_json 
    || llmResponse?.citations 
    || llmResponse?.citations_json 
    || { internal: [], external: [] };

  // 3. CONFIDENCE - prioritizovaná extrakce
  const confidence = parsed?.confidence 
    || parsed?.confidence_json 
    || llmResponse?.confidence 
    || llmResponse?.confidence_json 
    || { level: 'medium', reason: 'Standardní odpověď' };

  // 4. STRUCTURED DATA
  const structuredData = parsed || null;

  return {
    text,
    citations,
    confidence,
    structuredData
  };
}

/**
 * Generuje markdown z MCQ otázek
 */
function generateQuizMarkdown(questions) {
  if (!Array.isArray(questions)) return '';
  
  return questions.map((q, idx) => {
    const opts = q.options || {};
    const lines = [
      `**${idx + 1}. ${q.question_text || 'Otázka'}**`,
      ``,
      `- A) ${opts.A || ''}`,
      `- B) ${opts.B || ''}`,
      `- C) ${opts.C || ''}`,
      `- D) ${opts.D || ''}`,
      ``,
      `✅ **Správně:** ${q.correct_answer || '?'}`,
      ``,
      `*Vysvětlení:* ${q.explanation || ''}`,
      ``
    ];
    return lines.join('\n');
  }).join('\n---\n\n');
}

/**
 * Generuje markdown z high-yield bodů
 */
function generateHighYieldMarkdown(points, mistakes) {
  let md = '## High-Yield Body\n\n';
  
  if (Array.isArray(points)) {
    points.forEach(p => {
      md += `- ${p}\n`;
    });
  }
  
  if (Array.isArray(mistakes) && mistakes.length > 0) {
    md += '\n## Časté Chyby\n\n';
    mistakes.forEach(m => {
      md += `- ⚠️ ${m}\n`;
    });
  }
  
  return md;
}

/**
 * Generuje markdown ze zjednodušeného vysvětlení
 */
function generateSimplifiedMarkdown(simplified) {
  if (!simplified || typeof simplified !== 'object') return '';
  
  return [
    '## Co to je',
    simplified.what_is_it || '',
    '',
    '## Proč je to důležité',
    simplified.why_important || '',
    '',
    '## Jak to poznám',
    simplified.how_to_recognize || '',
    '',
    '## Co se s tím dělá',
    simplified.what_to_do || '',
    '',
    '## Na co si dát pozor',
    simplified.watch_out || ''
  ].join('\n');
}

/**
 * Generuje markdown ze strukturované odpovědi
 */
function generateStructuredAnswerMarkdown(structure) {
  if (!structure || typeof structure !== 'object') return '';
  
  const sections = [];
  
  if (structure.definice) {
    sections.push(`## Definice\n\n${structure.definice}`);
  }
  if (structure.etiologie_klasifikace) {
    sections.push(`## Etiologie a Klasifikace\n\n${structure.etiologie_klasifikace}`);
  }
  if (structure.diagnostika) {
    sections.push(`## Diagnostika\n\n${structure.diagnostika}`);
  }
  if (structure.lecba) {
    sections.push(`## Léčba\n\n${structure.lecba}`);
  }
  if (structure.komplikace) {
    sections.push(`## Komplikace\n\n${structure.komplikace}`);
  }
  if (structure.chyby) {
    sections.push(`## Časté Chyby\n\n${structure.chyby}`);
  }
  if (Array.isArray(structure.kontrolni_otazky) && structure.kontrolni_otazky.length > 0) {
    sections.push(`## Kontrolní Otázky\n\n${structure.kontrolni_otazky.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
  }
  
  return sections.join('\n\n');
}

/**
 * Odhadne počet tokenů (hrubý odhad)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}