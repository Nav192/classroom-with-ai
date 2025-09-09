
create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    class_name text not null,
    class_code text unique not null default substring(md5(random()::text), 1, 6),
    created_by uuid references public.profiles(id) on delete set null, -- Admin who created it
    created_at timestamp with time zone default now()
);

create table if not exists public.class_members (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    unique(class_id, user_id),
    joined_at timestamp with time zone default now()
);
