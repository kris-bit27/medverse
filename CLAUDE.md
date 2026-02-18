# MedVerse AI – CLAUDE.md

## Architektura

### AI modely
- **Content generation (fulltext, deep_dive, mcq):** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Admin content generation:** Claude Opus 4 (`claude-opus-4-20250514`)
- **Flashcards a lightweight tasky:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **High-yield extraction & analytics fallback:** Gemini 2.5 Flash (REST API)
- **Cross-model validace & content review:** GPT-4o
- **Web search:** Anthropic tool `web_search_20250305` (fulltext + deep_dive mody)

### Prompt Caching (3-layer, ~90% cache hit rate)
1. **BASE_SYSTEM** (~800 tokenů) – statická identita, pravidla, formát citací – cachováno napříč VŠEMI requesty
2. **SPECIALTY_CONTEXT** (~300 tokenů) – specifické guidelines pro obor – cachováno per obor
3. **MODE_INSTRUCTIONS** (~400 tokenů) – formát výstupu (fulltext/high-yield/etc.) – cachováno per mode+obor
4. **USER PROMPT** (variabilní) – topic-specific obsah – NIKDY cachováno

### Database Cache
- Tabulka `ai_generation_cache` v Supabase
- Klíč: SHA256 hash z `{mode, modelHint, normalizedContext}`
- TTL: 7 dní (výchozí)
- Graceful degradation pokud Supabase nedostupné

### Speciality
- 6 plně implementovaných oborů s kontextem v `_prompts.ts`: Chirurgie, Vnitřní lékařství, Pediatrie, Gynekologie a porodnictví, Neurologie, Anesteziologie a intenzivní medicína
- 19+ dalších specializací v profilech uživatelů
- Hybrid context system pro kombinaci oborových znalostí

## Stack

### Frontend
- **React 18.3** + **Vite 7.3** (JSX, lazy-loaded routes přes `pages.config.js`)
- **React Router DOM 7.13** (routing)
- **TanStack React Query 5.90** (server state + request deduplication)
- **React Hook Form 7.71** + **Zod 3.24** (formuláře + validace)
- **Tailwind CSS 4.1** + **Radix UI** (18 komponent) + **shadcn/ui**
- **TipTap 3.19** (rich text editor)
- **Framer Motion 12.31** (animace)
- **Recharts 3.7** (grafy), **jsPDF 4.1** (PDF export)
- **Sonner** (toast notifikace), **Lucide React** (ikony)

### Backend
- **Vercel Serverless Functions** (`/api/` routes, TypeScript)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Anthropic SDK 0.72** (Claude API)
- **Upstash Redis** + **Rate Limit** (rate limiting)

### Klíčové API soubory
| Soubor | Účel |
|--------|------|
| `api/generate-topic.ts` | Hlavní generování obsahu (fulltext/deep-dive/high-yield) |
| `api/invokeEduLLM.ts` | Edukační LLM volání (copilot, quiz, exam) |
| `api/invokeLLM.ts` | Obecná LLM volání |
| `api/_ai-models.ts` | Multi-model AI klient (Claude, GPT, Gemini) |
| `api/_cache.ts` | Cache management (Supabase-backed) |
| `api/_prompts.ts` | System prompts (layered architektura) |
| `api/_token-utils.ts` | Token billing systém |

## Konvence

### Naming
- **Komponenty/Stránky:** PascalCase s verzí (`TopicDetailV5.jsx`, `TestGeneratorV2.jsx`)
- **Funkce/proměnné:** camelCase (`handleOborChange`, `getTokenCost`)
- **Konstanty:** UPPER_SNAKE_CASE (`MODE_MAX_TOKENS`, `DEMO_OBORY`)
- **Hooky:** `use*` prefix (`useStudyTracking`, `useAnalytics`)

### Styl
- Tailwind utility-first, žádný CSS-in-JS
- Dark mode přes `class` strategii (next-themes)
- Podmíněné třídy přes `clsx` / `tailwind-merge`
- CSS variables pro theming

### Struktura
- Stránky v `src/pages/`, komponenty v `src/components/` (organizované po feature folderu)
- Nové verze komponent = nový soubor s vyšším V číslem (V1 -> V2 -> V3)
- Lazy loading na úrovni rout
- Frontend JSX, backend TypeScript

### Error Handling
- Toast notifikace přes `sonner`
- Try-catch v async funkcích
- Graceful fallbacky (Claude -> GPT-4o -> Gemini)

### TypeScript
- `strict: false`, `noEmit: true`
- ESLint s `unused-imports` pluginem
- Target: ES2020

## Co NEDĚLAT

- **Neměnit caching logiku** (`api/_cache.ts`, `ai_generation_cache` tabulka) bez explicitního souhlasu
- **Neupravovat model routing** (`api/_ai-models.ts`, model selection v `api/generate-topic.ts`) bez explicitního souhlasu
- **Neměnit prompt layering** v `api/_prompts.ts` – ovlivňuje cache hit rate a kvalitu výstupu
- **Nemazat V* soubory** starších verzí – mohou být referencované jinde
- **Nepřidávat `strict: true`** do tsconfig bez migrace celého projektu
- **Neměnit token billing logiku** (`api/_token-utils.ts`) – ovlivňuje uživatelské kvóty
- **Neměnit RLS politiky** v Supabase bez security review
- **Nepoužívat CSS-in-JS** (styled-components, emotion) – projekt je Tailwind-only

## Build & Dev

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
```

## Kvalitní metriky pro AI obsah

- Safety score >= 85/100 (žádné nebezpečné dávkování/opomenutí)
- Generování: <30s fulltext, <15s high-yield
- Náklady: <$0.30/topic průměrně
- Český kontext – preference EU guidelines
