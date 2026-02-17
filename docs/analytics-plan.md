# MedVerse Analytika — Analýza & Plán

## 1. AI modely pro analytiku — srovnání

### Gemini pro analytiku: mýtus vs. realita

Tvrzení "Gemini je nejlepší na analytiku" je částečně pravdivé, ale s nuancí:

| Model | Silné stránky v analytice | Slabé stránky | Cena (na 1M tokenů) |
|-------|--------------------------|----------------|---------------------|
| **Gemini 2.5 Flash** | Nejlevnější, rychlý, dobrý na jednoduché agregace | Méně přesný u složitých úloh | ~$0.15 in / $0.60 out |
| **Gemini 2.5 Pro** | Strategické insighty, diagnostic frameworks, 1M kontextové okno | Verbose, "corporate gibberish" závěry | ~$1.25 in / $5.00 out |
| **Claude Sonnet 4** | Nejlepší prezentace dat, jasné tabulky, konzistentní logika | Dražší než Flash | $3 in / $15 out |
| **GPT-5** | Rigorous statistical analysis, math proofs | Drahý, overkill pro dashboardy | $2.50 in / $10 out |

**Závěr z benchmarků (Nov 2025, Khons.co):**
- Gemini 3 vyhrál 2/3 kategorií díky strategickým insightům
- GPT vyhrál rigorous analysis
- Claude vyhrál vizualizaci a prezentaci dat

### Doporučení pro MedVerse:

**Gemini Flash 2.0 pro analytiku — ANO, dává smysl:**
- Generování reportů ze studijních dat (levné, rychlé)
- Agregace a sumarizace user activity
- Weekly digest emails

**Claude Sonnet pro komplexní AI features — ponechat:**
- Content generation (fulltext, high-yield)
- MedSearch AI syntéza
- Hippo copilot (kvalita odpovědí je kritická v medicíně)

**Multi-model strategie:**
```
Gemini Flash  → analytika, reporty, extrakce, levné operace
Claude Sonnet → content, copilot, MedSearch, study sets
Claude Opus   → (jen admin) full content generation
```

---

## 2. Stav databáze pro analytiku

### Co MÁ data (použitelné okamžitě):
| Tabulka | Rows | Popis |
|---------|------|-------|
| `api_call_log` | 4,115 | AI volání — model, tokens, cost, mode |
| `analytics_events` | 41 | topic_opened, tab_switched, test_completed |
| `user_topic_mastery` | 31 | mastery score, study time, FC/MCQ stats |
| `study_sessions` | 25 | session type, duration, items reviewed |
| `test_answers` | 16 | answer data, is_correct, time_spent |
| `user_flashcard_progress` | 2 | SRS data — interval, easiness, streak |

### Co má tabulky ale 0 dat:
- `daily_usage_stats` — 0 rows (nikdy se neplnilo)
- `user_ai_usage` — 0 rows
- `token_transactions` — 0 rows
- `flashcard_review_sessions` — 0 rows
- `content_feedback` — 0 rows
- `user_subject_levels` — 0 rows

### Co existuje ale je stub:
- `AdminAnalytics.jsx` — 10 řádků, jen CacheAnalytics
- `AdminAIStats.jsx` — 92 řádků, basic
- `AdminCostAnalytics.jsx` — 87 řádků, wrapper

### Hlavní problém: EVENTS SE NELOGUJÍ
Aplikace téměř nesbírá user activity data. `analytics_events` má jen 41 rows 
(30 topic_opened + 10 tab_switched + 1 test_completed). Aby analytika fungovala, 
musíme NEJDŘÍV implementovat event tracking.

---

## 3. Implementační plán

### Fáze A: Event Tracking (předpoklad pro vše ostatní)

**Lightweight client-side tracker** — loguje do `analytics_events`:

```
Events to track:
- page_view           (page, referrer)
- topic_opened        (topic_id, source)
- topic_studied       (topic_id, duration_seconds, tab)
- flashcard_session   (topic_id, cards_reviewed, correct, duration)
- test_started        (topic_ids, question_count, mode)
- test_completed      (session_id, score, duration)
- search_query        (query, mode, results_count)
- study_set_created   (set_id, topic_count)
- copilot_used        (mode, topic_id)
- med_search_used     (query, mode)
```

**Implementace:** Custom hook `useAnalytics()` + Supabase insert (batched).

### Fáze B: Admin Analytics Dashboard

**Jedna nová stránka** `AdminAnalyticsV2.jsx` nahradí AdminAnalytics, AdminAIStats, AdminCostAnalytics:

**Metriky:**

1. **Overview karty:**
   - Total users / Active users (7d, 30d)
   - Topics studied this week
   - Tests completed this week
   - AI API cost this month
   - Total API calls / month trend

2. **Content coverage:**
   - Topics with content: 1252/1468
   - Topics with summaries: 1161/1468
   - Flashcards per topic distribution
   - MCQ per topic distribution

3. **AI Cost breakdown:**
   - Cost by mode (fulltext, high_yield, copilot, med-search)
   - Cost by model
   - Daily/weekly trend chart
   - Token usage breakdown

4. **User engagement (když budou events):**
   - Most popular topics
   - Average study session length
   - Test score distribution
   - Flashcard retention rates
   - Feature usage (MedSearch vs Copilot vs Study Sets)

### Fáze C: Uživatelská analytika

**Na Dashboard** přidat widgety:

1. **Studijní streak** — kolik dní po sobě uživatel studoval
2. **Weekly progress** — chart se studijním časem per den
3. **Mastery overview** — kolik témat na jaké úrovni
4. **Weak areas** — témata s nejnižším mastery score (existující WeakSpotsWidget)
5. **Test score trend** — graf vývoje skóre v čase

### Fáze D: Gemini Integration pro reporty

**Weekly Digest (Gemini Flash):**
- Cron/Edge function 1x týdně
- Gemini Flash analyzuje user activity
- Generuje personalizovaný report: "Tento týden jste studovali 5 témat, 
  vaše silná oblast je kardiologie, doporučujeme zopakovat pneumologii"
- Odešle emailem nebo zobrazí na dashboardu

---

## 4. Prioritizace

| Priorita | Co | Effort | Value |
|----------|----|--------|-------|
| 🔴 P0 | Event tracking hook + events | 2h | Základ pro vše |
| 🔴 P0 | Admin Analytics dashboard | 3h | Admins need visibility |
| 🟡 P1 | User dashboard widgety | 2h | User engagement |
| 🟡 P1 | Gemini API integrace | 1h | Multi-model ready |
| 🟢 P2 | Weekly digest (Gemini) | 2h | Retention |
| 🟢 P2 | Token system pro uživatele | 2h | Monetization ready |

**Doporučuji začít:** P0 — event tracking + admin dashboard v jednom bloku.
