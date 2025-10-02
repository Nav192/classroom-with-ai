-- Add status column to public.results
ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress' NOT NULL;

-- Add CHECK constraint for status column
-- Drop if exists to allow modification
ALTER TABLE public.results
DROP CONSTRAINT IF EXISTS results_status_check;

ALTER TABLE public.results
ADD CONSTRAINT results_status_check
CHECK (status IN ('in_progress', 'completed', 'pending_review', 'graded', 'cancelled'));

-- Add foreign key constraint to results.quiz_id
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_quiz_id'
        AND table_name = 'results'
    ) THEN
        ALTER TABLE public.results
        ADD CONSTRAINT fk_quiz_id
        FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
    END IF;
END $;


-- Add columns for manual grading to the existing quiz_answers table
ALTER TABLE public.quiz_answers
ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
ADD COLUMN IF NOT EXISTS teacher_score INTEGER,
ADD COLUMN IF NOT EXISTS is_manually_graded BOOLEAN DEFAULT FALSE;

-- Add foreign key constraints to quiz_answers if they don't exist
-- (Based on the schema, result_id, question_id, user_id are UUIDs but not explicitly FKs)
-- This is important for data integrity and cascading deletes.
-- Add foreign key constraint to quiz_answers.result_id
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_result_id'
        AND table_name = 'quiz_answers'
    ) THEN
        ALTER TABLE public.quiz_answers
        ADD CONSTRAINT fk_result_id
        FOREIGN KEY (result_id) REFERENCES public.results(id) ON DELETE CASCADE;
    END IF;
END $;

-- Add foreign key constraint to quiz_answers.question_id
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_question_id'
        AND table_name = 'quiz_answers'
    ) THEN
        ALTER TABLE public.quiz_answers
        ADD CONSTRAINT fk_question_id
        FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
    END IF;
END $;

-- Add foreign key constraint to quiz_answers.user_id
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_user_id'
        AND table_name = 'quiz_answers'
    ) THEN
        ALTER TABLE public.quiz_answers
        ADD CONSTRAINT fk_user_id
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $;

-- Enable RLS for quiz_answers if not already enabled
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for quiz_answers (only if they don't exist or need modification)
-- These policies were already in supabase_all_policies.sql, so we'll re-add them here
-- to ensure they are applied if they were somehow missed or dropped.
DROP POLICY IF EXISTS "Allow students to manage their own quiz answers" ON public.quiz_answers;
CREATE POLICY "Allow students to manage their own quiz answers"
ON public.quiz_answers FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow teachers to manage quiz answers for quizzes in their classes" ON public.quiz_answers;
CREATE POLICY "Allow teachers to manage quiz answers for quizzes in their classes"
ON public.quiz_answers FOR ALL
TO authenticated
USING (question_id IN (SELECT q.id FROM public.questions q JOIN public.quizzes quiz ON q.quiz_id = quiz.id
   WHERE quiz.class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())))
WITH CHECK (question_id IN (SELECT q.id FROM public.questions q JOIN public.quizzes quiz ON q.quiz_id =
  quiz.id WHERE quiz.class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())));