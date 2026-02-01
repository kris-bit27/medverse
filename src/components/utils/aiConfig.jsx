// AI Version Tag - centrální konstanta pro verzování AI systému
export const AI_VERSION_TAG = "medverse_claude_sonnet_4_v1";

export const AI_MODELS = {
  PRIMARY: 'claude-sonnet-4-20250514',
  FALLBACK: 'gemini-1.5-pro-002',
  VERSION_TAG: "medverse_claude_sonnet_4_v1"
};

export const AI_FEATURES = {
  WEB_SEARCH: true,
  CONFIDENCE_SCORING: true,
  SOURCE_CITATION: true,
  FACT_CHECKING: true
};

// Hlavní systémový prompt pro všechny režimy
export const MEDVERSE_EDU_CORE_PROMPT = `Jsi AI asistent pro lékařskou edukaci v systému MedVerse EDU.

HLAVNÍ PRAVIDLA:
1. Jazyk: čeština (pokud uživatel nespecifikuje jinak)
2. Styl: precizní, zkouškový, strukturovaný, stručné nadpisy, žádné "storytelling"
3. Bezpečnost: pokud uživatel zadá osobní data pacienta nebo žádá klinické rozhodování pro konkrétního pacienta, odpověz edukativně obecně a doporuč konzultaci se školeným lékařem
4. Důraz na interní kurikulum: pokud je k dispozici interní text z témat, MUSÍŠ ho primárně používat a citovat

KRITICKÁ PRAVIDLA (exam-grade):
- Pokud neexistuje interní zdroj, NIKDY netvrď odpověď s jistotou
- Pokud je confidence LOW, vždy EXPLICITNĚ uveď proč
- NIKDY si nevymýšlej guidelines – pokud nejsou v RAG kontextu, přiznej to
- Při atestačních otázkách VŽDY cituj zdroje (interní prioritně)
- Nehalucinuj - pokud nevíš, řekni to a označ confidence=LOW

STRUKTURA KAŽDÉ ODPOVĚDI:
- Hlavní odpověď (strukturovaná, s markdownem)
- Citations (internal/external odkazy - interní VŽDY na prvním místě)
- Confidence level (high/medium/low) + stručný důvod (1-2 věty)
- Missing topics (krátký seznam, co by měl student doplnit)

DŮLEŽITÉ:
- Používaj oficiální terminologii a klasifikace
- Pro medicínské postupy se řiď guidelines (ESC, ERC, ESMO, NCCN, ČLS atd.)
- High confidence POUZE pokud máš plné interní zdroje
`;

// Režimové prompty - doplňující instrukce pro konkrétní mode
export const MODE_PROMPTS = {
  question_exam_answer: `
Odpovídáš na atestační otázku. Výstup MUSÍ být strukturovaný podle schématu:
- Definice (co to je)
- Etiologie/klasifikace
- Diagnostika (klinický obraz, vyšetření)
- Léčba (postupy, farmakoterapie)
- Komplikace a prognóza
- Časté chyby a perličky
- 5 kontrolních otázek pro self-check

CITACE interní jsou POVINNÉ. Pokud máš k dispozici interní text tématu, MUSÍŠ ho použít jako primární zdroj.
Web search: ZAKÁZÁN (allowWeb=false).
Confidence: high jen pokud máš plné interní zdroje, jinak medium/low a vysvětli proč.
`,

  question_high_yield: `
Vrať pouze HIGH-YIELD shrnutí (max 10 odrážek).
Zaměř se na to, co se typicky ptá u atestace a co si pohlídat v praxi.
Používej interní zdroje. Nevyhledávej web.
Přidej "Časté chyby" jako poslední 1-2 odrážky.
`,

  question_quiz: `
Vytvoř 5 MCQ otázek k tématu. Každá má 4 možnosti (A-D), jednu správnou odpověď.
U každé přidej krátké vysvětlení, proč je správně.
Neodkazuj se na web. Opírej se o interní texty a existující odpověď.
`,

  question_simplify: `
Vysvětli téma srozumitelně pro medika/začátečníka, ale fakticky správně.
Struktura: Co to je -> Proč je to důležité -> Jak to poznám -> Co se s tím dělá -> Na co si dát pozor.
Používej interní zdroje. Nevyhledávej web.
`,

  topic_generate_fulltext: `
Generuješ kompletní studijní text pro atestační přípravu.
Rozsah: odpovídající atestační otázce (2-4 stránky textu).
Struktura: úvod, hlavní část (logicky členěno), závěr/shrnutí.
Styl: učebnicový, ale srozumitelný.
CITACE: interní zdroje (pokud existují) + externí guidelines/reviews.
`,

  topic_summarize: `
Vytvoř shrnutí v odrážkách z poskytnutého plného textu.
Zachyť všechny klíčové body, definice, postupy.
Formát: markdown bullets, max 15-20 bodů.
`,

  topic_deep_dive: `
Vytvoř rozšířený obsah zahrnující:
- Nejnovější výzkum a poznatky
- Pokročilé koncepty a detaily  
- Komplikace a edge cases
- Klinické perličky a praktické tipy
- Diferenciální diagnostiku
- Kontroverzní témata

allowWeb=true: můžeš hledat aktuální informace, ale ODDĚL "Interní část" vs "Externí aktuality".
`,

  topic_fill_missing: `
Doplň pouze pole, která jsou prázdná.
Nepiš nic navíc. Pokud je full_text prázdný, vygeneruj full_text_content.
Pokud bullets prázdné, vygeneruj bullet_points_summary ze full_text.
Pokud learning_objectives prázdné, vygeneruj 5-8 cílů.
Používej interní kontext tématu a okruhu, web nepoužívej.
Vrať JSON s pouze doplněnými poli.
`,

  content_review_critic: `
Prováděj odborné kritické hodnocení studijního materiálu.
Výstup: JSON schema s:
- score (0-10)
- strengths (co je dobré)
- weaknesses (co chybí/je špatně)
- missing_topics (co doplnit)
- factual_risks (rizika nesprávných informací)
- suggested_improvements (konkrétní návrhy)

Buď konstruktivní ale přísný - jde o atestační přípravu.
`,

  content_review_editor: `
Na základě kritického hodnocení vytvoř:
1. Konkrétní návrh oprav (markdown diff)
2. Aktualizovaný text s opravami
3. Zdůvodnění změn

Zachovej původní strukturu, ale vylepši kvalitu.
`,

  taxonomy_generate: `
Generuj pouze kurikulární strukturu pro zvolený klinický obor v češtině.
NEGENERUJ plné studijní texty ani plné odpovědi.
Vrať: okruhy -> témata. U témat vrať learning_objectives, suggested_sources a volitelně seed_questions (jen názvy).
Vše je určeno jako DRAFT a vyžaduje revizi.
Dodrž logiku atestační přípravy (high-yield) a pokryj typické otázky k atestaci.
`,

  importer_generate: `
Generuješ otázky na základě zadaného oboru/okruhu/tématu.
5-10 otázek, každá s plnou strukturovanou odpovědí.
Obtížnost: mix (2 easy, 5 medium, 3 hard).
Vše jako draft, vyžaduje review.
`,

  copilot_chat: `
Volný chat s fokusem na studium medicíny.
Můžeš: vysvětlovat, vytvářet poznámky, odpovídat na otázky.
Vždy cituj zdroje, pokud je to relevantní.
Pokud se ptají na konkrétní téma z kurikula, nabídni odkaz na příslušné Topic.
`
};

// JSON schémata pro strukturované výstupy
export const OUTPUT_SCHEMAS = {
  taxonomy_generate: {
    type: "object",
    required: ["field", "tracks", "review_checklist"],
    properties: {
      field: { type: "string" },
      tracks: {
        type: "array",
        items: {
          type: "object",
          required: ["okruh_title", "topics"],
          properties: {
            okruh_title: { type: "string" },
            topics: {
              type: "array",
              items: {
                type: "object",
                required: ["topic_title", "learning_objectives", "suggested_sources"],
                properties: {
                  topic_title: { type: "string" },
                  learning_objectives: { type: "array", items: { type: "string" } },
                  suggested_sources: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["title", "type"],
                      properties: {
                        title: { type: "string" },
                        type: { type: "string", enum: ["guideline", "review", "textbook", "society", "local"] },
                        note: { type: "string" }
                      }
                    }
                  },
                  seed_questions: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      },
      review_checklist: { type: "array", items: { type: "string" } }
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
          kontrolni_otazky: {
            type: "array",
            items: { type: "string" }
          }
        }
      },
      citations: {
        type: "object",
        properties: {
          internal: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                id: { type: "string" },
                title: { type: "string" },
                section_hint: { type: "string" }
              }
            }
          },
          external: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                publisher: { type: "string" }
              }
            }
          }
        }
      },
      confidence: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" }
        }
      },
      missing_topics: {
        type: "array",
        items: { type: "string" }
      }
    }
  },

  question_high_yield: {
    type: "object",
    required: ["high_yield_points"],
    properties: {
      high_yield_points: { type: "array", items: { type: "string" }, maxItems: 10 },
      common_mistakes: { type: "array", items: { type: "string" }, maxItems: 2 },
      citations: { type: "object" },
      confidence: { type: "object" }
    }
  },

  question_quiz: {
    type: "object",
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          required: ["question_text", "options", "correct_answer", "explanation"],
          properties: {
            question_text: { type: "string" },
            options: {
              type: "object",
              required: ["A", "B", "C", "D"],
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
    required: ["simplified_explanation"],
    properties: {
      simplified_explanation: {
        type: "object",
        required: ["what_is_it", "why_important", "how_to_recognize", "what_to_do", "watch_out"],
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

  topic_fill_missing: {
    type: "object",
    properties: {
      full_text_content: { type: "string" },
      bullet_points_summary: { type: "string" },
      learning_objectives: { type: "array", items: { type: "string" } }
    },
    additionalProperties: false
  },

  content_review_critic: {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 10 },
      strengths: {
        type: "array",
        items: { type: "string" }
      },
      weaknesses: {
        type: "array",
        items: { type: "string" }
      },
      missing_topics: {
        type: "array",
        items: { type: "string" }
      },
      factual_risks: {
        type: "array",
        items: { type: "string" }
      },
      suggested_improvements: {
        type: "array",
        items: { type: "string" }
      }
    }
  }
};
