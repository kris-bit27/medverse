-- Migration: Notes & Flashcards System
-- Date: 2026-02-10
-- Description: User notes s text highlighting a AI-generated flashcards se spaced repetition

-- ============================================
-- 1. USER NOTES
-- ============================================

-- Main notes table
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  
  -- Note content
  note_text TEXT NOT NULL,
  
  -- Text selection (NULL for general notes)
  selected_text TEXT,
  selection_start INT, -- Character position in content
  selection_end INT,
  
  -- Organization
  color VARCHAR(20) DEFAULT 'yellow', -- highlight color: yellow, blue, green, red, purple
  category VARCHAR(50), -- Optional: "important", "question", "summary", etc.
  is_pinned BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_selection CHECK (
    (selected_text IS NULL AND selection_start IS NULL AND selection_end IS NULL)
    OR 
    (selected_text IS NOT NULL AND selection_start IS NOT NULL AND selection_end IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_user_notes_user_topic ON user_notes(user_id, topic_id);
CREATE INDEX idx_user_notes_created ON user_notes(created_at DESC);
CREATE INDEX idx_user_notes_pinned ON user_notes(is_pinned) WHERE is_pinned = true;

-- Row Level Security
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON user_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON user_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON user_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON user_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. FLASHCARDS (AI-Generated)
-- ============================================

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  
  -- Card content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT, -- Optional: Why this answer is correct
  
  -- Metadata
  difficulty INT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3), -- 1=easy, 2=medium, 3=hard
  card_type VARCHAR(50) DEFAULT 'basic', -- basic, cloze, multiple_choice
  tags TEXT[], -- For categorization
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT true,
  ai_model VARCHAR(50),
  ai_confidence DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(topic_id, question)
);

-- Indexes
CREATE INDEX idx_flashcards_topic ON flashcards(topic_id);
CREATE INDEX idx_flashcards_difficulty ON flashcards(difficulty);

-- ============================================
-- 3. USER FLASHCARD PROGRESS (Spaced Repetition)
-- ============================================

CREATE TABLE IF NOT EXISTS user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  
  -- SM-2 Algorithm variables
  repetitions INT DEFAULT 0, -- Number of correct reviews in a row
  easiness DECIMAL(3,2) DEFAULT 2.50, -- Easiness factor (1.3 - 2.5)
  interval INT DEFAULT 0, -- Days until next review
  
  -- Review tracking
  next_review DATE DEFAULT CURRENT_DATE,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  total_reviews INT DEFAULT 0,
  correct_reviews INT DEFAULT 0,
  
  -- Session stats
  last_quality INT, -- 0-5 (how well user knew the answer)
  streak INT DEFAULT 0, -- Current streak of correct answers
  best_streak INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One progress record per user per card
  UNIQUE(user_id, flashcard_id)
);

-- Indexes
CREATE INDEX idx_flashcard_progress_user ON user_flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_next_review ON user_flashcard_progress(next_review);
CREATE INDEX idx_flashcard_progress_user_next ON user_flashcard_progress(user_id, next_review);

