 -- ============================================================================
  -- 1. Disable RLS and Drop All Existing Policies
  --    Ini penting untuk memastikan tidak ada konflik dan memulai dari awal.
  -- ============================================================================

  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE class_members DISABLE ROW LEVEL SECURITY;
  ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
  ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
  ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_visibility DISABLE ROW LEVEL SECURITY;
  ALTER TABLE results DISABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_answers DISABLE ROW LEVEL SECURITY;
  ALTER TABLE cheating_logs DISABLE ROW LEVEL SECURITY;
  ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
  ALTER TABLE materials_progress DISABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Allow authenticated users to read their own quiz attempts." ON quiz_attempts;
  DROP POLICY IF EXISTS "Allow authenticated users to insert their own quiz attempts." ON quiz_attempts;
  DROP POLICY IF EXISTS "Allow authenticated users to update their own quiz attempts." ON quiz_attempts;
  DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
  DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
  DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Allow teachers to view profiles of students in their classes" ON profiles;

  DROP POLICY IF EXISTS "Allow users to view their own class memberships" ON class_members;
  DROP POLICY IF EXISTS "Allow teachers to view class memberships in their classes" ON class_members; --REMOVED
  DROP POLICY IF EXISTS "Allow authenticated users to join a class" ON class_members;
  DROP POLICY IF EXISTS "Allow teachers to remove members from classes they created" ON class_members;

  DROP POLICY IF EXISTS "Allow students to view classes they are members of" ON classes; -- REMOVED
  DROP POLICY IF EXISTS "Allow teachers to manage their own classes" ON classes;
  DROP POLICY IF EXISTS "Allow authenticated users to view classes by code" ON classes;

  DROP POLICY IF EXISTS "Allow teachers to manage quizzes in their class" ON quizzes;
  DROP POLICY IF EXISTS "Allow students to view quizzes in their class" ON quizzes;

  DROP POLICY IF EXISTS "Allow teachers to manage questions for quizzes in their classes" ON questions;
  DROP POLICY IF EXISTS "Allow students to view questions for quizzes in their classes" ON questions;

  DROP POLICY IF EXISTS "Allow teachers to manage quiz visibility in their classes" ON quiz_visibility;
  DROP POLICY IF EXISTS "Allow authenticated students to see their own quiz visibility" ON quiz_visibility;

  DROP POLICY IF EXISTS "Allow students to manage their own results" ON results;
  DROP POLICY IF EXISTS "Allow teachers to view results for quizzes in their classes" ON results;
  DROP POLICY IF EXISTS "Allow teachers to update results for quizzes in their classes" ON results;

  DROP POLICY IF EXISTS "Allow students to manage their own quiz answers" ON quiz_answers;
  DROP POLICY IF EXISTS "Allow teachers to manage quiz answers for quizzes in their classes" ON
  quiz_answers;

  DROP POLICY IF EXISTS "Allow students to insert their own cheating logs" ON cheating_logs;
  DROP POLICY IF EXISTS "Allow teachers to view cheating logs for quizzes in their classes" ON
  cheating_logs;
  DROP POLICY IF EXISTS "Admins can view all cheating logs" ON cheating_logs;

  DROP POLICY IF EXISTS "Allow users to view materials in classes they are members of" ON materials;
  DROP POLICY IF EXISTS "Allow teachers to view materials in classes they created" ON materials;

  DROP POLICY IF EXISTS "Allow students to manage their own materials progress" ON materials_progress;
  DROP POLICY IF EXISTS "Allow teachers to view progress of students in classes they created" ON
  materials_progress;


  -- ============================================================================
  -- 2. Enable RLS for all tables
  -- ============================================================================

  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_visibility ENABLE ROW LEVEL SECURITY;
  ALTER TABLE results ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cheating_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
  ALTER TABLE materials_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;


  -- ============================================================================
  -- 3. Create New RLS Policies Based on Backend Logic
  -- ============================================================================

  -- profiles table policies
  ------------------------------------------------------------------------------
  -- Allow users to view their own profile
  CREATE POLICY "Allow users to view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

  -- Allow users to update their own profile
  CREATE POLICY "Allow users to update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

  -- Allow teachers to view profiles of students in their classes (for reports, student list)
  CREATE POLICY "Allow teachers to view profiles of students in their classes"
  ON profiles FOR SELECT
  TO authenticated
  USING (id IN (SELECT user_id FROM public.class_members WHERE class_id IN (SELECT id FROM public.classes
  WHERE created_by = auth.uid())));


  -- classes table policies
  ------------------------------------------------------------------------------
  -- Teachers can manage their own classes (created_by)
  CREATE POLICY "Allow teachers to manage their own classes"
  ON classes FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

  -- Authenticated users can view classes by code (for joining)
  CREATE POLICY "Allow authenticated users to view classes by code"
  ON classes FOR SELECT
  TO authenticated
  USING (TRUE);


  -- class_members table policies
  ------------------------------------------------------------------------------
  -- Users can view their own class memberships
  CREATE POLICY "Allow users to view their own class memberships"
  ON class_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

  -- Users can join a class (insert their own user_id)
  CREATE POLICY "Allow authenticated users to join a class"
  ON class_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

  -- Teachers can remove members from classes they created
  CREATE POLICY "Allow teachers to remove members from classes they created"
  ON class_members FOR DELETE
  TO authenticated
  USING (class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid()));


  -- quizzes table policies
  ------------------------------------------------------------------------------
  -- Teachers can manage quizzes in classes they created
  CREATE POLICY "Allow teachers to manage quizzes in their class"
  ON quizzes FOR ALL
  TO authenticated
  USING (class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid()))
  WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid()));

  -- Students can view quizzes in classes they are members of
  CREATE POLICY "Allow students to view quizzes in their class"
  ON quizzes FOR SELECT
  TO authenticated
  USING (class_id IN (SELECT class_id FROM public.class_members WHERE user_id = auth.uid()));


  -- questions table policies
  ------------------------------------------------------------------------------
  -- Teachers can manage questions for quizzes in classes they created
  CREATE POLICY "Allow teachers to manage questions for quizzes in their classes"
  ON questions FOR ALL
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())))
  WITH CHECK (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes
  WHERE created_by = auth.uid())));

  -- Students can view questions for quizzes in classes they are members of
  CREATE POLICY "Allow students to view questions for quizzes in their classes"
  ON questions FOR SELECT
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT class_id FROM
  public.class_members WHERE user_id = auth.uid())));


  -- quiz_visibility table policies
  ------------------------------------------------------------------------------
  -- Teachers can manage quiz visibility for quizzes in classes they created
  CREATE POLICY "Allow teachers to manage quiz visibility in their classes"
  ON quiz_visibility FOR ALL
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())))
  WITH CHECK (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes
  WHERE created_by = auth.uid())));

  -- Students can view their own quiz visibility
  CREATE POLICY "Allow authenticated students to see their own quiz visibility"
  ON quiz_visibility FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


  -- materials table policies
  ------------------------------------------------------------------------------
  -- Users can view materials in classes they are members of
  CREATE POLICY "Allow users to view materials in classes they are members of"
  ON materials FOR SELECT
  TO authenticated
  USING (class_id IN (SELECT class_id FROM public.class_members WHERE user_id = auth.uid()));

  -- Teachers can view materials in classes they created (for reports)
  CREATE POLICY "Allow teachers to view materials in classes they created"
  ON materials FOR SELECT
  TO authenticated
  USING (class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid()));


  -- materials_progress table policies
  ------------------------------------------------------------------------------
  -- Students can manage their own materials progress
  CREATE POLICY "Allow students to manage their own materials progress"
  ON materials_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

  -- Teachers can view progress of students in classes they created
  CREATE POLICY "Allow teachers to view progress of students in classes they created"
  ON materials_progress FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT user_id FROM public.class_members WHERE class_id IN (SELECT id FROM
  public.classes WHERE created_by = auth.uid())));


  -- quiz_attempts table policies
  ------------------------------------------------------------------------------
  -- Allow authenticated users to read their own quiz attempts.
  CREATE POLICY "Allow authenticated users to read their own quiz attempts."
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

  -- Allow authenticated users to insert their own quiz attempts.
  CREATE POLICY "Allow authenticated users to insert their own quiz attempts."
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

  -- Allow authenticated users to update their own quiz attempts.
  CREATE POLICY "Allow authenticated users to update their own quiz attempts."
  ON public.quiz_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


  -- results table policies
  ------------------------------------------------------------------------------
  -- Students can manage their own results
  CREATE POLICY "Allow students to manage their own results"
  ON results FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

  -- Teachers can view results for quizzes in classes they created
  CREATE POLICY "Allow teachers to view results for quizzes in their classes"
  ON results FOR SELECT
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())));

  -- Teachers can update results for quizzes in classes they created (for grading)
  CREATE POLICY "Allow teachers to update results for quizzes in their classes"
  ON results FOR UPDATE
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())))
  WITH CHECK (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes
  WHERE created_by = auth.uid())));


  -- quiz_answers table policies
  ------------------------------------------------------------------------------
  -- Students can manage their own quiz answers
  CREATE POLICY "Allow students to manage their own quiz answers"
  ON quiz_answers FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

  -- Teachers can manage quiz answers for quizzes in classes they created
  CREATE POLICY "Allow teachers to manage quiz answers for quizzes in their classes"
  ON quiz_answers FOR ALL
  TO authenticated
  USING (question_id IN (SELECT q.id FROM public.questions q JOIN public.quizzes quiz ON q.quiz_id = quiz.id
   WHERE quiz.class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())))
  WITH CHECK (question_id IN (SELECT q.id FROM public.questions q JOIN public.quizzes quiz ON q.quiz_id =
  quiz.id WHERE quiz.class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())));


  -- cheating_logs table policies
  ------------------------------------------------------------------------------
  -- Students can insert their own cheating logs
  CREATE POLICY "Allow students to insert their own cheating logs"
  ON cheating_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

  -- Teachers can view cheating logs for quizzes in classes they created
  CREATE POLICY "Allow teachers to view cheating logs for quizzes in their classes"
  ON cheating_logs FOR SELECT
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())));

  -- Admins can view all cheating logs
  CREATE POLICY "Admins can view all cheating logs"
  ON cheating_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

  -- Create the quiz_checkpoints table
  CREATE TABLE public.quiz_checkpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
      question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
      answer TEXT,
      attempt_number INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

      -- Ensure only one checkpoint per user, quiz, question, and attempt
      UNIQUE (user_id, quiz_id, question_id, attempt_number)
  );

  -- Enable Row Level Security for quiz_checkpoints
  ALTER TABLE public.quiz_checkpoints ENABLE ROW LEVEL SECURITY;

  -- RLS Policy: Students can manage their own checkpoints
  CREATE POLICY "Students can manage their own checkpoints"
  ON public.quiz_checkpoints FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

  -- RLS Policy: Teachers can view checkpoints for quizzes in classes they created
  CREATE POLICY "Teachers can view checkpoints for quizzes in their classes"
  ON public.quiz_checkpoints FOR SELECT
  TO authenticated
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE class_id IN (SELECT id FROM public.classes WHERE
  created_by = auth.uid())));

  -- Optional: Add an index for faster lookups
  CREATE INDEX idx_quiz_checkpoints_user_quiz_question_attempt ON public.quiz_checkpoints (user_id, quiz_id,
   question_id, attempt_number);
  --Fitur for timer for quiz to running in background starts at student start the quiz
  ALTER TABLE public.quiz_answers
  ADD COLUMN attempt_number INT;