--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1 (Supabase)
-- Dumped by pg_dump version 15.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA public;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA public;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = user_id);
END;
$$;


ALTER FUNCTION public.get_user_role(user_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = user_id) = 'admin';
END;
$$;


ALTER FUNCTION public.is_admin(user_id uuid) OWNER TO postgres;

--
-- Name: is_teacher(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_teacher(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = user_id) = 'teacher';
END;
$$;


ALTER FUNCTION public.is_teacher(user_id uuid) OWNER TO postgres;

--
-- Name: get_visible_quizzes(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_visible_quizzes(p_user_id uuid) RETURNS TABLE(id uuid, title character varying, description text, duration integer, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, archived boolean, visibility_type text, class_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id,
        q.title,
        q.description,
        q.duration,
        q.created_at,
        q.updated_at,
        q.created_by,
        q.archived,
        qv.visibility_type,
        qv.class_id
    FROM
        public.quizzes q
    LEFT JOIN
        public.quiz_visibility qv ON q.id = qv.quiz_id
    WHERE
        q.archived = FALSE
        AND (
            qv.visibility_type IS NULL -- Public quizzes
            OR (qv.visibility_type = 'private' AND q.created_by = p_user_id) -- Quizzes created by the user
            OR (qv.visibility_type = 'class' AND qv.class_id IN (SELECT class_id FROM public.class_members WHERE user_id = p_user_id)) -- Quizzes visible to the user's classes
        );
END;
$$;


ALTER FUNCTION public.get_visible_quizzes(p_user_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: class_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    class_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.class_members OWNER TO postgres;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    class_id uuid
);


ALTER TABLE public.materials OWNER TO postgres;

--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50) NOT NULL,
    options jsonb,
    correct_answer jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quiz_questions OWNER TO postgres;

--
-- Name: quiz_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quiz_id uuid NOT NULL,
    user_id uuid NOT NULL,
    score integer NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    answers jsonb,
    class_id uuid
);


ALTER TABLE public.quiz_results OWNER TO postgres;

--
-- Name: quiz_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_visibility (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quiz_id uuid NOT NULL,
    visibility_type text DEFAULT 'public'::text NOT NULL,
    class_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quiz_visibility OWNER TO postgres;

--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    duration integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    archived boolean DEFAULT false
);


ALTER TABLE public.quizzes OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255),
    full_name character varying(255),
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'student'::text NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: class_members class_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members
    ADD CONSTRAINT class_members_pkey PRIMARY KEY (id);

--
-- Name: class_members class_members_class_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members
    ADD CONSTRAINT class_members_class_id_user_id_key UNIQUE (class_id, user_id);

--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);

--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);

--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);

--
-- Name: quiz_results quiz_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results
    ADD CONSTRAINT quiz_results_pkey PRIMARY KEY (id);

--
-- Name: quiz_visibility quiz_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility
    ADD CONSTRAINT quiz_visibility_pkey PRIMARY KEY (id);

--
-- Name: quiz_visibility quiz_visibility_quiz_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility
    ADD CONSTRAINT quiz_visibility_quiz_id_key UNIQUE (quiz_id);

--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: class_members class_members_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members
    ADD CONSTRAINT class_members_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: class_members class_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members
    ADD CONSTRAINT class_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: classes classes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.classes
    ADD CONSTRAINT classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: materials materials_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.materials
    ADD CONSTRAINT materials_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: materials materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.materials
    ADD CONSTRAINT materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_results quiz_results_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results
    ADD CONSTRAINT quiz_results_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

--
-- Name: quiz_results quiz_results_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results
    ADD CONSTRAINT quiz_results_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_results quiz_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results
    ADD CONSTRAINT quiz_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quiz_visibility quiz_visibility_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility
    ADD CONSTRAINT quiz_visibility_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: quiz_visibility quiz_visibility_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility
    ADD CONSTRAINT quiz_visibility_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quizzes quizzes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quizzes
    ADD CONSTRAINT quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: class_members enable_rls_on_class_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_class_members ON public.class_members USING (true);

--
-- Name: classes enable_rls_on_classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_classes ON public.classes USING (true);

--
-- Name: materials enable_rls_on_materials; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_materials ON public.materials USING (true);

--
-- Name: quiz_questions enable_rls_on_quiz_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_quiz_questions ON public.quiz_questions USING (true);

--
-- Name: quiz_results enable_rls_on_quiz_results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_quiz_results ON public.quiz_results USING (true);

--
-- Name: quiz_visibility enable_rls_on_quiz_visibility; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_quiz_visibility ON public.quiz_visibility USING (true);

--
-- Name: quizzes enable_rls_on_quizzes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_quizzes ON public.quizzes USING (true);

--
-- Name: users enable_rls_on_users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY enable_rls_on_users ON public.users USING (true);

--
-- Name: class_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_visibility; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: class_members class_members_class_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members ADD CONSTRAINT class_members_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: class_members class_members_user_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.class_members ADD CONSTRAINT class_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: classes classes_created_by_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.classes ADD CONSTRAINT classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: materials materials_class_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.materials ADD CONSTRAINT materials_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: materials materials_created_by_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.materials ADD CONSTRAINT materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_results quiz_results_class_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

--
-- Name: quiz_results quiz_results_quiz_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_results quiz_results_user_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quiz_visibility quiz_visibility_class_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility ADD CONSTRAINT quiz_visibility_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

--
-- Name: quiz_visibility quiz_visibility_quiz_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_visibility ADD CONSTRAINT quiz_visibility_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quizzes quizzes_created_by_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: users users_id_fkey; Type: RLS POLICY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    full_name text,
    avatar_url text,
    website text,
    CONSTRAINT username_length CHECK ((length(username) >= 3))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));

--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));

--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    quiz_id uuid NOT NULL,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    score integer,
    status text DEFAULT 'in_progress'::text NOT NULL
);

ALTER TABLE public.quiz_attempts OWNER TO postgres;

--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);

--
-- Name: quiz_attempts quiz_attempts_user_id_quiz_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_quiz_id_key UNIQUE (user_id, quiz_id);

--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_attempts quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_attempts Allow authenticated users to read their own quiz attempts.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to read their own quiz attempts." ON public.quiz_attempts FOR SELECT TO authenticated USING ((auth.uid() = user_id));

--
-- Name: quiz_attempts Allow authenticated users to insert their own quiz attempts.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to insert their own quiz attempts." ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

--
-- Name: quiz_attempts Allow authenticated users to update their own quiz attempts.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to update their own quiz attempts." ON public.quiz_attempts FOR UPDATE TO authenticated USING ((auth.uid() = user_id));