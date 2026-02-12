# MedVerse EDU — Analýza Repa & Kompletní Checklist

> Vygenerováno: 12. 2. 2026 | Repo: `kris-bit27/medverse` | Commit: `9274a50`

---

## I. STAV REPA — SHRNUTÍ

### Základní metriky
| Metrika | Hodnota |
|---------|---------|
| Celkem řádků kódu (src/) | ~41 800 |
| Stránky (pages) | 65 importovaných v `pages.config.js` |
| Komponenty (bez UI lib) | ~60 vlastních |
| Vercel API routes (`/api/`) | 7 souborů |
| Supabase Edge Functions (`/functions/`) | 4 soubory |
| DB tabulky (public schema) | 45 |
| Tabulky bez RLS | **12 (KRITICKÉ)** |
| Tabulky s rozbitým RLS (USING true) | **3 (topics, flashcards)** |

### Tech Stack
- **Frontend:** React 18 + Vite 7 + TailwindCSS 4 + Radix UI + TipTap editor
- **Backend:** Vercel Serverless Functions (Node) + Supabase Edge Functions (Deno)
- **AI:** Anthropic Claude Opus 4 / Sonnet 4 + Gemini 1.5 Flash (fallback pro high-yield)
- **DB:** Supabase PostgreSQL 17 (eu-west-1)
- **Hosting:** Vercel
- **Auth:** Supabase Auth (email)

---

## II. CO JE HOTOVO ✅

1. **Base44 frontend client nahrazen** — `src/api/base44Client.js` je nový Supabase-native client s 63 entity mappingy
2. **Vercel API routes jsou čisté** — `/api/` soubory používají přímo `@anthropic-ai/sdk` a `@supabase/supabase-js` (žádný Base44)
3. **AI prompt systém** — kompletní systémové prompty v `aiConfig.jsx`, módy (exam, high_yield, quiz, simplify, deep_dive, copilot)
4. **SRS algoritmus** — fungující SM-2 varianta v `srs.jsx`
5. **RBAC systém** — 3 role (student/editor/admin) s granulárními permissions
6. **Monetizace/feature gating** — free vs premium limity v `featureAccess.jsx`
7. **Token systém** — user_tokens tabulka s monthly limity a reset cyklem
8. **Cache layer** — Supabase-backed AI cache s TTL a hit counting
9. **Taxonomie** — obory → okruhy → topics hierarchie (3→3→19 records)
10. **Flashcards** — 88 karet s SM-2 progress tracking
11. **Klinické nástroje** — 3 kalkulátory, drug database (3), guidelines (3)
12. **Study groups** — 2 skupiny, kompletní CRUD + posts/comments
13. **Logbook** — V2 s procedure categories (8) a certification requirements (8)
14. **Security headers** — Vercel config: HSTS, X-Frame-Options, CSP

---

## III. KRITICKÉ PROBLÉMY 🔴

### 3.1 — Base44 SDK stále v edge functions (4 soubory)
Soubory `functions/*.ts` importují `npm:@base44/sdk@0.8.6`:
- `functions/invokeEduLLM.ts` (1324 řádků) — hlavní AI engine, Gemini-based
- `functions/invokeClaudeEduLLM.ts` — Claude wrapper
- `functions/generateTaxonomy.ts` — AI taxonomie
- `functions/processStudyPack.ts` — study pack processing

Plus legacy skripty: `scripts/export-base44.js`, `scripts/seedStudyPackDemo.mjs`

**Dopad:** Tyto funkce se volají z frontendu přes `base44.functions.invoke()` — pokud Base44 backend neběží, AI funkce nefungují.

### 3.2 — DUPLICITNÍ API vrstvy
Existují **DVĚ nezávislé** AI API:

| Vrstva | Soubory | Kdo volá | Model |
|--------|---------|----------|-------|
| **Vercel `/api/`** | `invokeEduLLM.ts`, `invokeLLM.ts`, `generate-topic.ts` | `TopicContentEditorV2` (fetch /api/generate-topic) | Claude Opus 4 / Sonnet 4 |
| **Supabase Edge** | `functions/invokeEduLLM.ts`, `functions/invokeClaudeEduLLM.ts` | `AIExamTab`, `QuizFlashcardsTab`, `QuestionAIAssistant`, `TopicTemplateEditor`, `StudyPackages` (přes `base44.functions.invoke`) | Gemini 1.5 Pro / Claude Sonnet 4 |

