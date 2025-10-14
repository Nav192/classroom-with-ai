-- Add status to class_members to track leave requests
ALTER TABLE public.class_members
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'enrolled';

-- Add a comment to the new column
COMMENT ON COLUMN public.class_members.status IS 'The membership status of the user in the class. Can be: enrolled, pending_leave.';
