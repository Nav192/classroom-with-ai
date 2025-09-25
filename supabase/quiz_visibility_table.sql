CREATE TABLE public.quiz_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_quiz_user_visibility UNIQUE (quiz_id, user_id)
);

COMMENT ON TABLE public.quiz_visibility IS 'Defines which specific students can see a quiz. If a quiz has no entries here, it is visible to everyone in the class.';