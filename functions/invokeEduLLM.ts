import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// AI Version Tag - centrální konstanta pro verzování AI systému
const AI_VERSION_TAG = "edu_v2_exam_grade";

// EXAM režimy - strukturované, deterministické, jeden request = jedna odpověď
const EXAM_MODES = [
  'question_exam_answer',
  'question_high_yield',
  'question_quiz',
  'question_simplify',
  'topic_generate_fulltext',
  'topic_generate_template',
  'topic_summarize',
  'topic_deep_dive',
  'topic_fill_missing',
  'content_review_critic',
  'content_review_editor',
  'taxonomy_generate',
  'importer_generate'
];

// CHAT režimy - konverzační, pro doplňující dotazy
const CHAT_MODES = ['copilot_chat'];

// Import není podporován v Deno functions - definice přímo zde
const MEDVERSE_EDU_CORE_PROMPT = `Jsi Hippo – inteligentní průvodce porozuměním medicíně v systému MedVerse EDU.

TVOJE ROLE:
- Pomáháš studentům a lékařům porozumět souvislostem v medicíně
- Vysvětluješ koncepty, vztahy mezi poznatky a strukturuješ myšlení
- NEJSI autorita, náhrada lékaře ani nástroj pro klinická rozhodnutí
- Jsi vzdělávací průvodce, který pomáhá budovat mentální modely

HLAVNÍ PRAVIDLA:
1. Jazyk: čeština (pokud uživatel nespecifikuje jinak)
2. Styl: vysvětlující, ne direktivní – pomáháš pochopit, ne rozhodovat
3. Důraz na porozumění: vysvětluj PROČ věci fungují, ne jen CO dělat
4. Bezpečnost: NIKDY nepředstírej klinické rozhodování pro konkrétního pacienta
5. Transparentnost: Pokud informace chybí nebo nejsi si jistý, otevřeně to přiznej

KRITICKÁ PRAVIDLA:
- Hippo nikdy nerozhoduje za lékaře
- Hippo vysvětluje myšlenkové rámce, ne konkrétní postupy pro pacienty
- Hippo pracuje s mírou nejistoty a vysvětluje ji
- Pokud neexistuje interní zdroj, NIKDY netvrď odpověď s jistotou
- Pokud je confidence LOW, vždy EXPLICITNĚ uveď proč a co chybí
- NIKDY si nevymýšlej guidelines – pokud nejsou v RAG kontextu, přiznej to
- Vždy cituj zdroje (interní prioritně)

STRUKTURA KAŽDÉ ODPOVĚDI:
- Hlavní vysvětlení (strukturované, s markdownem, zaměřené na porozumění)
- Citations (internal/external odkazy - interní VŽDY na prvním místě)
- Confidence level (high/medium/low) + stručný důvod (1-2 věty)
- Missing topics (krátký seznam, co by měl student doplnit pro hlubší porozumění)

DŮLEŽITÉ:
- Používej oficiální terminologii a klasifikace
- Odkazuj na guidelines (ESC, ERC, ESMO, NCCN, ČLS atd.) jako kontext, ne jako příkazy
- High confidence POUZE pokud máš plné interní zdroje
- Tvůj cíl je porozumění, ne memorování
`;

