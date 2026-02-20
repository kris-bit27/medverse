# MedVerse EDU — Kompletni audit portalu

**Datum:** 2026-02-20
**Branch:** claude/portal-audit-consolidate-m2uH2
**Stav:** Audit dokoncen, ceska se na schvaleni a implementaci

---

## 1. GIT — Stav branchi a konsolidace

### Aktualni stav
| Branch | Typ | Commit |
|--------|-----|--------|
| `origin/main` | remote default | `2cbdd8a` |
| `origin/claude/portal-audit-consolidate-m2uH2` | remote feature | `2cbdd8a` (stejny) |
| `master` (local) | lokalni | stary, nema remote counterpart |

### Nalez
- [x] **Vsechny branche jsou na stejnem commitu** — zadna divergence
- [ ] **Lokalni `master` branch je zastaraly** — remote se jmenuje `main`, ale lokalne existuje `master`

### Checklist
- [ ] **Smazat lokalni `master` branch**: `git branch -d master`
- [ ] **Nastavit default branch tracking**: `git branch --set-upstream-to=origin/main`
- [ ] **Dohodnout branching strategii** (doporuceni: `main` = production, `feature/*` branche pro vyvoj)

---

## 2. BEZPECNOST — Kriticke nalezy

### 2.1 VYSOKA PRIORITA

#### [SEC-01] XSS v GeminiWeeklyDigest.jsx
- **Soubor:** `src/components/dashboard/GeminiWeeklyDigest.jsx:93`
- **Problem:** `dangerouslySetInnerHTML={{ __html: report.report }}` — AI-generovany HTML NENI sanitizovan
- **Riziko:** Pokud AI vrati skodlivy HTML (injection pres prompt), muze dojit k XSS
- **Fix:** Pouzit DOMPurify jako v `HTMLContent.jsx`
- [ ] **Opravit: Pridat DOMPurify.sanitize() pred renderovanim**

#### [SEC-02] API endpointy bez povinne autentizace
- **Soubory:**
  - `api/invokeLLM.ts:50` — `getOptionalUserId` (volitelna auth)
  - `api/invokeEduLLM.ts:89` — `getOptionalUserId` (volitelna auth)
  - `api/med-search.ts:117` — `getOptionalUserId` pro `answer` mode
  - `api/generate-topic.ts:287` — auth jen pro usage tracking
- **Problem:** Neautentifikovani uzivatele mohou volat AI endpointy zdarma — zadne odecitani tokenu
- **Riziko:** Zneuziti API, vysoky ucet za AI volani
- **Fix:** Vyzadovat `getUserId` (povinnou auth) na vsech AI endpointech
- [ ] **Opravit: Zmenit getOptionalUserId na getUserId na vsech AI endpointech**

#### [SEC-03] Chybejici rate limiting na Vercel API routes
- **Problem:** `@upstash/ratelimit` je v dependencies, ale NENI pouzit v zadnem API route
- **Soubor:** `SECURITY_SETUP.md:24` — sam dokument rika "ZATIM NEPOUZITO"
- **Riziko:** DDoS, API abuse, vysoke naklady na AI volani
- [ ] **Implementovat rate limiting na vsech API endpointech** (doporuceni: 10 req/min pro AI endpointy)

#### [SEC-04] Edge Functions: CORS wildcard
- **Soubory:**
  - `supabase/functions/academy-generate-content/index.ts:7`
  - `supabase/functions/academy-sandbox-run/index.ts:7`
- **Problem:** `Access-Control-Allow-Origin: *` — povoluje pozadavky z libovolne domeny
- **Poznamka:** Vercel API routes maji spravny allowlist, edge functions ne
- [ ] **Opravit: Pouzit stejny ALLOWED_ORIGINS allowlist jako v Vercel API routes**

#### [SEC-05] CSP povoluje unsafe-inline pro scripty
- **Soubor:** `vercel.json:33`
- **Problem:** `script-src 'self' 'unsafe-inline'` — oslabuje ochranu proti XSS
- **Poznamka:** Bezne u React SPA, ale da se zlepsit s nonce-based CSP nebo hash-based
- [ ] **Zvazit: Implementovat nonce-based CSP** (nizsi priorita)

### 2.2 STREDNI PRIORITA