-- Row Level Security
ALTER TABLE user_flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_flashcard_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_flashcard_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_flashcard_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. REVIEW SESSIONS (Optional: for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS flashcard_review_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session info
  cards_reviewed INT NOT NULL,
  cards_correct INT NOT NULL,
  duration_seconds INT, -- How long the session took
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_sessions_user ON flashcard_review_sessions(user_id, created_at DESC);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get due flashcards for user
CREATE OR REPLACE FUNCTION get_due_flashcards(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
  flashcard_id UUID,
  question TEXT,
  answer TEXT,
  explanation TEXT,
  difficulty INT,
  repetitions INT,
  easiness DECIMAL,
  last_reviewed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.explanation,
    f.difficulty,
    COALESCE(p.repetitions, 0) as repetitions,
    COALESCE(p.easiness, 2.5) as easiness,
    p.last_reviewed
  FROM flashcards f
  LEFT JOIN user_flashcard_progress p ON f.id = p.flashcard_id AND p.user_id = p_user_id
  WHERE p.next_review IS NULL OR p.next_review <= CURRENT_DATE
  ORDER BY p.next_review NULLS FIRST, f.created_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update flashcard progress (SM-2 algorithm)
CREATE OR REPLACE FUNCTION update_flashcard_progress(
  p_user_id UUID,
  p_flashcard_id UUID,
  p_quality INT -- 0-5 rating
) RETURNS void AS $$
DECLARE
  v_repetitions INT;
  v_easiness DECIMAL(3,2);
  v_interval INT;
  v_new_easiness DECIMAL(3,2);
  v_new_interval INT;
  v_new_repetitions INT;
BEGIN
  -- Get current values or defaults
  SELECT 
    COALESCE(repetitions, 0),
    COALESCE(easiness, 2.5),
    COALESCE(interval, 0)
  INTO v_repetitions, v_easiness, v_interval
  FROM user_flashcard_progress
  WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;
  
  -- Calculate new values using SM-2 algorithm
  IF p_quality < 3 THEN
    -- Wrong answer: reset
    v_new_repetitions := 0;
    v_new_interval := 1;
    v_new_easiness := v_easiness;
  ELSE
    -- Correct answer: progress
    v_new_easiness := v_easiness + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    v_new_easiness := GREATEST(1.3, v_new_easiness);
    
    IF v_repetitions = 0 THEN
      v_new_interval := 1;
    ELSIF v_repetitions = 1 THEN
      v_new_interval := 6;
    ELSE
      v_new_interval := ROUND(v_interval * v_new_easiness);
    END IF;
    
    v_new_repetitions := v_repetitions + 1;
  END IF;
  
  -- Upsert progress
  INSERT INTO user_flashcard_progress (
    user_id, flashcard_id, repetitions, easiness, interval, 
    next_review, last_reviewed, total_reviews, 
    correct_reviews, last_quality, updated_at
  ) VALUES (
    p_user_id, p_flashcard_id, v_new_repetitions, v_new_easiness, v_new_interval,
    CURRENT_DATE + v_new_interval,
    NOW(),
    1,
    CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    p_quality,
    NOW()
  )
  ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
    repetitions = v_new_repetitions,
    easiness = v_new_easiness,
    interval = v_new_interval,
    next_review = CURRENT_DATE + v_new_interval,
    last_reviewed = NOW(),
    total_reviews = user_flashcard_progress.total_reviews + 1,
    correct_reviews = user_flashcard_progress.correct_reviews + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    last_quality = p_quality,
    streak = CASE WHEN p_quality >= 3 THEN user_flashcard_progress.streak + 1 ELSE 0 END,
    best_streak = GREATEST(user_flashcard_progress.best_streak, CASE WHEN p_quality >= 3 THEN user_flashcard_progress.streak + 1 ELSE 0 END),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_flashcard_stats(p_user_id UUID)
RETURNS TABLE (
  total_cards INT,
  cards_mastered INT,
  cards_learning INT,
  cards_due_today INT,
  average_easiness DECIMAL,
  best_streak INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_cards,
    COUNT(*) FILTER (WHERE repetitions >= 5)::INT as cards_mastered,
    COUNT(*) FILTER (WHERE repetitions > 0 AND repetitions < 5)::INT as cards_learning,
    COUNT(*) FILTER (WHERE next_review <= CURRENT_DATE)::INT as cards_due_today,
    AVG(easiness)::DECIMAL as average_easiness,
    MAX(best_streak)::INT as best_streak
  FROM user_flashcard_progress
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_notes TO authenticated;
GRANT SELECT ON flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_flashcard_progress TO authenticated;
GRANT SELECT, INSERT ON flashcard_review_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION get_due_flashcards TO authenticated;
GRANT EXECUTE ON FUNCTION update_flashcard_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_flashcard_stats TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_notes IS 'User-created notes with optional text highlighting';
COMMENT ON TABLE flashcards IS 'AI-generated flashcards for topic practice';
COMMENT ON TABLE user_flashcard_progress IS 'Spaced repetition progress using SM-2 algorithm';
COMMENT ON FUNCTION update_flashcard_progress IS 'Updates progress using SuperMemo SM-2 algorithm';

-- ============================================
-- EXAMPLE USAGE
-- ============================================

/*
-- Create a note
INSERT INTO user_notes (user_id, topic_id, note_text, color)
VALUES ('user-uuid', 'topic-uuid', 'Important concept to remember', 'yellow');

-- Create a note with text selection
INSERT INTO user_notes (user_id, topic_id, note_text, selected_text, selection_start, selection_end, color)
VALUES ('user-uuid', 'topic-uuid', 'This is unclear', 'myokardový infarkt', 100, 120, 'red');

-- Get due flashcards
SELECT * FROM get_due_flashcards('user-uuid', 10);

-- Review a card (quality 4 = "correct with hesitation")
SELECT update_flashcard_progress('user-uuid', 'card-uuid', 4);

-- Get user stats
SELECT * FROM get_user_flashcard_stats('user-uuid');
*/
