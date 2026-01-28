import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { disciplineName, sourceUrl } = await req.json();

        if (!disciplineName) {
            return Response.json({ error: 'Discipline name is required' }, { status: 400 });
        }

        // Try to fetch source content if URL provided
        let sourceContent = '';
        if (sourceUrl) {
            try {
                const fetchResponse = await fetch(sourceUrl);
                if (fetchResponse.ok) {
                    const contentType = fetchResponse.headers.get('content-type');
                    // If it's text/plain or text/html, extract content
                    if (contentType?.includes('text/plain') || contentType?.includes('text/html')) {
                        sourceContent = await fetchResponse.text();
                    }
                }
            } catch (error) {
                console.log('Could not fetch source URL, will rely on Gemini search:', error);
            }
        }

        // Build prompt
        let prompt = `Vytvoř KOMPLETNÍ strukturu okruhů a témat pro klinickou disciplínu: ${disciplineName}

${sourceContent ? `
=== ZDROJOVÁ DATA ===
${sourceContent.substring(0, 50000)}
=== KONEC ZDROJOVÝCH DAT ===

Důkladně analyzuj výše uvedená zdrojová data. Jedná se o oficiální atestační materiály. Přepiš VŠE do níže uvedené JSON struktury.
` : ''}

${!sourceContent && sourceUrl ? `
INSTRUKCE PRO VYHLEDÁVÁNÍ:
Použij své schopnosti vyhledávání a znalosti oficiálních kurikul MZČR (Věstník MZČR) pro daný obor. 
URL zdroje: ${sourceUrl}
Nesmíš vynechat žádnou klíčovou oblast uvedenou v legislativě nebo oficiálních atestačních požadavcích.
` : ''}

Struktura by měla pokrývat VŠECHNY klíčové oblasti oboru podle doporučení MZČR (Ministerstvo zdravotnictví České republiky).

Pro každý okruh vygeneruj 3-5 hlavních témat a pro každé téma 2-3 konkrétní otázky s odpověďmi.

Odpovědi by měly obsahovat:
- Stručnou definici
- Základní diagnostiku
- Léčbu
- Případné komplikace

Vrať data ve formátu JSON podle následujícího schématu.`;

        // Připrav finální prompt s instrukcemi
        const finalPrompt = `Jsi elitní atestační komisař a expert na přípravu lékařů k atestacím. Vytváříš strukturovaný vzdělávací obsah dle českých zdravotnických standardů.

${prompt}

KRITICKÉ: Odpověz POUZE validním JSONem. NEZAČÍNEJ odpověď žádným textem jako "Zde je vaše struktura..." nebo podobně. Vrať přímo JSON objekt.`;

        // Call Google Gemini 1.5 Pro for taxonomy generation (větší kontext a kapacita)
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: finalPrompt,
            add_context_from_internet: sourceUrl ? true : false,
            model: 'gemini-1.5-pro',
            temperature: 0.7,
            maxTokens: 8192,
            response_json_schema: {
                type: "object",
                properties: {
                    okruhy: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                icon: { type: "string" },
                                topics: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                            tags: {
                                                type: "array",
                                                items: { type: "string" }
                                            },
                                            questions: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        title: { type: "string" },
                                                        question_text: { type: "string" },
                                                        answer_rich: { type: "string" },
                                                        difficulty: { type: "number" }
                                                    },
                                                    required: ["title", "question_text", "answer_rich", "difficulty"]
                                                }
                                            }
                                        },
                                        required: ["title", "tags", "questions"]
                                    }
                                }
                            },
                            required: ["title", "description", "icon", "topics"]
                        }
                    }
                },
                required: ["okruhy"]
            }
        });

        const generatedData = llmResponse;

        return Response.json({ 
            success: true, 
            data: generatedData,
            model: "gemini-1.5-pro"
        });

    } catch (error) {
        console.error('Generation error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});