# MedVerse EDU — Master Development Checklist

> **Verze:** 1.0 | **Datum:** 12.2.2026
> **Trh:** CZ/SK primárně, architektura připravená na expanzi (EN, DE, PL)
> **Stack:** React + Vite + Vercel | Supabase | Claude Sonnet 4

---

## FÁZE 0: Audit & Cleanup (Týden 1–2)
*Než začneme stavět nové, musíme mít čistý základ.*

### 0.1 Kódová hygiena
- [ ] **Sjednotit AI_VERSION_TAG** — frontend (`aiConfig.jsx`) říká `medverse_claude_sonnet_4_v1`, backend (`invokeEduLLM.ts`) říká `medverse_gemini_1.5_pro_v3`. Vytvořit single source of truth.
- [ ] **Odstranit Base44 SDK závislost** — `base44Client.js` importuje `@base44/sdk`. Vytvořit čistý Supabase wrapper bez Base44 abstrakce.
- [ ] **Smazat mrtvý kód** — `src/components/backup_hippo/` a další backup soubory.
- [ ] **Entity mapping cleanup** — `ENTITY_TABLES` vs `ENTITY_CONFIG` mají duplicity a nekonzistence (`obory` vs `clinical_disciplines`). Sjednotit na jeden systém.
- [ ] **Audit TODO/FIXME komentářů** — projít celý codebase, katalogizovat technický dluh.

### 0.2 Database audit
- [ ] **Zmapovat aktuální schéma** — exportovat kompletní DDL z Supabase, zdokumentovat všechny tabulky a relace.
- [ ] **Audit RLS policies** — spustit Supabase security advisors, zkontrolovat že každá tabulka má RLS.
- [ ] **Indexy** — zkontrolovat indexy na často filtrovaných sloupcích (`user_id`, `question_id`, `obor_id`, `next_review_at`).
- [ ] **Migrační strategie** — zavést číslované migrace přes Supabase CLI místo ad-hoc SQL.

### 0.3 Vercel & deployment
- [ ] **Ověřit Vercel konfiguraci** — `vercel.json` rewrites, environment variables, edge function limits.
- [ ] **Staging environment** — vytvořit preview branch deployment pro testování.
- [ ] **Environment variables audit** — sjednotit `.env` klíče, odstranit nepoužívané (VITE_OPENAI_API_KEY?).

---

## FÁZE 1: Stabilizace core (Týden 3–6)
*Opravit to, co je rozbitné nebo mocknuté.*

### 1.1 ContentReview → skutečný AI review pipeline
- [ ] **Nahradit mock review** reálným AI voláním (Claude s medical fact-check promptem).
- [ ] **Definovat review schéma** — severity levels, kategorie chyb (dosage, contraindication, outdated guideline, missing info).
- [ ] **Review status workflow** — `draft → ai_reviewed → expert_reviewed → published`.
- [ ] **Uložení review výsledků do DB** — nová tabulka `content_reviews`.

### 1.2 SRS → FSRS algoritmus
- [ ] **Nastudovat FSRS spec** (open-spaced-repetition/fsrs4anki).
- [ ] **Implementovat FSRS v `srs.jsx`** — nahradit stávající calculateNextReview().
- [ ] **Migrace existujících user_progress záznamů** — přepočítat parametry (difficulty, stability, retrievability).
- [ ] **Přidat rating stupnici** — FSRS používá 4 stupně (Again, Hard, Good, Easy) místo 3.
- [ ] **A/B test** — měřit retenci u starého vs nového algoritmu.

### 1.3 Internacionalizace – příprava (i18n foundation)
- [ ] **Zavést i18n framework** — `next-intl` nebo `react-i18next`.
- [ ] **Extrahovat hardcoded české texty** z komponent do locale souborů.
- [ ] **Locale routing** — `/cs/dashboard`, `/sk/dashboard` (zatím jen CZ/SK).
- [ ] **AI prompty parametrizovat** — jazyk odpovědi jako proměnná, ne hardcoded "čeština".
- [ ] **DB obsah** — přidat `locale` sloupec k tabulkám `topics`, `articles`, `questions`.

### 1.4 Testing foundation
- [ ] **Vitest setup** — unit testy pro utility funkce (SRS, AI parsing, entity mapping).
- [ ] **Playwright setup** — e2e testy pro kritické flows (login → dashboard → review session).
- [ ] **AI output quality testy** — automatizované kontroly: confidence scoring accuracy, citace přítomny, žádné halucinace v known test cases.
- [ ] **CI pipeline** — GitHub Actions: lint + test + build na každý PR.

---

## FÁZE 2: Adaptivní učení (Týden 7–12)
*Hlavní diferenciátor — AI, které opravdu rozumí, co student neví.*

