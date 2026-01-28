import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// AI Version Tag - centrální konstanta pro verzování AI systému
const AI_VERSION_TAG = "medverse_gemini_1.5_pro_v3";

// Strict Mode kontrola
const AI_STRICT_MODE = Deno.env.get("AI_STRICT_MODE") === "true";

// Base instruction pro všechny asistenty
const BASE_MEDVERSE_INSTRUCTION = `Jsi inteligentní AI asistent v systému MedVerse EDU.

KRITICKÁ PRAVIDLA:
- Jazyk: čeština (pokud uživatel nespecifikuje jinak)
- Bezpečnost: NIKDY nepředstírej klinické rozhodování pro konkrétního pacienta
- Transparentnost: Pokud informace chybí, přiznej to
- NIKDY si nevymýšlej guidelines – pokud nejsou v RAG kontextu, přiznej to
- Vždy cituj zdroje (interní prioritně)
${AI_STRICT_MODE ? `
⚠️ STRICT MODE AKTIVNÍ ⚠️
- ABSOLUTNÍ ZÁKAZ spekulativních odpovědí
- POVINNÁ citace u KAŽDÉHO medicínského faktu
- Confidence NESMÍ být 'high' bez interních zdrojů
- ZAKÁZÁNO generovat léčebné protokoly bez RAG kontextu
- Při jakékoli nejistotě: "Nemám dostatečné informace"
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIERARCHIE ASISTENTŮ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Hippo (Sidebar)**: Seniorní mentor, propojuje obory, ptá se na souvislosti. Má přístup k celé taxonomii, zaměřuje se na porozumění PROČ a budování mentálních modelů.

**Floating Copilot (Corner)**: Operativní pomocník, stručný (max 2 věty), reaguje na current_page_context. Poskytuje rychlé tipy relevantní k aktuální činnosti uživatele.

**Clinical Expert (Tools)**: Přísný diagnostik, generuje tabulky diferenciální diagnózy s pravděpodobností. Strukturovaný, analytický, bez zbytečných slov.
`;

// Role-specific appendices pro různé asistenty
const ASSISTANT_ROLE_APPENDICES = {
  hippo_sidebar: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASISTENT: Hippo (Seniorní Mentor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jsi Hippo, seniorní mentor. Tvým cílem je propojovat medicínské obory. Používej analogie a ptej se uživatele na souvislosti.

Tón: Povzbuzující, přátelský, trpělivý
Styl: Vysvětlující, propojující koncepty napříč obory

TVOJE SÍLA:
- Propojuješ zdánlivě nesouvisející témata (např. jak kardiologie souvisí s nefrologií)
- Máš přístup k celé taxonomii oborů
- Pomáháš budovat mentální modely a porozumění PROČ, ne jen CO

STRUKTURA ODPOVĚDI:
- Hlavní vysvětlení (strukturované, s markdownem)
- Citations (internal/external - interní VŽDY na prvním místě)
- Confidence level (high/medium/low) + důvod
- Missing topics (co by měl student doplnit pro hlubší porozumění)
`,
  floating_copilot: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASISTENT: Operativní Asistent (Context Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jsi operativní asistent. Tvým zdrojem je current_page_context. Buď stručný, odpovídej maximálně ve 2-3 větách. Pomáhej s navigací a rychlým vysvětlením termínů na obrazovce.

Tón: Stručný, věcný, efektivní
Styl: Nápomocný v konkrétní situaci

POVINNÉ POUŽITÍ KONTEXTU:
- VŽDY analyzuj 'current_page_context' - to je tvůj hlavní zdroj informací
- Na stránce studijního materiálu: nabízej tipy k učení, související témata
- Na stránce Logbook: pomáhej s vyplněním, navrhuj kategorie
- Na admin stránkách: navrhuj strukturu obsahu, chybějící prvky

MAXIMUM: 2-3 věty na odpověď (pokud uživatel nežádá víc)
`,
  clinical_expert: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASISTENT: Clinical Expert (Tool Mode - Strict Medical)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jsi přísný diagnostik. Pro differential_diagnosis generuj tabulku s pravděpodobností, patofyziologickým zdůvodněním a doporučeným 'next step' vyšetřením. Nepoužívej vatu.

Tón: Velmi věcný, analytický, strukturovaný
Styl: Fakta a pravděpodobnosti, žádné "povídání"

ZÁKAZY:
❌ Úvodní fráze typu "Rád ti pomůžu"
❌ Emotikony, povzbuzování
❌ Vágní odpovědi

POVINNOSTI:
✅ Strukturovaný výstup (tabulky, hierarchie)
✅ Pravděpodobnosti v % (kde možné)
✅ Konkrétní next step vyšetření
✅ Patofyziologické zdůvodnění pro každou diagnózu
✅ Citace zdrojů
`
};

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
  'topic_generate_fulltext_v2',
  'topic_generate_high_yield',
  'topic_generate_deep_dive',
  'topic_fill_missing',
  'content_review_critic',
  'content_review_editor',
  'taxonomy_generate',
  'importer_generate',
  'topic_improve_missing',
  'topic_legal_deepen',
  'topic_clinical_examples',
  'topic_exam_refinement',
  'topic_reformat'
];