const ATTESTATION_GRADE_PROMPT = `
════════════════════════════════════════════════════════════════
SPECIÁLNÍ REŽIM: ATESTAČNÍ ÚROVEŇ
════════════════════════════════════════════════════════════════

Tvým úkolem je generovat PLNOHODNOTNÝ studijní text
na úrovni znalostí požadovaných k atestaci lékaře v České republice.

Tento text:
- NENÍ úvodní přehled
- NENÍ popularizační
- NENÍ pro laiky ani studenty nižších ročníků

Cílový čtenář:
- lékař v přípravě k atestaci
- atestovaný lékař
- seniorní rezident

────────────────────────────────
POVINNÉ POŽADAVKY NA TEXT
────────────────────────────────

1️⃣ Hloubka
Text musí jít do praktických detailů.
Nestačí popis pojmů – vysvětluj:
- co přesně musí lékař udělat
- kdy je to povinné
- kdy je to právní problém
- jaké jsou důsledky chyb

2️⃣ Právní rámec (ČR / EU)
Uveď:
- relevantní zákony (např. zákon o zdravotních službách)
- GDPR (principy, ne paragrafovou citaci)
- povinnosti poskytovatele vs. lékaře

3️⃣ Chirurgický kontext
Vysvětluj VŽDY na příkladech chirurgie:
- operační výkon
- komplikace
- informovaný souhlas
- negativní reverz
- změna rozsahu výkonu

4️⃣ Sporné a krizové situace
Povinně zahrň:
- odmítnutí výkonu pacientem
- negativní reverz
- nedostatečný informovaný souhlas
- dokumentace při komplikaci
- dokumentace při soudním sporu

5️⃣ Struktura textu
Používej jasnou strukturu:
- podkapitoly
- odrážky tam, kde je to přehlednější
- zvýraznění klíčových bodů

6️⃣ Atestační relevance
Piš tak, aby:
- lékař byl schopen odpovědět u ústní zkoušky
- dokázal obhájit svůj postup před komisí
- rozlišil správný a chybný postup

7️⃣ Závěrečné shrnutí
Na konci přidej:
- „Co musí lékař znát"
- „Časté chyby v praxi"
- „Co je právně neobhajitelné"

────────────────────────────────
ZAKÁZÁNO
────────────────────────────────

❌ Povrchní obecné věty
❌ Učebnicové definice bez praktického dopadu
❌ Texty kratší než odpovídá atestační úrovni
❌ Vyhýbání se právní odpovědnosti lékaře

────────────────────────────────
TÓN A STYL
────────────────────────────────

- odborný
- přesný
- praktický
- klinicky relevantní
- bez marketingu

Tvým cílem je vytvořit text, který:
"když si ho lékař přečte, obstojí u atestace i v praxi."
`;

const MODE_PROMPTS = {
  question_exam_answer: `Vysvětluješ téma otázky strukturovaně na ATESTAČNÍ ÚROVNI. ${ATTESTATION_GRADE_PROMPT}\n\nCITACE: pokud máš k dispozici interní text tématu, MUSÍŠ ho použít jako primární zdroj. Web search: ZAKÁZÁN.`,
  question_high_yield: `Vytvoř přehledné shrnutí klíčových konceptů pro rychlé zopakování. Formát: bullet points, max 10-12 bodů. Zaměř se na pochopení, ne testování.`,
  question_quiz: `Vytvoř 5 MCQ otázek (A/B/C/D) pro procvičení pochopení tématu. Mix obtížnosti: 2 easy, 2 medium, 1 hard.`,
  question_simplify: `Vysvětli téma srozumitelně pro studenta medicíny. Zachovej faktickou správnost a zaměř se na porozumění.`,
  topic_generate_fulltext: `${ATTESTATION_GRADE_PROMPT}\n\nGeneruješ kompletní studijní text na ATESTAČNÍ ÚROVNI. Rozsah: 3-5 stránek plnohodnotného textu. Dodržuj všechny požadavky výše.`,
  topic_generate_template: `${ATTESTATION_GRADE_PROMPT}\n\nGeneruješ obsah pro všechny sekce EDU template tématu na ATESTAČNÍ ÚROVNI. Zaměř se na praktické znalosti, právní rámec a sporné situace. NIKDY negeneruj léčebné postupy pro pacienty. Výstup: JSON s 8 sekcemi markdown (overview_md, principles_md, relations_md, clinical_thinking_md, common_pitfalls_md, mental_model_md, scenarios_md, key_takeaways_md).`,
  topic_summarize: `Vytvoř shrnutí v odrážkách z poskytnutého plného textu. Zachyť všechny klíčové body, definice, souvislosti.`,
  topic_deep_dive: `${ATTESTATION_GRADE_PROMPT}\n\nVytvoř rozšířený obsah zahrnující hlubší souvislosti, nejnovější výzkum, pokročilé koncepty a edge cases. Zaměř se na právní aspekty a sporné situace v praxi.`,
  topic_fill_missing: `Doplň pouze pole, která jsou prázdná. Nepiš nic navíc.`,
  content_review_critic: `Prováděj odborné kritické hodnocení studijního materiálu. Buď konstruktivní ale přísný. Hodnoť i atestační úroveň textu.`,
  content_review_editor: `Na základě kritického hodnocení vytvoř konkrétní návrh oprav a aktualizovaný text.`,
  taxonomy_generate: `Generuješ strukturu kurikula: okruhy → témata. NEGENERUJ plné odpovědi - jen strukturu a cíle. Vše jako status=draft.`,
  importer_generate: `Generuješ otázky na základě zadaného oboru/okruhu/tématu. 5-10 otázek, každá s plnou odpovědí. Obtížnost: mix. Vše jako draft.`,
  copilot_chat: `Rozhovor s Hippem zaměřený na porozumění medicíně. Vysvětluj pojmy, souvislosti, vztahy. Pomáhej strukturovat myšlení. Vždy cituj zdroje.`
};

