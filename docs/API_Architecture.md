# MedVerse API Architecture

## Primární API vrstva: Vercel Serverless Functions (`/api/`)

Všechny frontend volání jdou přes Vercel `/api/` routes.
Frontend klient `src/api/base44Client.js` routuje `base44.functions.invoke(name, payload)` → `fetch('/api/{name}', ...)`.

### Aktivní routes

| Route | Účel | Model | Volá |
|-------|------|-------|------|
| `/api/invokeEduLLM` | AI odpovědi (exam, high_yield, copilot, quiz, simplify) | Claude Sonnet 4 | `AIExamTab`, `QuizFlashcardsTab`, `QuestionAIAssistant`, `TopicTemplateEditor`, `TopicContentReviewPanel`, `FloatingCopilot` |
| `/api/invokeLLM` | Obecné LLM volání (schéma-driven) | Claude Sonnet 4 | admin komponenty |
| `/api/generate-topic` | Generování fulltext/high-yield/deep-dive témat | Claude Opus 4 / Gemini Flash | `TopicContentEditorV2` |
| `/api/processStudyPack` | Zpracování study packů (chunking + AI shrnutí) | Claude | `StudyPackages` |
| `/api/cache` | AI cache helper (interní) | — | `generate-topic` |
| `/api/_supabaseAdmin` | Supabase admin client helper (interní) | — | ostatní routes |

### Archivované Edge Functions (`/functions/_archived/`)

Tyto Supabase Edge Functions byly nahrazeny Vercel routes a nejsou z frontendu volány:
- `generateTaxonomy.ts` — bude přesunut na `/api/` až bude potřeba
- `invokeClaudeEduLLM.ts` — duplicita s `/api/invokeEduLLM`
- `invokeEduLLM.ts` — legacy Gemini verze, nahrazena Vercel verzí
- `processStudyPack.ts` — nahrazena `/api/processStudyPack`

### Env proměnné

```
SUPABASE_URL / VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY (optional, fallback for high-yield in generate-topic)
```
