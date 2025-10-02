
CREATE POLICY "Users can update their own quizzes"
ON public.quizzes
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
