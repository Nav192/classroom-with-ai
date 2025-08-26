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
	class_id text not null,
	topic text not null,
	filename text,
	mime_type text,
	file_type text check (file_type in ('pdf','ppt','txt')),
	created_at timestamp with time zone default now()
);

-- Quizzes
create table if not exists public.quizzes (
	id uuid default gen_random_uuid() primary key,
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
	options jsonb,
	answer text
);

-- Results
create table if not exists public.results (
	id uuid default gen_random_uuid() primary key,
	quiz_id uuid references public.quizzes(id) on delete cascade,
	user_id uuid references public.profiles(id) on delete cascade,
	score int,
	total int,
	started_at timestamp with time zone,
	ended_at timestamp with time zone,
	created_at timestamp with time zone default now()
);

-- Progress
create table if not exists public.materials_progress (
	id uuid default gen_random_uuid() primary key,
	user_id uuid references public.profiles(id) on delete cascade,
	material_id uuid references public.materials(id) on delete cascade,
	status text check (status in ('not_started','in_progress','completed')) default 'not_started',
	updated_at timestamp with time zone default now()
);

-- Embeddings for RAG
create table if not exists public.material_embeddings (
	id bigserial primary key,
	material_id uuid references public.materials(id) on delete cascade,
	chunk_index int,
	text text,
	embedding vector(768)
);

create index if not exists material_embeddings_idx on public.material_embeddings using ivfflat (embedding vector_l2_ops);