### 2.1 Knowledge Graph
- [ ] **Definovat topic dependency model** — tabulka `topic_prerequisites` (topic_id, requires_topic_id, strength).
- [ ] **Naplnit prerekvizity** pro pilotní obor (např. Interna → Kardiologie).
- [ ] **Vizualizace** — interaktivní mapa závislostí mezi tématy (D3/React Flow).
- [ ] **AI auto-detection** — Claude analyzuje obsah a navrhne prerekvizity.

### 2.2 Gap Analysis Engine
- [ ] **Error pattern tracking** — nová tabulka `user_error_patterns` (user_id, topic_id, error_type, frequency).
- [ ] **Kategorizace chyb** — faktová chyba, konceptuální nepochopení, nedostatečný základ, nepozornost.
- [ ] **AI diagnostika** — po X špatných odpovědích Claude analyzuje vzorec a navrhne, co doplnit.
- [ ] **Dashboard widget** — "Tvoje slabiny: Farmakologie β-blokátorů (3 chyby za týden)".

### 2.3 Personalizované learning paths
- [ ] **Cíl-orientované plánování** — uživatel zadá "Atestace z Interny za 6 měsíců", AI vytvoří plán.
- [ ] **Adaptive sequencing** — systém dynamicky přeřazuje témata podle výkonu.
- [ ] **Denní doporučení** — "Dnes bys měl opakovat X a naučit se nové Y".
- [ ] **Progress prediction** — "Při současném tempu budeš připraven za N týdnů".

### 2.4 Confidence Calibration
- [ ] **Pre-answer confidence** — před odpovědí na otázku student odhadne jistotu (1–5).
- [ ] **Calibration score** — porovnání odhadu vs. realita, vizualizace přes čas.
- [ ] **Metacognitive feedback** — "Často si myslíš, že znáš farmakologii, ale chybovost je 40%".
- [ ] **Dunning-Kruger detection** — identifikace oblastí s přehnanou sebedůvěrou.

---

## FÁZE 3: Interaktivní learning (Týden 13–20)
*Od pasivního čtení k aktivnímu klinickému myšlení.*

### 3.1 Case Simulator (MVP)
- [ ] **Datový model** — tabulky `clinical_cases`, `case_steps`, `case_decisions`.
- [ ] **Step-by-step flow** — prezentace → anamnéza → vyšetření → diff. dg. → terapie → outcome.
- [ ] **AI-generated cases** — Claude generuje případy na základě tématu a obtížnosti.
- [ ] **Branching logic** — různé volby vedou k různým průběhům (správná/suboptimální/špatná cesta).
- [ ] **Scoring** — hodnocení klinického uvažování, ne jen finální odpovědi.
- [ ] **Pilotní sada** — 10 případů per obor (Interna, Chirurgie, Pediatrie).
- [ ] **Feedback po případu** — Claude rozebere, co student udělal dobře/špatně a proč.

### 3.2 Interaktivní diagnostické flowcharty
- [ ] **Flowchart engine** — React Flow komponenta pro interaktivní rozhodovací stromy.
- [ ] **AI generování** — Claude vytvoří flowchart JSON z textu tématu.
- [ ] **Klikatelné uzly** — klik na uzel zobrazí detail (vysvětlení, zdroj, mini-quiz).
- [ ] **Pilotní flowcharty** — akutní stavy (bolest na hrudi, dušnost, AKI).

### 3.3 Microlearning režim
- [ ] **Daily micro-session** — 5minutové bloky: 3 flashcards + 2 MCQ.
- [ ] **Flashcard komponenta** — flip card s otázkou/odpovědí, FSRS rating.
- [ ] **Mobile-first design** — optimalizováno pro palec, velké touch targets.
- [ ] **Quick quiz** — 5 otázek z due fronty, timer, instant feedback.
- [ ] **Streak tracking** — série po sobě jdoucích dnů, motivační prvky.
- [ ] **Push notifikace** — optimální čas pro opakování (PWA notification API).

### 3.4 Audio & multimédia
- [ ] **Audio high-yield** — TTS generování audio shrnutí (Supabase Storage + Edge Function).
- [ ] **Audio player komponenta** — přehrávač s rychlostí 1x/1.5x/2x, záložky.
- [ ] **Interaktivní obrázky** — anotovatelné medicínské ilustrace (hotspots).
- [ ] **Video embedding** — podpora externích videí (YouTube, Vimeo) u témat.

---

## FÁZE 4: Social & Engagement (Týden 21–28)
*Komunita a gamifikace pro dlouhodobou retenci.*