**Problém:** Dvě různé implementace, dva různé prompt systémy, dva různé modely. Edge functions závisí na Base44 SDK.

### 3.3 — RLS bezpečnostní díry (12 tabulek bez RLS)
| Tabulka | Citlivost | Riziko |
|---------|-----------|--------|
| `obory` | Nízká (veřejný obsah) | Kdokoli může DELETE/UPDATE |
| `okruhy` | Nízká (veřejný obsah) | Kdokoli může DELETE/UPDATE |
| `questions` | Střední (quiz questions) | Kdokoli může manipulovat |
| `topic_versions` | Střední (verze obsahu) | Kdokoli může mazat historii |
| `ai_generation_cache` | Nízká | Kdokoli může číst/mazat cache |
| `user_ai_usage` | **Vysoká (uživatelská data)** | Uživatel vidí náklady jiných |
| `flashcard_review_sessions` | Střední | Cross-user data leak |
| `institutions` | Nízká | Kdokoli může editovat |
| `user_institutions` | **Vysoká** | Kdokoli se přiřadí k instituci |
| `mentor_relationships` | **Vysoká** | Kdokoli si vytvoří mentor vztah |

Plus: `topics` má RLS zapnutý, ale policies `Allow all INSERT/UPDATE/DELETE` s `USING (true)` — efektivně žádná ochrana.

### 3.4 — 22 function search_path varování
Všechny DB funkce mají mutable search_path — potenciální SQL injection vektor.

---

## IV. STRUKTURÁLNÍ PROBLÉMY 🟡

### 4.1 — Duplikáty stránek (11 verzovaných souborů)
| Stará verze | Nová verze | V routeru aktivní |
|------------|------------|-------------------|
| `Dashboard.jsx` | `DashboardV2.jsx` | V2 ✅ |
| `TopicDetail.jsx` | `TopicDetailV2/V3/V4.jsx` | V1 jako default, V2-V4 jako alternativy |
| `TestSession.jsx` | `TestSessionV2.jsx` | V1 |
| `TestResults.jsx` | `TestResultsV2.jsx` | V1 |
| `TestGenerator.jsx` | `TestGeneratorV2.jsx` | V1 |
| `FlashcardReview.jsx` | `FlashcardReviewV2.jsx` | V2 |
| `Studium.jsx` | `StudiumV2.jsx` | V1 jako default |
| `Logbook.jsx` | `LogbookV2.jsx` | V2 ✅ |
| `StudyPlans.jsx` | `StudyPlansV2.jsx` | V2 |

**Problém:** 11 starých verzí stále v routeru, zvětšují bundle a matou code navigation. Navíc `TopicDetail` (V1) je default ale V4 existuje.

### 4.2 — Backup Hippo soubory
Složka `src/components/backup_hippo/` obsahuje 4 staré soubory (FloatingCopilot, AICopilot, TopicHippoAssistant). Mrtvý kód.

### 4.3 — ContentReview je mock
`src/components/admin/ContentReview.jsx` — vrací randomizovaná fake data, není napojený na AI review.

### 4.4 — Chybějící stránky (importované ale neexistující)
V `pages.config.js` jsou importy pro stránky, které neexistují jako soubory v `/src/pages/`:
- `AdminAnalytics`, `AdminArticleEdit`, `AdminArticles`, `AdminQuestionEdit`, `AdminQuestions`
- `ArticleDetail`, `Articles`, `Dashboard`, `Logbook`, `OkruhDetail`, `Search`
- `StudyPackages`, `AccountSettings`, `StudiumV2`, `TopicDetailV2`
- `DashboardV2`, `StudyPlansV2`, `ClinicalCalculators`, `DrugDatabase`
- `ClinicalGuidelines`, `StudyGroups`, `Leaderboards`, `TeamAnalytics`

(Některé mohou existovat v jiných adresářích — nutno ověřit build.)

### 4.5 — Missing `.env.example`
Žádný `.env.example` nebo `.env.local.example` — nový developer neví jaké env vars nastavit.

### 4.6 — FloatingCopilot volá neexistující edge function
`FloatingCopilot.jsx` volá `supabase.functions.invoke('copilot-chat')` — tato funkce v `/functions/` neexistuje.

---

## V. KOMPLETNÍ CHECKLIST — PRIORITIZOVANÝ

