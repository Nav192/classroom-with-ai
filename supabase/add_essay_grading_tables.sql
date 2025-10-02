-- Add teacher_feedback column to results table
ALTER TABLE public.results
ADD COLUMN teacher_feedback TEXT;

-- Add max_score column to questions table for essay questions
ALTER TABLE public.questions
ADD COLUMN max_score INTEGER;

-- Create essay_submissions table
CREATE TABLE public.essay_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
    quiz_question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_answer TEXT NOT NULL,
    teacher_score INTEGER,
    teacher_feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for essay_submissions
ALTER TABLE public.essay_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read their own essay submissions." 
ON public.essay_submissions FOR SELECT TO authenticated
USING (
    -- Allow student to read their own essay submissions
    (EXISTS (SELECT 1 FROM public.results qr WHERE qr.id = quiz_result_id AND qr.user_id = auth.uid()))
    OR
    -- Allow teacher (who created the quiz) to read essay submissions
    (EXISTS (
        SELECT 1
        FROM public.quizzes q_teacher
        WHERE
            q_teacher.id = (SELECT qr.quiz_id FROM public.results qr WHERE qr.id = essay_submissions.quiz_result_id) AND
            q_teacher.created_by = auth.uid() -- Changed from created_by to user_id
    ))
);

CREATE POLICY "Allow authenticated users to insert their own essay submissions."
ON public.essay_submissions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.results qr WHERE qr.id = quiz_result_id AND qr.user_id = auth.uid()));

CREATE POLICY "Allow teachers to update essay submissions."
ON public.essay_submissions FOR UPDATE TO authenticated
USING (
    (EXISTS (
        SELECT 1
        FROM public.quizzes q_teacher
        WHERE
            q_teacher.id = (SELECT qr.quiz_id FROM public.results qr WHERE qr.id = essay_submissions.quiz_result_id) AND
            q_teacher.created_by = auth.uid() -- Changed from created_by to user_id
    ))
);