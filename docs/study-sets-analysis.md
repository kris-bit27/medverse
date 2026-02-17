# Studijní balíčky — Analýza & Návrh redesignu

## Aktuální stav

**UI existuje, backend neexistuje.** Stránka `StudyPackages.jsx` (706 řádků) obsahuje:
- Upload souborů → Supabase storage bucket `study-packs` (neexistuje)
- Tabulky `study_packs`, `study_pack_files`, `study_pack_outputs` (neexistují)
- API endpoint `processStudyPack` (neexistuje)
- Taby "Moje / Sdílené / Veřejné balíčky" → dotazují `study_packages` (neexistuje)
- `StudyPackageCreate.jsx` — formulář s výběrem questions/articles/tools

**Celé je to mrtvý kód.** Žádný uživatel to nemůže použít.

---

## Analýza Studyfi a konkurence

### Co dělá Studyfi (česká appka, studyfi.com)
- **Upload materiálů** → PDF, prezentace, fotky poznámek
- **AI generuje:** kartičky, souhrny, kvízy, mind mapy
- **Spaced repetition** na vygenerované kartičky
- **Cílová skupina:** VŠ studenti, maturanti — generický vzdělávací obsah

### Co dělají další (StudyFetch, Mindgrasp, Unstuck)
- Upload libovolného formátu (PDF, DOCX, PPTX, MP3, MP4, YouTube)
- AI tutor (chat s materiálem)
- Automatické flashcards, quizzes, summaries
- Podcast/přednáška z materiálu (StudyFetch)

### Klíčový insight pro MedVerse

**MedVerse NENÍ Studyfi.** Rozdíly:

| Studyfi | MedVerse |
|---------|----------|
| Generický obsah (cokoliv) | Medicínský obsah (atestace) |
| Student si nahraje vlastní materiál | MedVerse MÁ kurátorovaný obsah (1468 témat, 15360 FC, 3452 MCQ) |
| AI musí generovat vše od nuly | AI doplňuje existující profesionální obsah |
| Žádná taxonomie | Obory → Okruhy → Témata + VP vazby |

**Kopírovat Studyfi 1:1 nedává smysl.** MedVerse už má to, co Studyfi teprve generuje z nahraných PDF.

---

## Návrh: Co by "Studijní balíčky" měly být v MedVerse

### Koncept: **Vlastní studijní sady** (Study Sets)

Uživatel si sestaví vlastní kolekci z existujícího obsahu MedVerse + volitelně nahraje vlastní materiály, a AI mu z toho vytvoří personalizovaný studijní balíček.

### Dva režimy:

#### 1. **Z portálu** (primární, zero-cost)
- Uživatel vybere témata (z 1468 existujících)
- Může přidat jednotlivé flashcards nebo MCQ
- AI automaticky vygeneruje:
  - **Souhrn** — klíčové body ze všech vybraných témat (1 strana A4)
  - **Studijní plán** — optimální pořadí studia
  - **Custom kvíz** — mixované otázky z vybraných témat
- Uživatel může balíček sdílet s kolegy

#### 2. **Vlastní upload** (sekundární, AI cost)
- Upload PDF/DOCX/TXT/PPTX (max 10MB)
- Krátké zadání: "Co přesně chci zpracovat"
- AI vygeneruje:
  - **Souhrn klíčových bodů** (high-yield formát jako u témat)
  - **Flashcards** (automaticky uložené do SRS)
  - **MCQ otázky** (pro self-test)
- Volitelně: propojit s existujícím tématem v MedVerse

### Co NEDĚLAT:
- ❌ Generovat plný text z nahraného PDF (drahé, MedVerse už obsah má)
- ❌ Mind mapy, podcasty, video (overengineering, nízký ROI pro atestaci)
- ❌ Veřejné sdílení nahraných materiálů (copyright problémy)
- ❌ Komplexní kolaborativní editor

---

## Technický plán implementace

### Database

```sql
-- Studijní sady (balíčky)
CREATE TABLE study_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  topic_ids UUID[] DEFAULT '{}',         -- vybraná témata z portálu
  flashcard_ids UUID[] DEFAULT '{}',     -- vybrané kartičky
  question_ids UUID[] DEFAULT '{}',      -- vybrané otázky
  ai_summary TEXT,                        -- AI-generovaný souhrn
  ai_study_plan JSONB,                   -- AI-generovaný studijní plán
  status TEXT DEFAULT 'draft',           -- draft, ready, archived
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Nahrané soubory k sadě
CREATE TABLE study_set_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_set_id UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,                    -- extrahovaný text z PDF/DOCX
  status TEXT DEFAULT 'uploaded',        -- uploaded, processing, ready, error
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI výstupy z uploadu
CREATE TABLE study_set_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_set_id UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES study_set_uploads(id),
  output_type TEXT NOT NULL,             -- summary, flashcards, questions
  content JSONB NOT NULL,                -- strukturovaný výstup
  model_used TEXT,
  cost_usd NUMERIC(6,4),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Storage bucket
```
study-set-uploads/
  {user_id}/{set_id}/{filename}
```

### API endpoints
1. `POST /api/study-set/generate-summary` — AI souhrn z vybraných témat
2. `POST /api/study-set/process-upload` — extrakce textu + AI zpracování
3. `POST /api/study-set/generate-quiz` — custom kvíz z témat

### UI Flow
1. **Seznam sad** — grid karet (moje / sdílené)
2. **Nová sada** — stepper wizard:
   - Krok 1: Název + popis
   - Krok 2: Vybrat témata (multi-select s hledáním, seskupeno podle oboru)
   - Krok 3: Volitelně upload souboru
   - Krok 4: AI zpracování (souhrn, FC, kvíz)
3. **Detail sady** — obsah, AI výstupy, export

### Odhad nákladů AI
- Souhrn z 5 témat (Sonnet): ~$0.01
- Flashcards z uploadu (Sonnet): ~$0.02
- MCQ z uploadu (Sonnet): ~$0.02
- **Celkem per balíček: $0.01–$0.05**

---

## Prioritizace

### Fáze 1 (teď — MVP)
- [x] DB migrace (study_sets, study_set_uploads, study_set_outputs)
- [x] Storage bucket
- [ ] UI: Nová stránka StudyPackages s topic selection
- [ ] AI: Souhrn z vybraných témat
- [ ] Základní sdílení (public link)

### Fáze 2 (po validaci)
- [ ] Upload PDF/DOCX + text extrakce
- [ ] AI flashcards z uploadu
- [ ] AI MCQ z uploadu

### Fáze 3 (pokud je zájem)
- [ ] Export do PDF
- [ ] Propojení s SRS (kartičky z uploadu do opakování)
- [ ] Sdílení v komunitě

---

## Doporučení

**Začni Fází 1.** Topic selection + AI souhrn je zero-upload, zero-storage, minimální AI cost. Uživatel okamžitě vidí hodnotu — vybere si 5 témat a dostane personalizovaný souhrn. To je diferenciátor oproti Studyfi — MedVerse má kvalitní medicínský obsah, na který se Studyfi nemůže spolehnout.

Upload souborů přidej až v Fázi 2, po validaci, že uživatelé feature skutečně chtějí.
