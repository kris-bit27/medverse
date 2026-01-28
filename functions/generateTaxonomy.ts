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

        // Build prompt
        let prompt = `Vytvoř kompletní strukturu okruhů a témat pro klinickou disciplínu: ${disciplineName}

Struktura by měla pokrývat všechny klíčové oblasti oboru podle doporučení MZČR (Ministerstvo zdravotnictví České republiky).

Pro každý okruh vygeneruj 3-5 hlavních témat a pro každé téma 2-3 konkrétní otázky s odpověďmi.

Odpovědi by měly obsahovat:
- Stručnou definici
- Základní diagnostiku
- Léčbu
- Případné komplikace

${sourceUrl ? `\n\nVyužij jako hlavní zdroj informací: ${sourceUrl}` : ''}

Vrať data ve formátu JSON podle následujícího schématu.`;

        // Připrav finální prompt s instrukcemi
        const finalPrompt = `Jsi expert na přípravu lékařů k atestacím. Vytváříš strukturovaný vzdělávací obsah dle českých zdravotnických standardů.

${prompt}`;

        // Call Google Gemini 1.5 Pro for taxonomy generation
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: finalPrompt,
            add_context_from_internet: sourceUrl ? true : false,
            model: 'gemini-1.5-pro',
            temperature: 0.7,
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