### FÁZE 0: STABILIZACE (tento týden)
> Cíl: Odstranit vendor lock-in, opravit bezpečnost, vyčistit mrtvý kód

- [ ] **0.1 — Migrovat edge functions z Base44 SDK** 🔴
  - [ ] Vytvořit `functions/_shared/supabaseAdmin.ts` helper (getUserFromRequest + getSupabaseAdmin)
  - [ ] Přepsat `functions/invokeClaudeEduLLM.ts` — nahradit `createClientFromRequest` Supabase clientem
  - [ ] Přepsat `functions/invokeEduLLM.ts` — největší soubor (1324 řádků), systematicky nahradit `base44.asServiceRole.entities.*`
  - [ ] Přepsat `functions/generateTaxonomy.ts`
  - [ ] Přepsat `functions/processStudyPack.ts`
  - [ ] Otestovat všechny 4 funkce
  - [ ] Smazat `scripts/export-base44.js` a `scripts/seedStudyPackDemo.mjs` (nebo přepsat)

- [ ] **0.2 — Konsolidovat API vrstvy** 🔴
  - [ ] Rozhodnout: Vercel API NEBO Supabase Edge? (Doporučení: Vercel — už funguje bez Base44)
  - [ ] Frontend `base44.functions.invoke()` přesměrovat na Vercel `/api/` routes
  - [ ] Sjednotit prompt systém (aiConfig.jsx prompty → server-side)
  - [ ] Sjednotit model selection (jeden config, ne dva)

- [ ] **0.3 — Opravit RLS** 🔴
  - [ ] Zapnout RLS na 12 tabulkách bez něj
  - [ ] Opravit `topics` policies (nahradit `USING (true)` za role-based)
  - [ ] Opravit `flashcards` INSERT policy
  - [ ] Přidat read-only public policies pro `obory`, `okruhy`, `questions` (SELECT = true, ostatní = admin only)
  - [ ] Přidat user-scoped policies pro `user_ai_usage`, `user_institutions`, `mentor_relationships`

- [ ] **0.4 — Opravit function search_path** 🟡
  - [ ] Přidat `SET search_path = public` ke všem 22 DB funkcím (jedna migrace)

- [ ] **0.5 — Vyčistit mrtvý kód** 🟡
  - [ ] Smazat `src/components/backup_hippo/` (4 soubory)
  - [ ] Identifikovat a smazat staré page verze (V1 kde V2 je aktivní)
  - [ ] Rozhodnout: `TopicDetail` — která verze je primární? (V1/V2/V3/V4)
  - [ ] Konsolidovat na jednu verzi, smazat ostatní
  - [ ] Smazat nepoužívané importy z `pages.config.js`

