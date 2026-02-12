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

## Phase 4 — Scale & Polish
- [ ] 4.1 Route-based code splitting (lazy loading)
- [ ] 4.2 Error monitoring (error boundaries + logging)
- [ ] 4.3 Bundle analysis & optimization
- [ ] 4.4 API rate limiting & error handling hardening

## Phase 5 — base44.entities Migration Debt
**199 calls in 44 files** — currently work via base44Client.js proxy → Supabase.
Migrate to direct `supabase.from()` calls for cleaner code and eventual SDK removal.

### Admin pages (11 files, ~80 calls)
- [ ] Admin.jsx, AdminAIStats.jsx, AdminAudit.jsx
- [ ] AdminArticleEdit.jsx, AdminArticles.jsx
- [ ] AdminCostAnalytics.jsx
- [ ] AdminQuestionEdit.jsx, AdminQuestions.jsx
- [ ] AdminTaxonomy.jsx
- [ ] AdminToolEdit.jsx, AdminTools.jsx, AdminUsers.jsx

### Content editors (5 files, ~40 calls)
- [ ] TopicContentEditor.jsx, TopicContentEditorV2.jsx
- [ ] TopicTemplateEditor.jsx
- [ ] AITaxonomyGenerator.jsx, QuestionImporter.jsx

### Study/Topic pages (10 files, ~35 calls)
- [ ] OkruhDetail.jsx, QuestionDetail.jsx
- [ ] Studium.jsx, StudyPackageCreate.jsx, StudyPackageDetail.jsx, StudyPackages.jsx
- [ ] StudyPlanAI.jsx, StudyPlanCreate.jsx, StudyPlanDetail.jsx, StudyPlanner.jsx

### Components (7 files, ~25 calls)
- [ ] AIExamTab.jsx, QuestionAIAssistant.jsx
- [ ] NotesTab.jsx, HighlightableText.jsx, TopicNotes.jsx
- [ ] CollaborationDialog.jsx, SaveCaseDialog.jsx

### Other pages (8 files, ~19 calls)
- [ ] Profile.jsx, UserSettings.jsx, EducationSettings.jsx
- [ ] ArticleDetail.jsx, Articles.jsx
- [ ] ToolDetail.jsx, Tools.jsx
- [ ] ReviewQueue.jsx, PageNotFound.jsx
