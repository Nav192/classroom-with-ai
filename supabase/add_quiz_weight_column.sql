ALTER TABLE public.quizzes
ADD COLUMN weight INTEGER DEFAULT 100 NOT NULL;

DROP TABLE public.quiz_weights;
