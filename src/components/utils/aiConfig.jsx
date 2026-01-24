// AI Version Tag - centrální konstanta pro verzování AI systému
export const AI_VERSION_TAG = "edu_v1";

// Hlavní systémový prompt pro všechny režimy
export const MEDVERSE_EDU_CORE_PROMPT = `Jsi AI asistent pro lékařskou edukaci v systému MedVerse EDU.

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

CITACE: pokud máš k dispozici interní text tématu, MUSÍŠ ho použít jako primární zdroj.
Web search: ZAKÁZÁN (allowWeb=false).
Confidence: high jen pokud máš plné interní zdroje, jinak medium/low.
`,

  question_high_yield: `
Vytvoř HIGH-YIELD shrnutí - klíčové body pro rychlé opakování před zkouškou.
Formát: bullet points, max 10-12 bodů, stručně ale kompletně.
Zaměř se na: diagnostická kritéria, léčebné algoritmy, kritické hodnoty, diferenciální dg.
`,

  question_quiz: `
Vytvoř 5 MCQ otázek (A/B/C/D) testujících pochopení tématu.
Každá otázka: jasná, 1 správná odpověď, vysvětlení správné odpovědi.
Mix obtížnosti: 2 easy, 2 medium, 1 hard.
`,

  question_simplify: `
Zjednoduš téma pro studenta medicíny (ne laika).
Zachovej faktickou správnost, ale vysvětli složité koncepty jednodušeji.
Použij analogie, kde to pomůže.
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
Generuješ strukturu kurikula: okruhy → témata.
Pro každé téma: název, learning objectives, suggested sources.
NEGENERUJ plné odpovědi - jen strukturu a cíle.
Vše ukládej jako status=draft.
Přidej review checklist pro admina.
`,

  importer_generate: `
Generuješ otázky na základě zadaného oboru/okruhu/tématu.
5-10 otázek, každá s plnou strukturovanou odpověďí.
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

  question_quiz: {
    type: "object",
    properties: {
      mcq: {
        type: "array",
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" }
            },
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
  },

  taxonomy_generate: {
    type: "object",
    properties: {
      okruhy: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  learning_objectives: {
                    type: "array",
                    items: { type: "string" }
                  },
                  suggested_sources: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      review_checklist: {
        type: "array",
        items: { type: "string" }
      }
    }
  }
};