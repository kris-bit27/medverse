# MedVerse Migration Checklist 2026

## Phase 0 — Stabilization ✅
- [x] 0.1 Edge functions Base44 SDK removal (4 functions) — `0e09ccd`
- [x] 0.2 API layer consolidation (Vercel-only, FloatingCopilot fix) — `ced34b4`
- [x] 0.3 RLS security fixes (12 tables + broken policies) — DB migration
- [x] 0.4 Function search_path fixes (22 functions) — DB migration
- [x] 0.5 Dead code cleanup (-1396 lines) — `5662ae1`
- [x] 0.6 .env.example — `f588efb`
- [x] 0.7 Build verification — 0 errors, 3793 modules

## Phase 1 — Core Features (partial)
- [x] 1.1 ContentReview → real AI (Claude Sonnet 4) — `a2a17b9`
- [x] 1.2 FloatingCopilot (conversation history, copilot mode) — `a2a17b9`
- [ ] 1.3 Content pipeline (topics, questions, flashcards) — deferred
- [ ] 1.4 TopicDetail flow consolidation (V1/V2/V4) — deferred
- [ ] 1.5 Token/credit system end-to-end — deferred

## Phase 2 — Learning Experience ✅
- [x] 2.1 SRS end-to-end (ReviewToday SM-2 + DB persistence) — `f2d8078`
- [x] 2.2 Study Plans (already Supabase) — existing
- [x] 2.3 Test/Quiz (TestGenerator + TestSession → Supabase) — `f2d8078`
- [x] 2.4 Search (full-text search rewrite) — `f2d8078`

## Phase 3 — Social & Engagement ✅
- [x] 3.1 Forum (DB tables + CRUD migration) — `87843f2`
- [x] 3.2 Study Groups (already Supabase) — existing
- [x] 3.3 Gamification/Leaderboards (already Supabase) — existing
- [x] 3.4 Logbook/Atestace (migration) — `87843f2`

## Phase 4 — Scale & Polish ✅
- [x] 4.1 Route-based code splitting (1,982→583 KB, -70%) — `f46dfc7`
- [x] 4.2 Error boundary (ErrorBoundary + Suspense fallback) — `f46dfc7`
- [x] 4.3 Bundle optimization (implicit via splitting) — `f46dfc7`
- [x] 4.4 API error handling (callApi utility with auth) — `f2ab1ff`

## Phase 5 — base44 SDK Elimination ✅ COMPLETE
**Was: 199 calls in 44 files → Now: 0 calls, base44Client.js DELETED**

- [x] base44.functions.invoke → callApi() (15 files) — `f2ab1ff`
- [x] base44.agents → AICopilotChat stub — `f2ab1ff`
- [x] base44Client.js deleted (-567 lines) — `f2ab1ff`
- [x] localStorage keys: base44_ → medverse_ — `f2ab1ff`
