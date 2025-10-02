-- Add columns for manual grading to the quiz_answers table
ALTER TABLE public.quiz_answers
ADD COLUMN teacher_feedback TEXT,
ADD COLUMN teacher_score INTEGER,
ADD COLUMN is_manually_graded BOOLEAN DEFAULT FALSE;

-- Update the status column in quiz_attempts to include 'pending_review' and 'graded'
-- First, remove the existing CHECK constraint if it exists
ALTER TABLE public.quiz_attempts
DROP CONSTRAINT IF EXISTS quiz_attempts_status_check;

-- Then, add the new CHECK constraint with updated allowed values
ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_status_check
CHECK (status IN ('in_progress', 'completed', 'pending_review', 'graded'));

-- Set default status for new quiz attempts to 'in_progress'
ALTER TABLE public.quiz_attempts
ALTER COLUMN status SET DEFAULT 'in_progress';