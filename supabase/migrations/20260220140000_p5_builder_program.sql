-- P5: Builder Program — RPC helpers, schema additions, RLS, prompt template support

-- ═══════════════════════════════════════════════════════
-- 1. increment_builder_stat RPC
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_builder_stat(
  p_user_id UUID,
  p_stat_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE academy_builder_applications
  SET contribution_stats = jsonb_set(
    contribution_stats,
    ARRAY[p_stat_key],
    to_jsonb(COALESCE((contribution_stats->>p_stat_key)::int, 0) + 1)
  ),
  updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'accepted';
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 2. Track column on academy_courses
-- ═══════════════════════════════════════════════════════
ALTER TABLE academy_courses
  ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'clinician'
    CHECK (track IN ('clinician', 'research'));

-- ═══════════════════════════════════════════════════════
-- 3. Extend academy_lessons content_type to include prompt_template
-- ═══════════════════════════════════════════════════════
ALTER TABLE academy_lessons
  DROP CONSTRAINT IF EXISTS academy_lessons_content_type_check;

ALTER TABLE academy_lessons
  ADD CONSTRAINT academy_lessons_content_type_check
  CHECK (content_type IN ('article', 'interactive', 'sandbox', 'case_study', 'quiz', 'video', 'prompt_template'));

-- ═══════════════════════════════════════════════════════
-- 4. RLS: Builders can read topics with status = 'in_review'
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'builders_read_review_topics' AND tablename = 'topics'
  ) THEN
    CREATE POLICY builders_read_review_topics ON topics
      FOR SELECT
      USING (
        status = 'in_review'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid()
            AND is_builder = true
        )
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- 5. RLS: Builders can insert content_feedback
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'builders_insert_feedback' AND tablename = 'content_feedback'
  ) THEN
    -- Only create if content_feedback table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_feedback') THEN
      CREATE POLICY builders_insert_feedback ON content_feedback
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
              AND is_builder = true
          )
        );
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- 6. Seed 5 prompt templates as academy_lessons
-- ═══════════════════════════════════════════════════════
-- We need a course for prompt templates. Create one if it doesn't exist.
INSERT INTO academy_courses (
  id, title, slug, description, level, order_index, is_active, is_free, icon, estimated_minutes, xp_reward, track
) VALUES (
  'a0000000-0000-0000-0000-000000000099',
  'Knihovna promptů',
  'prompt-library',
  'Připravené prompt šablony pro klinickou praxi',
  1,
  99,
  true,
  true,
  '📋',
  15,
  0,
  'clinician'
) ON CONFLICT (slug) DO NOTHING;