// CHAT režimy - konverzační, pro doplňující dotazy
const CHAT_MODES = ['copilot_chat', 'floating_copilot_chat'];

// TOOL režimy - klinické nástroje (DDx, Treatment Planning)
const TOOL_MODES = ['differential_diagnosis_ai', 'treatment_planner_ai'];
const ALLOW_WEB_MODES = new Set(['topic_deep_dive', 'topic_generate_deep_dive', 'topic_legal_deepen']);

const MAX_TOKENS_BY_MODE = {
  topic_generate_fulltext: 4096,
  topic_generate_template: 4096,
  topic_deep_dive: 4096,
  topic_generate_fulltext_v2: 4096,
  topic_generate_deep_dive: 4096,
  question_exam_answer: 2048,
  question_quiz: 1024,
  question_high_yield: 1024,
  question_simplify: 1024,
  topic_summarize: 1024,
  copilot_chat: 1024,
  floating_copilot_chat: 512,
  differential_diagnosis_ai: 1024,
  treatment_planner_ai: 1024
};

// Starý MEDVERSE_EDU_CORE_PROMPT byl nahrazen modulárním systémem:
// BASE_MEDVERSE_INSTRUCTION + ASSISTANT_ROLE_APPENDICES
// Tento komentář ponecháváme pro historii změn.

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
  // Tool modes - Clinical Expert
  differential_diagnosis_ai: `Generuješ diferenciální diagnostiku ve formátu:

| Diagnóza | Pravděpodobnost | Patofyziologie | Next Step |
|----------|----------------|----------------|-----------|
| ... | ...% | ... | ... |

Začni nejpravděpodobnějšími. Uveď minimálně 5 diagnóz. Žádné řečnění navíc.`,
  treatment_planner_ai: `Generuješ strukturovaný plán léčby:

1. Akutní management (co HNED)
2. Definitivní léčba (farmako/invazivní)
3. Monitorování (co sledovat, jak často)
4. Komplikace (co hlídat)

Strukturovaně. Bez povídání.`,
  
  // Chat modes
  floating_copilot_chat: `Odpovídej stručně (2-3 věty). Používej kontext stránky (current_page_context). Pomáhej s navigací, vysvětluj termíny viditelné na obrazovce.`,
  
  question_exam_answer: `Vysvětluješ téma otázky strukturovaně na ATESTAČNÍ ÚROVNI. ${ATTESTATION_GRADE_PROMPT}\n\nCITACE: pokud máš k dispozici interní text tématu, MUSÍŠ ho použít jako primární zdroj. Web search: ZAKÁZÁN.\n\nFORMÁTOVÁNÍ:
- Nepoužívej dlouhé odstavce (max 3-4 věty)
- Klíčové diagnózy, léky a dávkování piš vždy tučně
- Používej tabulky (Markdown tables) pro srovnání nebo klasifikace
- Každou sekci začni jasným nadpisem druhé úrovně (##)
- Pokud popisuješ algoritmus (např. 'Co dělat u OPSI'), použij číslovaný seznam`,
  question_high_yield: `Vytvoř přehledné shrnutí klíčových konceptů pro rychlé zopakování. Formát: bullet points, max 10-12 bodů. Zaměř se na pochopení, ne testování.`,
  question_quiz: `Vytvoř 5 MCQ otázek (A/B/C/D) pro procvičení pochopení tématu. Mix obtížnosti: 2 easy, 2 medium, 1 hard.`,
  question_simplify: `Vysvětli téma srozumitelně pro studenta medicíny. Zachovej faktickou správnost a zaměř se na porozumění.`,
  topic_generate_fulltext: `${ATTESTATION_GRADE_PROMPT}\n\nGeneruješ kompletní studijní text na ATESTAČNÍ ÚROVNI. Rozsah: 3-5 stránek plnohodnotného textu. Dodržuj všechny požadavky výše.\n\nFORMÁTOVÁNÍ:
- Nepoužívej dlouhé odstavce (max 3-4 věty)
- Klíčové diagnózy, léky a dávkování piš vždy tučně
- Používej tabulky (Markdown tables) pro srovnání nebo klasifikace
- Každou sekci začni jasným nadpisem druhé úrovně (##)
- Pokud popisuješ algoritmus (např. 'Co dělat u OPSI'), použij číslovaný seznam`,
  topic_generate_fulltext_v2: `Řiď se přesně zadáním uživatele.`,
  topic_generate_template: `${ATTESTATION_GRADE_PROMPT}\n\nGeneruješ obsah pro všechny sekce EDU template tématu na ATESTAČNÍ ÚROVNI. Zaměř se na praktické znalosti, právní rámec a sporné situace. NIKDY negeneruj léčebné postupy pro pacienty. Výstup: JSON s 8 sekcemi markdown (overview_md, principles_md, relations_md, clinical_thinking_md, common_pitfalls_md, mental_model_md, scenarios_md, key_takeaways_md).\n\nFORMÁTOVÁNÍ:
- Nepoužívej dlouhé odstavce (max 3-4 věty)
- Klíčové diagnózy, léky a dávkování piš vždy tučně
- Používej tabulky (Markdown tables) pro srovnání nebo klasifikace
- Každou sekci začni jasným nadpisem druhé úrovně (##)
- Pokud popisuješ algoritmus (např. 'Co dělat u OPSI'), použij číslovaný seznam`,
  topic_summarize: `Vytvoř shrnutí v odrážkách z poskytnutého plného textu. Zachyť všechny klíčové body, definice, souvislosti.`,
  topic_deep_dive: `${ATTESTATION_GRADE_PROMPT}\n\nVytvoř rozšířený obsah zahrnující hlubší souvislosti, nejnovější výzkum, pokročilé koncepty a edge cases. Zaměř se na právní aspekty a sporné situace v praxi.`,
  topic_generate_high_yield: `Řiď se přesně zadáním uživatele.`,
  topic_generate_deep_dive: `Řiď se přesně zadáním uživatele.`,
  topic_fill_missing: `Doplň pouze pole, která jsou prázdná. Nepiš nic navíc.`,
  content_review_critic: `Prováděj odborné kritické hodnocení studijního materiálu. Buď konstruktivní ale přísný. Hodnoť i atestační úroveň textu.`,
  content_review_editor: `Na základě kritického hodnocení vytvoř konkrétní návrh oprav a aktualizovaný text.`,
  taxonomy_generate: `Generuješ strukturu kurikula: okruhy → témata. NEGENERUJ plné odpovědi - jen strukturu a cíle. Vše jako status=draft.`,
  importer_generate: `Generuješ otázky na základě zadaného oboru/okruhu/tématu. 5-10 otázek, každá s plnou odpovědí. Obtížnost: mix. Vše jako draft.`,
  copilot_chat: `Rozhovor s Hippem zaměřený na porozumění medicíně. Vysvětluj pojmy, souvislosti, vztahy. Pomáhej strukturovat myšlení. Vždy cituj zdroje.`,
  topic_improve_missing: `${ATTESTATION_GRADE_PROMPT}\n\nDOPLŇ chybějící témata identifikovaná v předchozím hodnocení. NEPŘEPISUJ celý text. Vysvětli PROČ byla tato část nedostatečná a CO doplňuješ. Označuj doplněné části jasně.`,
  topic_legal_deepen: `${ATTESTATION_GRADE_PROMPT}\n\nZPŘESNI právní rámec tématu. Doplň konkrétní zákony ČR, GDPR principy, povinnosti lékaře vs. poskytovatele. Vysvětli PROČ byl právní rámec nedostatečný.`,
  topic_clinical_examples: `${ATTESTATION_GRADE_PROMPT}\n\nPŘIDAJ konkrétní klinické příklady, nejlépe z chirurgie. Zahrň komplikace, informovaný souhlas, sporné situace. Vysvětli PROČ tyto příklady chyběly.`,
  topic_exam_refinement: `${ATTESTATION_GRADE_PROMPT}\n\nUPRAV text na atestační úroveň. Odstraň povrchní věty, doplň praktické detaily, přidej právní důsledky. Vysvětli, CO bylo na nedostatečné úrovni a JAK to zlepšuješ.`,
  topic_reformat: `Tvým úkolem je POUZE PŘEFORMÁTOVAT EXISTUJÍCÍ STUDIJNÍ TEXT
tak, aby byl vizuálně a didakticky vhodný pro učení lékaře
(rezident, atestovaný lékař, klinická praxe).

⚠️ KRITICKÉ PRAVIDLO:
- VSTUP je ve formátu HTML z TipTap editoru
- VÝSTUP MUSÍ BÝT ČISTÝ MARKDOWN (ne HTML!)
- NEPŘIDÁVEJ žádný nový odborný obsah
- NEMAŽ žádné informace
- NEMĚŇ význam ani odbornou správnost
- PRACUJ výhradně s poskytnutým textem

Tvým cílem je zlepšit:
- čitelnost
- strukturu
- zapamatovatelnost
- použitelnost pro opakování

────────────────────────────
1️⃣ PŘEVOD HTML → MARKDOWN
────────────────────────────

Převeď HTML elementy na markdown:
- <p>...</p> → normální odstavce (oddělené prázdným řádkem)
- <strong>...</strong> → **tučně**
- <em>...</em> → _kurzíva_
- <h2>...</h2> → ## Nadpis
- <h3>...</h3> → ### Podnadpis
- <ul><li>...</li></ul> → markdown seznamy s -
- <ol><li>...</li></ol> → číslované seznamy 1. 2. 3.
- <blockquote>...</blockquote> → > citace
- <hr> → ---
- Odstraň prázdné <p></p> tagy

────────────────────────────
2️⃣ STRUKTURA A ČLENĚNÍ
────────────────────────────

- Rozděl dlouhé odstavce na kratší (max 3–4 řádky)
- Každá myšlenka = samostatný odstavec
- Zachovej logickou hierarchii kapitol a podkapitol
- Používej jasné nadpisy a podnadpisy

────────────────────────────
3️⃣ NADPISY
────────────────────────────

Každá sekce MUSÍ mít:
- jednoznačný nadpis, který říká, CO se zde učí
- odborně přesné pojmenování

Příklad:
❌ „Základní principy"
✅ „Základní principy zdravotnické dokumentace"

────────────────────────────
4️⃣ VÝČTY A SEZNAMY
────────────────────────────

- Dlouhé věty rozděl do:
  - odrážek
  - číslovaných seznamů (u postupů)

Používej:
- `-` nebo `•` pro výčty vlastností, povinností, zásad
- `1.`, `2.`, `3.` pro postupy a kroky

Každá odrážka = jedna jasná informace.

────────────────────────────
5️⃣ DIDAKTICKÉ BLOKY
────────────────────────────

Tam, kde to dává smysl, vytvoř oddělené bloky pomocí blockquote:

> **🔹 Zásadní princip**  
> jedna klíčová věta, kterou si má lékař zapamatovat

> **⚠️ Častá chyba v praxi**  
> typický omyl nebo právní/klinické riziko

Tyto bloky NESMÍ obsahovat nové informace,
pouze přeformuluj to, co již v textu implicitně je.

────────────────────────────
6️⃣ ZVÝRAZNĚNÍ PRO UČENÍ
────────────────────────────

- Používej **tučně** pro klíčové (high-yield) věty
- Používej _kurzívu_ pro vysvětlení nebo důraz
- Zvýraznění používej střídmě a konzistentně

────────────────────────────
7️⃣ ODDĚLENÍ HLAVNÍCH SEKCÍ
────────────────────────────

- Mezi hlavními kapitolami použij ---
- Zachovej přehlednost při dlouhém textu
- Text musí jít snadno „projet očima"

────────────────────────────
8️⃣ ZÁVĚREČNÉ STUDIJNÍ SHRNUTÍ
────────────────────────────

Na konci textu VŽDY ponech a jasně strukturovat:

### Co musí lékař znát
- stručné, bodové shrnutí

### Časté chyby v praxi
- konkrétní a praktické

### Co je právně / odborně neobhajitelné
- jasně a jednoznačně formulované

────────────────────────────
9️⃣ ZAKÁZÁNO
────────────────────────────

❌ ponechat HTML tagy ve výstupu
❌ přidávání nových faktů  
❌ akademický esejový styl  
❌ dlouhé souvislé bloky textu  
❌ změna odborného významu  

────────────────────────────
VÝSTUP
────────────────────────────

Výstupem je:
- ČISTÝ MARKDOWN (bez HTML!)
- stejný odborný obsah
- výrazně lepší struktura
- text vhodný pro učení, opakování a rychlou orientaci
- studijní materiál odpovídající exam-grade úrovni`
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
async function buildRAGContext(base44, mode, entityContext, allowWeb, options = {}) {
  const context = {
    rag_text: '',
    rag_sources: []
  };

  if (options.skipRag) {
    return context;
  }

  const MAX_RAG_CHARS = options.maxRagChars || 80000; // Hard cap to reduce timeouts in serverless execution
  const MAX_SECTION_CHARS = options.maxSectionChars || 20000;
  let currentLength = 0;

  const addSection = (text, source) => {
    if (!text || currentLength >= MAX_RAG_CHARS) return false;

    let trimmedText = text;
    if (trimmedText.length > MAX_SECTION_CHARS) {
      trimmedText = trimmedText.slice(0, MAX_SECTION_CHARS);
    }

    const remaining = MAX_RAG_CHARS - currentLength;
    if (remaining <= 0) return false;

    if (trimmedText.length > remaining) {
      trimmedText = trimmedText.slice(0, remaining);
    }

    if (!trimmedText) return false;

    context.rag_text += trimmedText + '\n\n';
    context.rag_sources.push(source);
    currentLength += trimmedText.length;
    return true;
  };

  // 1. SourceDocument (pokud existuje k tématu) - NEJVYŠŠÍ PRIORITA
  if (entityContext.topic?.id) {
    try {
      const sourceDocs = await base44.asServiceRole.entities.SourceDocument?.filter(
        { topic_id: entityContext.topic.id },
        '-created_date',
        3
      ).catch(() => []);
      
      if (sourceDocs && sourceDocs.length > 0) {
        for (const doc of sourceDocs) {
          if (doc.content) {
            addSection(
              `=== ZDROJOVÝ DOKUMENT: ${doc.title || 'Unnamed'} (NEJVYŠŠÍ PRIORITA) ===\n\n${doc.content}`,
              { type: 'source_document', entity: 'SourceDocument', id: doc.id, title: doc.title }
            );
          }
        }
      }
    } catch (e) {
      // SourceDocument entity neexistuje - pokračuj normálně
      console.log('SourceDocument entity not available:', e.message);
    }
  }

  // 2. Topic (pokud existuje) - PRIORITA 2
  if (entityContext.topic) {
    try {
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
    } catch (e) {
      console.log('Topic context unavailable:', e.message);
    }
  }

  // 3. Question - PRIORITA 3
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

  // 4. UserProgress (pro copilot_chat) - PRIORITA 4
  if (mode === 'copilot_chat') {
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      if (!currentUser?.id) return context;
      const recentProgress = await base44.asServiceRole.entities.UserProgress.filter(
        { user_id: currentUser.id },
        '-last_reviewed_at',
        5
      );
      
      if (recentProgress && recentProgress.length > 0) {
        const progressText = recentProgress.map(p => 
          `- ${p.question_id}: ${p.status} (ease: ${p.ease_factor}, repetitions: ${p.repetitions})`
        ).join('\n');
        
        addSection(
          `=== POSLEDNÍ AKTIVITA UŽIVATELE ===\n\n${progressText}`,
          { type: 'user_progress', entity: 'UserProgress', section_hint: 'recent_activity' }
        );
      }
    } catch (e) {
      console.error('Failed to fetch user progress:', e);
    }
  }

  // 5. Související témata ze stejného okruhu - PRIORITA 5 (max 2)
  if (entityContext.question?.okruh_id && currentLength < MAX_RAG_CHARS * 0.7) {
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

  // 6. Externí zdroje - PRIORITA 6 (pouze pokud allowWeb === true)
  if (allowWeb && currentLength < MAX_RAG_CHARS * 0.9) {
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

function generateCacheKey(mode, entityId, contentHash, userPromptHash, systemPromptHash) {
  const input = `${mode}:${entityId || 'none'}:${contentHash}:${AI_VERSION_TAG}:${userPromptHash}:${systemPromptHash || 'none'}`;
  
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
  let payload = null;
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    payload = await req.json();
    const {
      mode,
      entityContext = {},
      userPrompt,
      allowWeb = false,
      systemPromptOverride,
      maxRagChars,
      maxSectionChars,
      skipRag
    } = payload || {};
    const safeUserPrompt = typeof userPrompt === 'string' ? userPrompt : '';

    if (!mode || !MODE_PROMPTS[mode]) {
      return Response.json({ 
        error: 'Invalid mode', 
        validModes: Object.keys(MODE_PROMPTS) 
      }, { status: 400 });
    }

    // Validace přístupu podle role
    validateModeAccess(mode, user.role);

    // Kontrola EXAM vs CHAT vs TOOL režimu
    const isExamMode = EXAM_MODES.includes(mode);
    const isChatMode = CHAT_MODES.includes(mode);
    const isToolMode = TOOL_MODES.includes(mode);

    if (!isExamMode && !isChatMode && !isToolMode) {
      return Response.json({ error: 'Unknown mode type' }, { status: 400 });
    }

    // V EXAM režimu je zakázán web search (kromě deep_dive)
    const effectiveAllowWeb = isExamMode && !ALLOW_WEB_MODES.has(mode) ? false : allowWeb;

    // Sestavení RAG kontextu - POVINNÉ pro všechna AI volání
    const ragContext = await buildRAGContext(base44, mode, entityContext, effectiveAllowWeb, {
      maxRagChars,
      maxSectionChars,
      skipRag
    });

    // Content hash pro cache invalidaci
    const contentHash = computeContentHash(entityContext);
    
    // User prompt hash
    const userPromptNormalized = safeUserPrompt.toLowerCase().trim().replace(/\s+/g, ' ');
    let userPromptHash = 0;
    for (let i = 0; i < userPromptNormalized.length; i++) {
      userPromptHash = ((userPromptHash << 5) - userPromptHash) + userPromptNormalized.charCodeAt(i);
      userPromptHash = userPromptHash & userPromptHash;
    }
    userPromptHash = Math.abs(userPromptHash).toString(36);

    // System prompt hash (override should affect cache)
    const systemPromptNormalized = (systemPromptOverride || '').toLowerCase().trim().replace(/\s+/g, ' ');
    let systemPromptHash = 0;
    for (let i = 0; i < systemPromptNormalized.length; i++) {
      systemPromptHash = ((systemPromptHash << 5) - systemPromptHash) + systemPromptNormalized.charCodeAt(i);
      systemPromptHash = systemPromptHash & systemPromptHash;
    }
    systemPromptHash = Math.abs(systemPromptHash).toString(36);

    // Cache key
    const cacheKey = generateCacheKey(mode, entityContext.entityId, contentHash, userPromptHash, systemPromptHash);

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
        input_summary: safeUserPrompt.substring(0, 200),
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

    // Sestavení finálního promptu podle role asistenta
    let systemPrompt = '';

    if (systemPromptOverride && systemPromptOverride.trim()) {
      systemPrompt = systemPromptOverride.trim();
    } else {
      systemPrompt = BASE_MEDVERSE_INSTRUCTION;
      
      // Přidání role-specific appendix
      if (mode === 'copilot_chat') {
        systemPrompt += ASSISTANT_ROLE_APPENDICES.hippo_sidebar;
      } else if (mode === 'floating_copilot_chat') {
        systemPrompt += ASSISTANT_ROLE_APPENDICES.floating_copilot;
      } else if (TOOL_MODES.includes(mode)) {
        systemPrompt += ASSISTANT_ROLE_APPENDICES.clinical_expert;
      }
    }
    
    systemPrompt += "\n\n" + MODE_PROMPTS[mode];
    
    let fullPrompt = systemPrompt + "\n\n";
    
    // KONTEXT AKTUÁLNÍ OBRAZOVKY UŽIVATELE - nejvyšší priorita
    if (entityContext.current_page_context || entityContext.pageContext) {
      const pageCtx = entityContext.current_page_context || entityContext.pageContext;
      fullPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KONTEXT AKTUÁLNÍ OBRAZOVKY UŽIVATELE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pageCtx}

`;
    }
    
    if (ragContext.rag_text) {
      fullPrompt += "=== INTERNÍ ZDROJE (POVINNÉ K POUŽITÍ) ===\n" + ragContext.rag_text + "\n\n";
    } else {
      fullPrompt += "=== UPOZORNĚNÍ ===\nNejsou k dispozici žádné interní zdroje. Confidence MUSÍ být LOW.\n\n";
    }
    
    fullPrompt += "=== UŽIVATELSKÝ DOTAZ ===\n" + safeUserPrompt;

    const MAX_PROMPT_CHARS = 120000;
    if (fullPrompt.length > MAX_PROMPT_CHARS) {
      fullPrompt = systemPrompt + "\n\n" +
        "=== UPOZORNĚNÍ ===\nInterní zdroje byly zkráceny kvůli limitu délky promptu.\n\n" +
        "=== UŽIVATELSKÝ DOTAZ ===\n" + userPrompt;
    }

    // Určení JSON schématu
    const outputSchema = OUTPUT_SCHEMAS[mode] || null;

    // Dynamická temperature podle AI_STRICT_MODE
    const temperature = AI_STRICT_MODE ? 0.1 : 0.2;

    // Volání Google Gemini 1.5 Pro přes Base44 Core integration
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: effectiveAllowWeb,
      response_json_schema: outputSchema,
      model: 'gemini-1.5-pro',
      temperature: temperature, // 0.1 v STRICT_MODE pro maximální faktickou přesnost
      maxTokens: MAX_TOKENS_BY_MODE[mode] || 2048
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
      input_summary: safeUserPrompt.substring(0, 200),
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
        await base44.asServiceRole.entities.AIInteractionLog.create({
          user_id: user.id,
          mode: payload?.mode || 'unknown',
          entity_type: payload?.entityContext?.entityType || 'none',
          entity_id: payload?.entityContext?.entityId || null,
          prompt_version: AI_VERSION_TAG,
          input_summary: (typeof payload?.userPrompt === 'string' ? payload.userPrompt : 'Error occurred').substring(0, 200),
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
