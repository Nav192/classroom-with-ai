ALTER TABLE public.quizzes
ADD COLUMN status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft' NOT NULL;