-- Insert prompt template lessons
INSERT INTO academy_lessons (id, course_id, title, slug, content_type, order_index, is_active, xp_reward, content) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000099',
  'DDx strukturovaný prompt',
  'ddx-structured-prompt',
  'prompt_template',
  1,
  true,
  5,
  '{
    "template_name": "DDx strukturovaný prompt",
    "category": "clinical_ddx",
    "workflow": "ambulance",
    "template": "Pacient: [věk] [pohlaví]\nHlavní obtíž: [symptom]\nAnamnéza: [relevantní info]\n\nProsím vytvoř:\n1. Diferenciální diagnózu (top 5) seřazenou dle pravděpodobnosti\n2. Pro každou diagnózu uveď: pro/contra z anamnézy\n3. Navrhni 3 klíčová vyšetření k rozlišení\n4. Red flags — co nesmím přehlédnout\n\nFormát: tabulka",
    "good_example": "Pacient: 65M\nHlavní obtíž: akutní bolest na hrudi, 2 hodiny, tlakového charakteru s propagací do levé paže\nAnamnéza: DM2, hypertenze, kuřák 30 let, statin\n\nProsím vytvoř:\n1. Diferenciální diagnózu (top 5) seřazenou dle pravděpodobnosti\n2. Pro každou diagnózu uveď: pro/contra z anamnézy\n3. Navrhni 3 klíčová vyšetření k rozlišení\n4. Red flags — co nesmím přehlédnout\n\nFormát: tabulka",
    "bad_example": "Bolí mě na hrudi, co to může být?",
    "tags": ["ddx", "ambulance", "structured_output"],
    "difficulty": "beginner"
  }'::jsonb
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000099',
  'Discharge summary helper',
  'discharge-summary-helper',
  'prompt_template',
  2,
  true,
  5,
  '{
    "template_name": "Discharge summary helper",
    "category": "documentation",
    "workflow": "dokumentace",
    "template": "Vytvoř propouštěcí zprávu:\n\nPacient: [jméno/iniciály], [věk], [pohlaví]\nDiagnóza: [hlavní dg + vedlejší]\nHospitalizace: [od] – [do]\n\nStruktura:\n1. Důvod přijetí\n2. Průběh hospitalizace (stručně)\n3. Provedená vyšetření a výsledky\n4. Terapie při propuštění (tabulka: lék | dávka | frekvence)\n5. Doporučení pro ambulantní péči\n6. Kontrola — kdy a kde\n\nJazyk: formální, český, lékařský styl",
    "good_example": "Vytvoř propouštěcí zprávu:\n\nPacient: J.N., 72M\nDiagnóza: Akutní STEMI přední stěny, stav po pPCI RIA\nHospitalizace: 15.2. – 20.2.2026\n\n(doplnit strukturu výše)",
    "bad_example": "Napiš propouštěčku pro pacienta co měl infarkt",
    "tags": ["dokumentace", "propouštěcí_zpráva", "structured_output"],
    "difficulty": "beginner"
  }'::jsonb
),
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000099',
  'Journal club critique',
  'journal-club-critique',
  'prompt_template',
  3,
  true,
  5,
  '{
    "template_name": "Journal club critique",
    "category": "research",
    "workflow": "výzkum",
    "template": "Analyzuj tento klinický článek:\n\nTitul: [název studie]\nČasopis: [journal]\nTyp studie: [RCT/kohortová/meta-analýza/...]\n\nProsím zhodnoť:\n1. PICO: Populace, Intervence, Komparátor, Outcome\n2. Metodologie: design, randomizace, zaslepení, sample size\n3. Výsledky: primární endpoint, NNT/NNH, CI\n4. Limitace: bias rizika (selection, performance, detection, attrition, reporting)\n5. Klinická relevance: změnil by tento výsledek mou praxi? Proč ano/ne?\n6. GRADE hodnocení kvality důkazů\n\nBuď kritický, ne popisný.",
    "good_example": "Analyzuj tento klinický článek:\n\nTitul: DAPA-HF trial — Dapagliflozin in Heart Failure with Reduced Ejection Fraction\nČasopis: NEJM 2019\nTyp studie: Randomizovaná, dvojitě zaslepená, placebo-kontrolovaná\n\n(doplnit strukturu výše)",
    "bad_example": "Co si myslíš o DAPA-HF studii?",
    "tags": ["výzkum", "journal_club", "EBM", "critical_appraisal"],
    "difficulty": "intermediate"
  }'::jsonb
),
(
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000099',
  'Patient explanation (laický jazyk)',
  'patient-explanation',
  'prompt_template',
  4,
  true,
  5,
  '{
    "template_name": "Patient explanation",
    "category": "patient_communication",
    "workflow": "ambulance",
    "template": "Vysvětli pacientovi srozumitelně:\n\nDiagnóza: [diagnóza]\nPacient: [věk], [vzdělání/kontext]\n\nPožadavky:\n1. Laický jazyk — žádné latinské termíny (nebo je vysvětli)\n2. Analogie z běžného života\n3. Co to znamená pro každodenní život\n4. Co DĚLAT a co NEDĚLAT\n5. Kdy vyhledat akutní pomoc (red flags)\n6. Délka: max 200 slov\n\nTón: empatický, klidný, povzbuzující",
    "good_example": "Vysvětli pacientovi srozumitelně:\n\nDiagnóza: Fibrilace síní — nově diagnostikovaná, bez antikoagulace zatím\nPacient: 68F, bývalá učitelka, žije sama\n\n(doplnit strukturu výše)",
    "bad_example": "Vysvětli fibrilaci síní",
    "tags": ["komunikace", "ambulance", "laický_jazyk"],
    "difficulty": "beginner"
  }'::jsonb
),
(
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000099',
  'Red flags checklist',
  'red-flags-checklist',
  'prompt_template',
  5,
  true,
  5,
  '{
    "template_name": "Red flags checklist",
    "category": "clinical_safety",
    "workflow": "vizita",
    "template": "Vytvoř checklist red flags pro:\n\nKlinický kontext: [symptom nebo diagnóza]\nSetting: [ambulance/JIP/urgentní příjem]\n\nStruktura:\n1. 🔴 OKAMŽITÁ AKCE — příznaky vyžadující emergentní zásah\n2. 🟡 URGENTNÍ POZORNOST — do 24h vyšetřit/konzultovat\n3. 🟢 SLEDOVAT — ambulantní follow-up\n\nPro každý red flag uveď:\n- Příznak/nález\n- Proč je nebezpečný (patofyziologie 1 větou)\n- Co udělat (konkrétní krok)\n\nFormát: strukturovaný seznam, stručný",
    "good_example": "Vytvoř checklist red flags pro:\n\nKlinický kontext: Bolest hlavy — nově vzniklá, silná\nSetting: ambulance (praktický lékař)\n\n(doplnit strukturu výše)",
    "bad_example": "Jaké jsou red flags u bolesti hlavy?",
    "tags": ["safety", "vizita", "checklist", "red_flags"],
    "difficulty": "beginner"
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
