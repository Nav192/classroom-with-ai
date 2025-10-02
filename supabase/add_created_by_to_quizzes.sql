ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();