#### [SEC-06] Health endpoint prozrazuje konfiguraci
- **Soubor:** `api/test.ts:8-13`
- **Problem:** `GET /api/test` vraci informace o tom, ktere API klice jsou nastaveny
- **Riziko:** Information disclosure — utocnik vi, ktere sluzby jsou aktivni
- [ ] **Opravit: Odstranit env info z verejneho endpointu** (nebo pridat admin auth)

#### [SEC-07] Duplicitni Supabase admin klienti
- **Soubory:**
  - `api/_supabaseAdmin.ts` — hlavni admin klient
  - `api/_cache.ts:11-13` — vytvoreni dalsiho admin klienta
  - Edge functions — inline vytvoreni
- **Problem:** 3 ruzne instance supabase admin klienta, riziko nekonzistence
- [ ] **Refaktor: Konsolidovat na jedineho admin klienta**

#### [SEC-08] Legacy fallback v token deduction
- **Soubor:** `api/_token-utils.ts:136-176`
- **Problem:** Non-atomicky fallback (check + deduct) pri selhani RPC — race condition
- **Poznamka:** Fallback by mel byt odstranen po nasazeni migrace `001_atomic_token_deduction.sql`
- [ ] **Overit ze RPC funguje v produkcii a odstranit legacy fallback**

### 2.3 POZITIVNI NALEZY (co uz funguje dobre)
- [x] `HTMLContent.jsx` — spravna sanitizace pres DOMPurify s whitelistem tagu
- [x] API routes pouzivaji Bearer token validaci pres `supabaseAdmin.auth.getUser()`
- [x] Admin endpointy (`content-review`, `analyze-feedback`) vyzaduji `requireAdmin()`
- [x] Role brana z `app_metadata` (ne z `user_metadata` — nelze spoofovat klientem)
- [x] API keys (`ANTHROPIC_API_KEY`, etc.) jsou spravne jen v server-side kodu
- [x] VITE_ prefix pouzit pouze pro verejne klice (URL, anon key)
- [x] Supabase service role key NENI v client-side kodu
- [x] CORS allowlist na Vercel API routes je spravny
- [x] Security headers v `vercel.json` — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] PII detekce v sandbox edge function (rodne cislo, email, telefon)
- [x] Edge functions maji vlastni JWT verifikaci (i kdyz --no-verify-jwt)

---

## 3. DATABAZE A SUPABASE

### 3.1 Schema
- **7 Academy tabulek** — vsechny s RLS, FK constraints, indexes
- **Atomic token deduction** — `deduct_tokens_atomic()` s FOR UPDATE locking
- **Auto-create profile trigger** — `handle_new_user()` na `auth.users`
- **XP sync trigger** — `sync_academy_xp()` s atomic upsert

### 3.2 Checklist

#### [DB-01] Chybejici migrace pro zakladni tabulky
- **Problem:** Migrace pokryvaji Academy modul, ale NE zakladni tabulky:
  - `topics` — referencovana v kodu, ale migrace neexistuje
  - `user_profiles` — jen ALTER v academy migraci
  - `user_tokens` / `token_transactions` — referencovana v kodu
  - `user_ai_usage` — jen RLS v audit_fixes
  - `ai_generation_cache` — referencovana v cache.ts
  - `api_call_log` — pouzivana ve vsech API routes
  - `study_sessions`, `test_sessions`, `user_topic_mastery` — pouzivana v test.ts (reports)
  - `content_feedback` — pouzivana v analyze-feedback.ts
- [ ] **Vytvorit zakladni migraci (000_initial_schema.sql)** se vsemi puvodni tabulkami
- [ ] **Overit RLS na vsech zakladnich tabulkach** (topics, user_profiles, user_tokens, etc.)

#### [DB-02] `api_call_log` schema nekonzistence
- **Problem:** Ruzne API routes insertuji ruzna pole:
  - `generate-topic.ts` — `source, model, mode, topic_title, input_tokens, output_tokens, ...`
  - `med-search.ts` — `endpoint, model, input_tokens, output_tokens, cost_usd, metadata`
  - `test.ts` — `source, mode, model, input_tokens, output_tokens, cost_usd, success`
  - `academy-sandbox-run` — `user_id, source, model, prompt_length, response_length, tokens_used`
- **Riziko:** Sloupce ktere neexistuji zpusobi tichy fail (Supabase je ignoruje)
- [ ] **Sjednotit schema api_call_log a zajistit konzistentni logovani**