### 4.1 Kontextové diskuze
- [ ] **Komentáře u otázek** — discussion thread přímo pod každou otázkou.
- [ ] **Komentáře u témat** — diskuze v kontextu studijního materiálu.
- [ ] **Upvote/downvote** — nejlepší odpovědi nahoře.
- [ ] **AI moderace** — Claude flaguje nesprávné medicínské informace v diskuzích.
- [ ] **Notifikace** — odpovědi na moje komentáře.

### 4.2 Study Groups & Social
- [ ] **Studijní skupiny** — vytvoření skupiny, pozvání spolužáků.
- [ ] **Sdílený progress** — členové vidí, kdo co studuje.
- [ ] **Group challenges** — "Kdo zvládne víc otázek z Kardiologie tento týden?"
- [ ] **Anonymní benchmarking** — "Jsi v top 15% studentů u tohoto tématu".

### 4.3 Gamifikace
- [ ] **Achievement systém** — badges za milníky (100 otázek, 7-day streak, mastery oboru).
- [ ] **XP & levels** — experience points za aktivity, levelování.
- [ ] **Leaderboard** — týdenní/měsíční žebříčky (opt-in).
- [ ] **Daily streaks** — vizuální kalendář s fire emoji, streak freeze za premium.

### 4.4 Competency Dashboard
- [ ] **Kompetence mapping** — otázky/témata tagged na kompetence (diagnostika, terapie, prevence, komunikace, urgentní stavy).
- [ ] **Radar chart** — vizualizace profilu kompetencí studenta.
- [ ] **Srovnání s cílem** — "Pro atestaci potřebuješ 80% u Diagnostiky, máš 62%".
- [ ] **Portfolio export** — PDF report pro školitele/vedoucího.

---

## FÁZE 5: Platform & Scale (Týden 29+)
*Připravit platformu na růst a monetizaci.*

### 5.1 Architektura pro expanzi
- [ ] **Multi-tenant content** — obsah tagovaný locale (cs, sk, en), fallback logika.
- [ ] **Curriculum framework** — podpora různých kurikul (CZ atestace, SK atestace, EU specialty training).
- [ ] **Content API** — oddělení obsahu od UI, headless CMS přístup.
- [ ] **Rate limiting & quotas** — per-user AI limity, fair use policy.

### 5.2 Premium & monetizace
- [ ] **Stripe integrace** — platební brána pro CZ/SK (karty, bankovní převod).
- [ ] **Plánový systém** — Free / Pro / Team / Institution pricing.
- [ ] **Usage-based AI billing** — tracking AI tokenů per user, limity dle plánu.
- [ ] **Trial period** — 14 dní full access, pak downgrade.
- [ ] **Institutional licensing** — bulk licence pro nemocnice a fakulty.

### 5.3 Analytics & admin
- [ ] **Admin analytics dashboard** — DAU/MAU, retence, AI usage, top otázky, error rates.
- [ ] **User analytics** — studijní čas, completion rates, churn prediction.
- [ ] **Content analytics** — které materiály jsou nejpoužívanější, kde studenti selhávají.
- [ ] **A/B testing framework** — testování různých learning flows.

### 5.4 Bezpečnost & compliance
- [ ] **GDPR compliance** — data export, right to deletion, cookie consent.
- [ ] **Audit logging** — kdo co editoval, plný audit trail pro obsah.
- [ ] **Penetration test** — security audit před spuštěním pro instituce.
- [ ] **Data backup strategy** — automatické zálohy Supabase DB.

### 5.5 PWA & offline
- [ ] **Service Worker** — caching strategie pro offline přístup.
- [ ] **Offline flashcards** — stažení due fronty, sync po návratu online.
- [ ] **App-like experience** — install prompt, splash screen, home screen icon.
- [ ] **Background sync** — progress se synchronizuje po obnovení připojení.

---

## Tracking & Priority Legend

| Priorita | Značka | Popis |
|-----------|--------|-------|
| P0 — Blokující | 🔴 | Bez tohoto nelze pokračovat |
| P1 — Kritické | 🟠 | Silně ovlivňuje UX/kvalitu |
| P2 — Důležité | 🟡 | Výrazně zlepšuje produkt |
| P3 — Nice to have | 🟢 | Přidává hodnotu, není urgentní |

### Doporučená startovní sekvence (první 3 kroky):

```
1. FÁZE 0.1 → Kódová hygiena (AI version tag, Base44 cleanup)
2. FÁZE 0.2 → Database audit (schéma, RLS, indexy)
3. FÁZE 1.1 → ContentReview oprava (mock → real AI)
```

---

> **Poznámka:** Tento checklist je živý dokument. Po dokončení každé položky ji označíme jako hotovou a případně přidáme poznámky o implementačních rozhodnutích. Každou fázi budeme řešit krok po kroku v konverzaci.
