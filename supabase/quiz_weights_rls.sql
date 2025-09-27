-- Enable RLS for the quiz_weights table
ALTER TABLE public.quiz_weights ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to SELECT weights for their classes
CREATE POLICY "Allow teachers to select quiz weights for their classes" ON public.quiz_weights
FOR SELECT
TO authenticated
USING (
  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher') AND
  EXISTS (
    SELECT 1
    FROM classes
    WHERE classes.id = quiz_weights.class_id AND classes.created_by = auth.uid()
  )
);

-- Policy for teachers to INSERT and UPDATE weights for their classes
CREATE POLICY "Allow teachers to insert and update quiz weights for their classes" ON public.quiz_weights
FOR ALL
TO authenticated
WITH CHECK (
  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher') AND
  EXISTS (
    SELECT 1
    FROM classes
    WHERE classes.id = quiz_weights.class_id AND classes.created_by = auth.uid()
  )
);

-- Policy for students to SELECT weights for their enrolled classes
CREATE POLICY "Allow students to select quiz weights for their enrolled classes" ON public.quiz_weights
FOR SELECT
TO authenticated
USING (
  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'student') AND
  EXISTS (
    SELECT 1
    FROM class_members
    WHERE class_members.class_id = quiz_weights.class_id AND class_members.user_id = auth.uid()
  )
);