-- WARNING: This operation might fail if you have data in the 'embedding' column.
-- It's recommended to back up your data before running this script.
-- A safer approach is to create a new table with the correct schema and migrate the data.
ALTER TABLE public.general_definitions
ALTER COLUMN embedding TYPE vector(768);