- [ ] **0.6 — Vytvořit `.env.example`** 🟡
  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ANTHROPIC_API_KEY=
  GEMINI_API_KEY= (optional, fallback for high-yield)
  ```

- [ ] **0.7 — Ověřit build** 🔴
  - [ ] `npm run build` musí projít bez chyb
  - [ ] Ověřit že importy v `pages.config.js` odpovídají existujícím souborům
  - [ ] Otestovat: login → dashboard → topic → AI generation → flashcards

---

### FÁZE 1: CORE FUNKCE (týden 2–3)
> Cíl: Stabilní AI generování, fungující quiz a flashcard systém

- [ ] **1.1 — Nahradit mock ContentReview skutečným AI review**
  - [ ] Napojit na Claude API (validace medicínského obsahu)
  - [ ] Confidence scoring, issue detection, citation check

- [ ] **1.2 — Opravit FloatingCopilot (Hippo chat)**
  - [ ] Buď vytvořit `copilot-chat` edge function, NEBO přesměrovat na Vercel `/api/invokeEduLLM`
  - [ ] Zajistit kontext stránky (pageContext) se posílá

- [ ] **1.3 — Naplnit obsah**
  - [ ] Aktuálně: 3 obory, 3 okruhy, 19 topics, 0 questions, 88 flashcards
  - [ ] Definovat target: kolik oborů/okruhů/témat pro MVP?
  - [ ] Batch AI generování témat pro cílové okruhy
  - [ ] Generovat questions (MCQ) pro existující topics

- [ ] **1.4 — Opravit TopicDetail flow**
  - [ ] Vybrat primární verzi (doporučení: V4)
  - [ ] Zajistit: topic detail → AI generování → flashcards → quiz → SRS review

- [ ] **1.5 — Ověřit token/credit systém end-to-end**
  - [ ] Token deduction při AI volání
  - [ ] Monthly reset
  - [ ] Upsell messaging pro free users

---

### FÁZE 2: LEARNING EXPERIENCE (týden 4–6)
> Cíl: Kompletní studijní workflow

- [ ] **2.1 — Spaced Repetition end-to-end**
  - [ ] ReviewToday stránka s due cards
  - [ ] Flashcard review s SM-2 algoritmem
  - [ ] Dashboard widget s upcoming reviews
  - [ ] Push notifikace / email reminders

- [ ] **2.2 — Study Plans**
  - [ ] AI-generované study plány (StudyPlanAI)
  - [ ] Calendar view (PlannerCalendar)
  - [ ] Progress tracking

- [ ] **2.3 — Test/Quiz systém**
  - [ ] TestGenerator → TestSession → TestResults pipeline
  - [ ] Výběr V1 vs V2 verze
  - [ ] AI-generované MCQ otázky

- [ ] **2.4 — Search**
  - [ ] Full-text search přes topics (search_vector existuje v DB)
  - [ ] SearchTopics component napojit na Supabase full-text search

---

### FÁZE 3: SOCIAL & ENGAGEMENT (týden 7–8)
> Cíl: Komunita a motivace

- [ ] **3.1 — Fórum**
  - [ ] Thread creation, posting, upvoting
  - [ ] Napojení na topics

- [ ] **3.2 — Study Groups**
  - [ ] Group CRUD, member management
  - [ ] Shared study sessions
  - [ ] Group posts/discussions

- [ ] **3.3 — Gamifikace**
  - [ ] Points za aktivity (study sessions, reviews, forum posts)
  - [ ] Leaderboards
  - [ ] Achievements/badges

- [ ] **3.4 — Logbook/Atestace**
  - [ ] Logbook entry CRUD s mentor verification
  - [ ] Certification progress tracking
  - [ ] Export pro atestační komise

---

### FÁZE 4: SCALE & POLISH (týden 9+)
> Cíl: Production readiness

- [ ] **4.1 — Performance**
  - [ ] Bundle size audit (11 duplicate pages zvětšují bundle)
  - [ ] Lazy loading routes
  - [ ] Image optimization

- [ ] **4.2 — Organization/B2B features**
  - [ ] Organization management
  - [ ] Team analytics
  - [ ] Custom content per organization
  - [ ] Bulk user management

- [ ] **4.3 — Monitoring & Analytics**
  - [ ] Error tracking (Sentry?)
  - [ ] AI cost monitoring dashboard (AdminCostAnalytics existuje)
  - [ ] User engagement metrics

- [ ] **4.4 — Monetizace**
  - [ ] Stripe integration pro Premium
  - [ ] Pricing page → checkout flow
  - [ ] Invoice generation

---

## VI. CO SE DÁ VYUŽÍT (silné stránky)

1. **Vercel API je čistý** — `/api/generate-topic.ts` je production-ready (cache, validation, cost tracking, CORS whitelist, Zod schema validation)
2. **Supabase DB schema je bohatý** — 45 tabulek pokrývá celý workflow (obsah, učení, gamifikace, organizace, logbook)
3. **RBAC + feature gating** — hotové, jen potřebuje napojení na skutečný payment systém
4. **AI prompt systém** — kvalitní, medicínsky specifické prompty v `aiConfig.jsx`
5. **SM-2 SRS** — implementovaný a funkční
6. **DB funkce** — `get_due_flashcards`, `update_flashcard_progress`, `spend_tokens`, `earn_tokens` atd. existují
7. **TipTap editor** — pro admin editaci obsahu
8. **22 DB stored procedures** — token management, flashcard SRS, study sessions, cost analytics

---

## VII. DOPORUČENÍ PRO OKAMŽITOU AKCI

**Priorita 1 (dnes/zítra):**
1. Edge functions Base44 migrace (0.1)
2. RLS oprava (0.3)

**Priorita 2 (tento týden):**
3. API konsolidace (0.2)
4. Dead code cleanup (0.5)
5. Build ověření (0.7)

**Priorita 3 (příští týden):**
6. Content pipeline (1.3)
7. TopicDetail konsolidace (1.4)
8. FloatingCopilot fix (1.2)
