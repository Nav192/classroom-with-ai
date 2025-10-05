ALTER TABLE public.general_definitions
ADD COLUMN class_id UUID,
ADD CONSTRAINT fk_class_id
    FOREIGN KEY (class_id)
    REFERENCES public.classes (id)
    ON DELETE CASCADE;