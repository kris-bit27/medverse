# MedVerse Feature Audit — February 2026

## Data Snapshot
- 7 oborů, 18 okruhů, 32 témat (14 s fulltextem, 1 published s kartičkami)
- 88 flashcards (všechny u 1 tématu — Akutní pankreatitida)
- 0 questions, 0 user_profiles, 0 forum threads
- 3 clinical tools, 3 drugs, 3 guidelines
- 42 DB tabulek, 7 API routes

---

## FEATURE-BY-FEATURE AUDIT

### ✅ FUNGUJE DOBŘE
| Feature | Stav | Pozn. |
|---------|------|-------|
| Auth (login/logout/callback) | ✅ | Supabase Auth, Google OAuth |
| Dashboard | ✅ | DashboardV2, studijní přehled |
| TopicDetail | ✅ | Konsolidovaný (V4 layout + V1 features) |
| ReviewToday (SRS) | ✅ | SM-2 algoritmus, DB persistence |
| FlashcardReviewV2 | ✅ | Funkční SRS review |
| Search | ✅ | Full-text search + ilike fallback |
| FloatingCopilot | ✅ | Claude Haiku 3, conversation history |
| ContentReview (admin) | ✅ | Claude Sonnet 4 AI review |
| StudyPlansV2 | ✅ | CRUD study plans |
| Leaderboards | ✅ | Supabase direct |
| StudyGroups | ✅ | CRUD + members |
| LogbookV2 | ✅ | Entry tracking, mentor verification |
| Atestace | ✅ | Progress tracking per okruh |
| Forum + ForumThread | ✅ | DB ready, CRUD migrated |
| Layout/Navigation | ✅ | Sidebar, dark theme, responsive |
| Code splitting | ✅ | 65 lazy-loaded routes, -70% bundle |
| Error boundary | ✅ | Catches render errors |

### ⚠️ FUNGUJE, ALE POTŘEBUJE PRÁCI
| Feature | Problém | Priorita |
|---------|---------|----------|
| **Studium/StudiumV2** | Zobrazuje obory→okruhy→témata, ale 14/32 témat nemá obsah | HIGH — potřebuje content pipeline (1.3) |
| **FlashcardGenerator** | Generuje kartičky přes AI, ale jen pro témata s obsahem | MEDIUM — závisí na obsahu |
| **TestGenerator → TestSession** | Kód migrován na Supabase, ale 0 questions v DB | HIGH — potřebuje questions |
| **TestResults/TestResultsV2** | Hotové UI, ale žádná data k zobrazení | depends on above |
| ~~**ClinicalCalculators**~~ | ✅ V2 s dynamickým loadem z DB, V1 archivován | ~~LOW~~ DONE |
| ~~**DrugDatabase**~~ | ✅ V2 s 15+ kategoriemi, taby, interakcemi. V1 archivován | ~~LOW~~ DONE |
| ~~**ClinicalGuidelines**~~ | ✅ ClinicalAlgorithmsV2 s interaktivními decision trees. V1 archivován | ~~LOW~~ DONE |
| ~~**Articles/ArticleDetail**~~ | ✅ Přesměrováno na MedSearch, redirect stuby archivovány | ~~MEDIUM~~ DONE |
| ~~**StudyPackages**~~ | ✅ Ověřeno — plně funkční CRUD + AI generace přes study-set-generate | ~~MEDIUM~~ DONE |
| ~~**StudyPlanAI**~~ | ✅ Opraven chybějící import `callApi`, flow funkční | ~~MEDIUM~~ DONE |
| **ScholarSearch** | Akademické vyhledávání přes LLM | LOW |

### ❌ NEFUNKČNÍ / MRTVÝ KÓD
| Feature | Problém | Akce |
|---------|---------|------|
| ~~**AdminAIStats**~~ | ✅ Archivován do _archived/ | DONE |
| ~~**Profile vs MyProfile**~~ | ✅ Konsolidováno na MyProfile | DONE |
| ~~**UserSettings vs AccountSettings**~~ | ✅ Konsolidováno na AccountSettings | DONE |
| ~~**Studium vs StudiumV2**~~ | ✅ Sjednoceno na StudiumV3 | DONE |
| ~~**TestGenerator vs TestGeneratorV2**~~ | ✅ Sjednoceno na V2 | DONE |
| ~~**TestSession vs TestSessionV2**~~ | ✅ Sjednoceno | DONE |
| ~~**TestResults vs TestResultsV2**~~ | ✅ Sjednoceno na V2 | DONE |
| ~~**AICopilotChat**~~ | ✅ Import odstraněn ze StudyPlanCreate, stub nahrazen FloatingCopilot odkazem | DONE |

---

## CO POTŘEBUJE AMBOSS/LECTURIO COMPETITOR

### Must-Have (MVP)
1. ~~**Page dedup**~~ ✅ — 6 duplicitních stránek archivováno — `7272998`
2. **Content** — 32 témat, ale jen 1 published s kartičkami. Potřeba: AI pipeline pro bulk generaci
3. **Questions/MCQ** — 0 otázek v DB. Potřeba: MCQ generátor nebo import
4. ~~**User onboarding**~~ ✅ — OnboardingWizard (4 kroky: jméno → role → obor → start) — `3e69f9f`
5. ~~**Mobile responsiveness**~~ ✅ — verified + padding fixes — `3e69f9f`

### Nice-to-Have (v2)
6. **Offline access** — PWA/service worker
7. **Spaced repetition dashboard** — vizuální heat map, streak calendar
8. **Collaborative notes** — sdílení poznámek ve skupinách
9. **OSCE/clinical cases** — interaktivní kazuistiky
10. **PDF export** — studijní materiály pro tisk
