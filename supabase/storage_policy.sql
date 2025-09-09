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