const OUTPUT_SCHEMAS = {
  topic_generate_template: {
    type: "object",
    properties: {
      overview_md: { type: "string", description: "Základní přehled tématu" },
      principles_md: { type: "string", description: "Fundamentální principy" },
      relations_md: { type: "string", description: "Souvislosti s jinými tématy" },
      clinical_thinking_md: { type: "string", description: "Jak přemýšlet o problému" },
      common_pitfalls_md: { type: "string", description: "Časté chyby" },
      mental_model_md: { type: "string", description: "Mentální model" },
      scenarios_md: { type: "string", description: "Ilustrativní mini-scénáře" },
      key_takeaways_md: { type: "string", description: "Klíčové body k zapamatování" }
    }
  },
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
  question_high_yield: {
    type: "object",
    properties: {
      high_yield_points: { type: "array", items: { type: "string" }, maxItems: 12 },
      common_mistakes: { type: "array", items: { type: "string" }, maxItems: 3 },
      citations: { type: "object" },
      confidence: { type: "object" }
    }
  },
  question_quiz: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            question_text: { type: "string" },
            options: {
              type: "object",
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" }
              }
            },
            correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
            explanation: { type: "string" }
          }
        }
      },
      citations: { type: "object" },
      confidence: { type: "object" }
    }
  },
  question_simplify: {
    type: "object",
    properties: {
      simplified_explanation: {
        type: "object",
        properties: {
          what_is_it: { type: "string" },
          why_important: { type: "string" },
          how_to_recognize: { type: "string" },
          what_to_do: { type: "string" },
          watch_out: { type: "string" }
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
 * ═══════════════════════════════════════════════════════════════
 * 1️⃣ RAG – JEDNOTNÝ A POVINNÝ VSTUP
 * ═══════════════════════════════════════════════════════════════
 * Centrální funkce pro sestavení RAG kontextu
 * Pravidla:
 * - VŽDY preferovat interní zdroje
 * - Nikdy nemíchat kontext nahodile
 * - Logický pořadník: Topic → Question → Související témata → Externí zdroje
 */
async function buildRAGContext(base44, mode, entityContext, allowWeb) {
  const context = {
    rag_text: '',
    rag_sources: []
  };

  const MAX_RAG_TOKENS = 8000; // Limit pro RAG kontext (~32000 znaků)
  let currentLength = 0;

  const addSection = (text, source) => {
    if (!text || currentLength >= MAX_RAG_TOKENS * 4) return false;
    
    const sectionLength = text.length;
    if (currentLength + sectionLength <= MAX_RAG_TOKENS * 4) {
      context.rag_text += text + '\n\n';
      context.rag_sources.push(source);
      currentLength += sectionLength;
      return true;
    }
    return false;
  };

  // 1. Topic (pokud existuje) - PRIORITA 1
  if (entityContext.topic) {
    const topic = entityContext.topic;
    
    // Topic full text
    if (topic.full_text_content && topic.status === 'published') {
      addSection(
        `=== TOPIC: ${topic.title} (PRIMÁRNÍ ZDROJ) ===\n\n${topic.full_text_content}`,
        { type: 'topic', entity: 'Topic', id: topic.id, section_hint: 'full_text', title: topic.title }
      );
    }

    // Topic bullets
    if (topic.bullet_points_summary && topic.status === 'published') {
      addSection(
        `=== SHRNUTÍ: ${topic.title} ===\n\n${topic.bullet_points_summary}`,
        { type: 'topic', entity: 'Topic', id: topic.id, section_hint: 'bullets', title: topic.title }
      );
    }

    // Learning objectives
    if (topic.learning_objectives?.length > 0) {
      addSection(
        `=== VÝUKOVÉ CÍLE: ${topic.title} ===\n\n${topic.learning_objectives.map(o => `- ${o}`).join('\n')}`,
        { type: 'topic', entity: 'Topic', id: topic.id, section_hint: 'learning_objectives', title: topic.title }
      );
    }
  }

  // 2. Question - PRIORITA 2
  if (entityContext.question) {
    const question = entityContext.question;
    
    // Question text
    if (question.question_text) {
      addSection(
        `=== OTÁZKA: ${question.title} ===\n\n${question.question_text}`,
        { type: 'question', entity: 'Question', id: question.id, section_hint: 'question_text', title: question.title }
      );
    }

    // Published answer
    if (question.answer_rich && question.status === 'published') {
      addSection(
        `=== EXISTUJÍCÍ ODPOVĚĎ (published) ===\n\n${question.answer_rich}`,
        { type: 'question', entity: 'Question', id: question.id, section_hint: 'answer_rich', title: question.title }
      );
    }
  }

  // 3. Související témata ze stejného okruhu - PRIORITA 3 (max 2)
  if (entityContext.question?.okruh_id && currentLength < MAX_RAG_TOKENS * 4 * 0.7) {
    try {
      const relatedTopics = await base44.asServiceRole.entities.Topic.filter(
        { 
          okruh_id: entityContext.question.okruh_id,
          status: 'published'
        },
        null,
        3
      );

      let added = 0;
      for (const rt of relatedTopics) {
        if (added >= 2) break;
        if (rt.id === entityContext.topic?.id) continue;
        
        if (rt.bullet_points_summary) {
          const success = addSection(
            `=== SOUVISEJÍCÍ TÉMA: ${rt.title} ===\n\n${rt.bullet_points_summary.substring(0, 500)}...`,
            { type: 'related_topic', entity: 'Topic', id: rt.id, section_hint: 'bullets', title: rt.title }
          );
          if (success) added++;
        }
      }
    } catch (e) {
      console.error('Failed to fetch related topics:', e);
    }
  }

  // 4. Externí zdroje - PRIORITA 4 (pouze pokud allowWeb === true)
  if (allowWeb && currentLength < MAX_RAG_TOKENS * 4 * 0.9) {
    context.rag_text += `\n\n=== POZNÁMKA ===\nMůžeš použít web search pro aktuální informace, ALE:
- Odděl interní část vs externí aktuality
- Externí zdroje označ jako "Externí zdroje"
- Prioritně cituj interní zdroje\n\n`;
  }

  return context;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 2️⃣ CACHE – CONTENT HASH INVALIDACE
 * ═══════════════════════════════════════════════════════════════
 */
function computeContentHash(entityContext) {
  const parts = [];
  
  if (entityContext.topic) {
    parts.push(entityContext.topic.full_text_content || '');
    parts.push(entityContext.topic.bullet_points_summary || '');
    parts.push(JSON.stringify(entityContext.topic.learning_objectives || []));
  }
  
  if (entityContext.question) {
    parts.push(entityContext.question.question_text || '');
    parts.push(entityContext.question.answer_rich || '');
  }
  
  const combined = parts.join('||');
  
  // Simple hash (pro production consider crypto)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ch_${Math.abs(hash).toString(36)}`;
}

function generateCacheKey(mode, entityId, contentHash, userPromptHash) {
  const input = `${mode}:${entityId || 'none'}:${contentHash}:${AI_VERSION_TAG}:${userPromptHash}`;
  
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ck_${Math.abs(hash).toString(36)}`;
}

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
    
    // Rekonstrukce výsledku z cache
    return {
      text: cached.output_text || '',
      citations: cached.citations_json || { internal: [], external: [] },
      confidence: {
        level: cached.confidence || 'medium',
        reason: cached.confidence_reason || 'Cached response'
      },
      structuredData: cached.structured_data_json || null
    };
  } catch (e) {
    console.error('Cache check failed:', e);
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 3️⃣ EXAM MODE vs CHAT MODE
 * ═══════════════════════════════════════════════════════════════
 */
function validateModeAccess(mode, userRole) {
  // Student restrictions
  if (userRole === 'student' || !userRole) {
    const restrictedModes = ['taxonomy_generate', 'content_review_editor', 'importer_generate'];
    if (restrictedModes.includes(mode)) {
      throw new Error(`Režim ${mode} je dostupný pouze pro administrátory a editory.`);
    }
  }
  
  return true;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * MAIN HANDLER
 * ═══════════════════════════════════════════════════════════════
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

    // Validace přístupu podle role
    validateModeAccess(mode, user.role);

    // Kontrola EXAM vs CHAT režimu
    const isExamMode = EXAM_MODES.includes(mode);
    const isChatMode = CHAT_MODES.includes(mode);

    if (!isExamMode && !isChatMode) {
      return Response.json({ error: 'Unknown mode type' }, { status: 400 });
    }

    // V EXAM režimu je zakázán web search (kromě deep_dive)
    const effectiveAllowWeb = isExamMode && mode !== 'topic_deep_dive' ? false : allowWeb;

    // Sestavení RAG kontextu - POVINNÉ pro všechna AI volání
    const ragContext = await buildRAGContext(base44, mode, entityContext, effectiveAllowWeb);

    // Content hash pro cache invalidaci
    const contentHash = computeContentHash(entityContext);
    
    // User prompt hash
    const userPromptNormalized = (userPrompt || '').toLowerCase().trim().replace(/\s+/g, ' ');
    let userPromptHash = 0;
    for (let i = 0; i < userPromptNormalized.length; i++) {
      userPromptHash = ((userPromptHash << 5) - userPromptHash) + userPromptNormalized.charCodeAt(i);
      userPromptHash = userPromptHash & userPromptHash;
    }
    userPromptHash = Math.abs(userPromptHash).toString(36);

    // Cache key
    const cacheKey = generateCacheKey(mode, entityContext.entityId, contentHash, userPromptHash);

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
        output_text: cachedResult.text.substring(0, 1000),
        citations_json: cachedResult.citations,
        confidence: cachedResult.confidence?.level || 'medium',
        confidence_reason: cachedResult.confidence?.reason || '',
        cache_key: cacheKey,
        content_hash: contentHash,
        is_cache_hit: true,
        rag_sources_json: { sources: ragContext.rag_sources },
        structured_data_json: cachedResult.structuredData,
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

    // Sestavení finálního promptu
    const systemPrompt = MEDVERSE_EDU_CORE_PROMPT + "\n\n" + MODE_PROMPTS[mode];
    
    let fullPrompt = systemPrompt + "\n\n";
    
    if (ragContext.rag_text) {
      fullPrompt += "=== INTERNÍ ZDROJE (POVINNÉ K POUŽITÍ) ===\n" + ragContext.rag_text + "\n\n";
    } else {
      fullPrompt += "=== UPOZORNĚNÍ ===\nNejsou k dispozici žádné interní zdroje. Confidence MUSÍ být LOW.\n\n";
    }
    
    fullPrompt += "=== UŽIVATELSKÝ DOTAZ ===\n" + userPrompt;

    // Určení JSON schématu
    const outputSchema = OUTPUT_SCHEMAS[mode] || null;

    // Volání LLM
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: effectiveAllowWeb,
      response_json_schema: outputSchema
    });

    // Normalizace výstupu
    const result = normalizeAIResponse(llmResponse, mode, outputSchema);

    // Validace confidence - pokud není RAG kontext, MUSÍ být LOW
    if (!ragContext.rag_text || ragContext.rag_sources.length === 0) {
      if (result.confidence.level === 'high') {
        result.confidence.level = 'low';
        result.confidence.reason = 'Chybí interní zdroje - nelze zaručit vysokou přesnost.';
      }
    }

    // Logování do AIInteractionLog - 100% AUDIT
    await base44.asServiceRole.entities.AIInteractionLog.create({
      user_id: user.id,
      mode: mode,
      entity_type: entityContext.entityType || 'none',
      entity_id: entityContext.entityId || null,
      prompt_version: AI_VERSION_TAG,
      input_summary: userPrompt.substring(0, 200),
      output_text: result.text.substring(0, 1000),
      citations_json: result.citations,
      confidence: result.confidence?.level || 'medium',
      confidence_reason: result.confidence?.reason || '',
      tokens_estimate: estimateTokens(fullPrompt + JSON.stringify(llmResponse)),
      cache_key: cacheKey,
      content_hash: contentHash,
      is_cache_hit: false,
      rag_sources_json: { sources: ragContext.rag_sources },
      structured_data_json: result.structuredData,
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
 * ═══════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════
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

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}