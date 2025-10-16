CREATE TABLE material_access (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE material_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_access ADD CONSTRAINT unique_material_access UNIQUE (material_id, user_id);