#### [DB-03] deduct_tokens_atomic default = 1000, ale checkTokens default = 50
- **Soubory:**
  - `supabase/migrations/001_atomic_token_deduction.sql:27` — novy uzivatel = 1000 tokenu
  - `api/_token-utils.ts:76` — novy uzivatel = 50 tokenu (free tier)
- **Problem:** Nekonzistentni default — RPC da 1000, JS fallback da 50
- [ ] **Sjednotit default tokeny pro nove uzivatele** (free tier = 50 vsude)

#### [DB-04] Chybejici index na user_tokens.user_id
- **Problem:** `deduct_tokens_atomic` dela `SELECT ... WHERE user_id = ? FOR UPDATE` — bez indexu = seq scan
- [ ] **Overit/pridat index na user_tokens(user_id)**

#### [DB-05] Chybejici cleanup job pro sandbox sessions
- **Problem:** `academy_sandbox_sessions` ma `expires_at` sloupec a cleanup index, ale NE cleanup cron
- [ ] **Nastavit Supabase pg_cron pro automaticky cleanup expirovanich sessions**

---

## 4. VERCEL A DEPLOYMENT

### 4.1 Checklist

#### [DEP-01] Zadne testy v CI
- **Problem:** Ani `supabase-deploy.yml` ani `vercel-deploy.yml` nespousti testy
- **Riziko:** Broken kod se muze dostat do produkce
- [ ] **Pridat testing step do CI** (alespon type-check + lint)

#### [DEP-02] Zadny lint v CI
- **Problem:** ESLint config existuje, ale neni soucasti CI pipeline
- [ ] **Pridat lint step do vercel-deploy.yml**

#### [DEP-03] Chybejici preview deployments
- **Problem:** Vercel deploy jen na `main` — PR nemaji preview URL
- [ ] **Nastavit Vercel preview deployments pro PR** (Vercel to umi out of the box)

#### [DEP-04] Node.js verze
- **Soubor:** `package.json:6` — `"node": ">=18"`
- **Poznamka:** CI pouziva Node 22, coz je OK ale neni v package.json
- [ ] **Sjednotit: Updat engines na `"node": ">=20"`** (LTS)

#### [DEP-05] Build nemusi projit s TypeScript chybami
- **Soubor:** `tsconfig.json:16` — `"strict": false`
- **Problem:** TS strict mode je vypnut, `checkJs: false`, `noUnusedLocals: false`
- [ ] **Postupne zapnout strict mode** (alespon `strictNullChecks`)

---

## 5. ARCHITEKTURA A KOD

### 5.1 Checklist

#### [ARCH-01] Mix .js/.jsx a .ts/.tsx
- **Problem:** API routes jsou v TypeScript, frontend v plain JavaScript
- **Poznamka:** Ne kriticke, ale ztezuje typovou bezpecnost
- [ ] **Postupne migrovat frontend na TypeScript** (nizsi priorita)

#### [ARCH-02] Zadne testy
- **Problem:** Zadny testovaci framework, zadne unit/integration/e2e testy
- [ ] **Pridat Vitest** (funguje nativne s Vite)
- [ ] **Napsat testy alespon pro: auth flow, token deduction, API routes**

#### [ARCH-03] Duplicitni ALLOWED_ORIGINS
- **Soubory:** `api/generate-topic.ts:214`, `api/invokeLLM.ts:27`, `api/invokeEduLLM.ts:67`
- **Problem:** CORS allowlist je hardcodovany 3x — pri zmene domeny se musi menit vsude
- [ ] **Extrahovat ALLOWED_ORIGINS do sdileneho modulu** (napr. `api/_cors.ts`)

#### [ARCH-04] Duplicitni dompurify dependency
- **Soubor:** `package.json:72,76` — `dompurify` i `isomorphic-dompurify`
- **Problem:** `isomorphic-dompurify` wrapuje `dompurify` — staci jen jeden
- [ ] **Odstranit `dompurify` z dependencies** (nechat jen `isomorphic-dompurify`)

#### [ARCH-05] Chybejici Error Boundary pro jednotlive sekce
- **Soubor:** `src/App.jsx:68` — globalni ErrorBoundary existuje
- **Poznamka:** Chyba v jedne sekci shousi celou aplikaci
- [ ] **Pridat granularni ErrorBoundary** kolem kritickych sekcii (nizsi priorita)

