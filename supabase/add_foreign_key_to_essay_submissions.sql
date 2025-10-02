ALTER TABLE public.essay_submissions
ADD CONSTRAINT fk_questions
FOREIGN KEY (quiz_question_id)
REFERENCES public.questions (id);