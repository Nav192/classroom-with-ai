-- Enable pgvector extension
create extension if not exists vector;

-- Users and roles
create table if not exists public.profiles (
    id uuid primary key,
    email text unique,
    role text check (role in ('teacher','student','admin')) default 'student',
    created_at timestamp with time zone default now()
);

-- Materials
create table if not exists public.materials (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null, -- Added: Who uploaded it
    class_id text not null,
    topic text not null,
    filename text,
    mime_type text,
    file_type text check (file_type in ('pdf','ppt','txt')),
    storage_path text, -- Added: Path in Supabase Storage
    created_at timestamp with time zone default now()
);

-- Embeddings for RAG
create table if not exists public.material_embeddings (
    id bigserial primary key,
    material_id uuid references public.materials(id) on delete cascade,
    chunk_index int,
    text text,
    embedding vector(768) -- Gemini embedding dimension
);

create index if not exists material_embeddings_idx on public.material_embeddings using ivfflat (embedding vector_l2_ops);

-- Progress
create table if not exists public.materials_progress (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    material_id uuid references public.materials(id) on delete cascade,
    status text check (status in ('not_started','in_progress','completed')) default 'not_started',
    updated_at timestamp with time zone default now()
);

-- Quizzes
create table if not exists public.quizzes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null, -- Added: Who created it
    class_id text not null,
    topic text not null,
    type text check (type in ('mcq','true_false','essay')) not null,
    duration_minutes int not null,
    max_attempts int default 2,
    created_at timestamp with time zone default now()
);

create table if not exists public.questions (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references public.quizzes(id) on delete cascade,
    text text not null,
    type text check (type in ('mcq','true_false','essay')) not null,
    options jsonb, -- For mcq options
    answer text -- Correct answer
);

-- Results
create table if not exists public.results (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references public.quizzes(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    score int,
    total int,
    attempt_number int default 1,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- New Table: To store individual answers for each attempt
create table if not exists public.quiz_answers (
    id uuid default gen_random_uuid() primary key,
    result_id uuid references public.results(id) on delete cascade,
    question_id uuid references public.questions(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    answer text, -- Student's answer
    is_correct boolean, -- For auto-gradable questions
    created_at timestamp with time zone default now()
);

-- New Table: To log AI interactions
create table if not exists public.ai_interactions (
    id bigserial primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    prompt text,
    response text,
    created_at timestamp with time zone default now()
);

-- Function to create a profile for a new user
create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, new.raw_user_meta_data->>'role');
  return new;
end;
$$;

-- Trigger to run the function after a new user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_user_profile();

-- Function to search for relevant material chunks
create or replace function match_material_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  material_id uuid,
  text text,
  similarity float
)
language sql stable
as $$
  select
    material_embeddings.id,
    material_embeddings.material_id,
    material_embeddings.text,
    1 - (material_embeddings.embedding <=> query_embedding) as similarity
  from material_embeddings
  where 1 - (material_embeddings.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;