#### [ARCH-06] Chybejici scripts v package.json
- **Problem:** Pouze `dev`, `build`, `preview`, `doctor` — chybi:
  - `lint` — ESLint existuje ale neni v scripts
  - `type-check` — TypeScript existuje ale neni kontrolovany
  - `test` — zadny testovaci framework
- [ ] **Pridat scripts: `lint`, `type-check`, `test`**

---

## 6. SUPABASE KONFIGURACE

#### [SUP-01] Edge Functions deployed s --no-verify-jwt
- **Soubor:** `.github/workflows/supabase-deploy.yml:57,62`
- **Poznamka:** Funkce maji vlastni JWT verifikaci — OK ale nestandartni
- [ ] **Zvazit: Odebrat --no-verify-jwt a pouzit Supabase built-in JWT verifikaci**

#### [SUP-02] Chybejici supabase/config.toml v repu
- **Soubor:** `.gitignore:36` — `supabase/config.toml` je v gitignore
- **Problem:** Konfigurace neni verzovana — novy vyvojar musi nastavit manualne
- [ ] **Pridat supabase/config.toml.example** s default nastavenim

#### [SUP-03] Chybejici Supabase type generation
- **Problem:** Zadny `supabase gen types` — vsechny DB typy jsou `any`
- [ ] **Nastavit automatickou generaci Supabase typu** (`supabase gen types typescript`)

---

## 7. PRIORITIZOVANY AKCNI PLAN

### Faze 1 — Bezpecnost (kriticke)
1. [ ] [SEC-01] Fix XSS v GeminiWeeklyDigest (DOMPurify)
2. [ ] [SEC-02] Povinnou auth na vsechny AI endpointy
3. [ ] [SEC-03] Implementovat rate limiting (@upstash/ratelimit)
4. [ ] [SEC-04] Fix CORS wildcard na edge functions
5. [ ] [SEC-06] Odstranit env disclosure z /api/test

### Faze 2 — Databaze a konzistence
6. [ ] [DB-01] Zakladni migrace pro puvodni tabulky
7. [ ] [DB-02] Sjednotit api_call_log schema
8. [ ] [DB-03] Sjednotit default tokeny (free tier)
9. [ ] [DB-04] Index na user_tokens
10. [ ] [SEC-07] Konsolidovat Supabase admin klienty
11. [ ] [SEC-08] Odstranit legacy token fallback

### Faze 3 — CI/CD a kvalita
12. [ ] [DEP-01] Pridat testy do CI
13. [ ] [DEP-02] Pridat lint do CI
14. [ ] [ARCH-06] Pridat lint/type-check/test scripts
15. [ ] [ARCH-02] Setup Vitest + zakladni testy
16. [ ] [DEP-03] Preview deployments
17. [ ] [SUP-03] Supabase type generation

### Faze 4 — Refaktor a zlepseni
18. [ ] [ARCH-03] Extrahovat ALLOWED_ORIGINS
19. [ ] [ARCH-04] Cleanup duplicitni dompurify
20. [ ] [DEP-05] Postupne strict TypeScript
21. [ ] [DB-05] Sandbox session cleanup cron
22. [ ] [SUP-01] Zvazit JWT verify na edge functions
23. [ ] [SUP-02] Pridat config.toml.example

### Git konsolidace (okamzite)
24. [ ] Smazat lokalni `master` branch
25. [ ] Nastavit branching strategii

---

## 8. SOUHRN

| Kategorie | Kriticke | Vysoka | Stredni | Nizka |
|-----------|---------|--------|---------|-------|
| Bezpecnost | 1 (XSS) | 3 (auth, rate limit, CORS) | 3 | 1 |
| Databaze | 0 | 1 (migrace) | 4 | 0 |
| Deployment | 0 | 1 (testy v CI) | 2 | 1 |
| Architektura | 0 | 1 (zadne testy) | 3 | 2 |
| **Celkem** | **1** | **6** | **12** | **4** |

### Co funguje dobre
- Supabase auth architektura (Bearer token, app_metadata roles)
- RLS na Academy tabulkach (7 tabulek, vsechny s politikami)
- Atomicke token deduction s row-level locking
- Prompt caching pro snizeni nakladu na AI
- PII detekce v sandbox
- DOMPurify v HTMLContent.jsx
- Security headers v vercel.json
- Strukturovane API routes s validaci (Zod)
- API cost tracking a logging
