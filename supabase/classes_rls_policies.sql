-- First, enable Row Level Security (RLS) on the tables.
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check if the current user is a teacher of a specific class.
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(p_class_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    is_teacher BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.classes
        WHERE id = p_class_id AND created_by = auth.uid()
    ) INTO is_teacher;
    RETURN is_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if a user is a member of a specific class.
-- This function is SECURITY DEFINER to bypass RLS on public.class_members when called from a policy,
-- preventing infinite recursion.
CREATE OR REPLACE FUNCTION public.is_member_of_class(p_class_id uuid, p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.class_members
        WHERE class_id = p_class_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------
-- RLS POLICIES FOR: public.classes
-- -----------------------------------------------------------

-- 1. Policy for Admins: Admins have unrestricted access to all classes.
CREATE POLICY "Allow admins full access to classes"
ON public.classes FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. Policy for Teachers (INSERT): Teachers can create new classes.
CREATE POLICY "Allow teachers to create classes"
ON public.classes FOR INSERT
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'teacher');

-- 3. Policy for Teachers (SELECT - own classes): Teachers can view classes they created.
CREATE POLICY "Allow teachers to view their own created classes"
ON public.classes FOR SELECT
USING (auth.uid() = created_by);

-- 4. Policy for Members (SELECT - any class they are a member of): Authenticated users (students and teachers) can view classes they are a member of.
CREATE POLICY "Allow members to view their classes"
ON public.classes FOR SELECT
USING (public.is_member_of_class(id, auth.uid()));


-- -----------------------------------------------------------
-- RLS POLICIES FOR: public.class_members
-- -----------------------------------------------------------

-- 1. Policy for Admins: Admins have unrestricted access to class memberships.
CREATE POLICY "Allow admins full access to class members"
ON public.class_members FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. Policy for Students (INSERT - self-enroll): Students can enroll themselves into a class.
CREATE POLICY "Allow students to enroll themselves in a class"
ON public.class_members FOR INSERT
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'student'
    AND user_id = auth.uid()
);

-- 3. Policy for Members (SELECT - view other members in their class): Users can see other members of classes they are also in.
CREATE POLICY "Allow users to view members of their own class"
ON public.class_members FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Policy for Teachers (SELECT - members of their own classes): Teachers can view members of classes they created.
CREATE POLICY "Allow teachers to view members of their own classes (SELECT)"
ON public.class_members FOR SELECT
USING (public.is_teacher_of_class(class_id));

-- 5. Policy for Teachers (INSERT - add members to their own classes): Teachers can add new members to classes they created.
CREATE POLICY "Allow teachers to add members to their own classes (INSERT)"
ON public.class_members FOR INSERT
WITH CHECK (public.is_teacher_of_class(class_id));

-- 6. Policy for Teachers (DELETE - remove members from their own classes): Teachers can remove members from classes they created.
CREATE POLICY "Allow teachers to remove members from their own classes (DELETE)"
ON public.class_members FOR DELETE
USING (public.is_teacher_of_class(class_id));

-- -----------------------------------------------------------
-- GRANT SELECT permissions to 'authenticated' role
-- This is necessary for the anon key to perform SELECTs,
-- with RLS policies then filtering the results.
-- -----------------------------------------------------------
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.classes TO authenticated;
GRANT SELECT ON TABLE public.class_members TO authenticated;