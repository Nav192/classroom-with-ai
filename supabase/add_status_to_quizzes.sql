-- Add a 'status' column to the quizzes table to track draft vs. published state.
-- Defaulting existing quizzes to 'published' seems like a safe assumption.
ALTER TABLE quizzes
ADD COLUMN status TEXT NOT NULL DEFAULT 'published';

-- You might want to add a check constraint to limit the possible values
ALTER TABLE quizzes
ADD CONSTRAINT check_quiz_status CHECK (status IN ('draft', 'published'));