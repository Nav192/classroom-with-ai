ALTER TABLE public.profiles
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Optional: Add a policy to allow admins to update the is_active column
-- This assumes you have an 'admin' role in your profiles table
-- and a function like is_admin(auth.uid()) to check for admin status.
-- If not, you might need to adjust your RLS policies accordingly.
CREATE POLICY "Allow admins to update user active status"
ON public.profiles FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
