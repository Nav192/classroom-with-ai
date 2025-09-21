
ALTER TABLE public.questions
DROP CONSTRAINT IF EXISTS questions_quiz_id_fkey,
ADD CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

ALTER TABLE public.results
DROP CONSTRAINT IF EXISTS results_quiz_id_fkey,
ADD CONSTRAINT results_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_answers
DROP CONSTRAINT IF EXISTS quiz_answers_result_id_fkey,
ADD CONSTRAINT quiz_answers_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.results(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_answers
DROP CONSTRAINT IF EXISTS quiz_answers_question_id_fkey,
ADD CONSTRAINT quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
