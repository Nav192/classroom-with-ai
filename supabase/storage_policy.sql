-- Enable Row Level Security for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated users to upload files to the 'quiz-results' bucket
CREATE POLICY "Allow authenticated uploads to quiz-results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-results');

-- Optionally, allow authenticated users to read files from the 'quiz-results' bucket
CREATE POLICY "Allow authenticated reads from quiz-results"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quiz-results');

-- Policies for materials bucket
CREATE POLICY "Allow teacher and admin uploads to materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'teacher')
);

CREATE POLICY "Allow authenticated reads from materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials');