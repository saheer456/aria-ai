-- ============================================================
-- Aria AI — RAG Memory System (pgvector)
-- Run this in: https://khbuelgpuzztztixqfgi.supabase.co → SQL Editor
-- PREREQUISITE: Enable the 'vector' extension first:
--   Dashboard → Database → Extensions → search "vector" → Enable
-- ============================================================

-- 0. Enable pgvector extension
create extension if not exists vector;

-- 1. RAG Memories table
create table if not exists public.rag_memories (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null default 'global',        -- anonymous session or user_id
  chunk_type    text not null default 'qa'             -- 'qa' | 'code' | 'style' | 'fact'
    check (chunk_type in ('qa', 'code', 'style', 'fact')),
  content       text not null,                         -- the raw knowledge chunk
  source_user   text,                                  -- original user message (for context)
  source_ai     text,                                  -- original AI response (for context)
  embedding     vector(384),                           -- HF all-MiniLM-L6-v2 produces 384-dim
  tags          text[] default '{}',
  score         float4 not null default 0,             -- user rating (-1 to 5)
  use_count     integer not null default 0,            -- how many times retrieved
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. User preferences table (style signals)
create table if not exists public.user_preferences (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null unique default 'global',
  tone          text default 'balanced',               -- 'concise' | 'detailed' | 'balanced'
  code_style    text default 'typescript',             -- preferred language
  topics        text[] default '{}',                   -- domains user asks about most
  updated_at    timestamptz not null default now()
);

-- 3. Indexes
create index if not exists rag_memories_session_idx on public.rag_memories (session_id);
create index if not exists rag_memories_type_idx    on public.rag_memories (chunk_type);
create index if not exists rag_memories_score_idx   on public.rag_memories (score desc);

-- 4. HNSW vector index for fast ANN search (requires pgvector >= 0.5.0, available on Supabase)
create index if not exists rag_memories_embedding_idx
  on public.rag_memories
  using hnsw (embedding vector_cosine_ops);

-- 5. Similarity search function
--    Returns top-K memories for a given query embedding, filtered by session and min_score.
create or replace function match_memories(
  query_embedding vector(384),
  match_count     int     default 5,
  session         text    default 'global',
  min_score       float4  default -1.0
)
returns table (
  id          uuid,
  content     text,
  chunk_type  text,
  tags        text[],
  score       float4,
  use_count   integer,
  similarity  float
)
language sql stable as $$
  select
    m.id,
    m.content,
    m.chunk_type,
    m.tags,
    m.score,
    m.use_count,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.rag_memories m
  where
    (m.session_id = session or m.session_id = 'global')
    and m.score >= min_score
    and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Auto-update timestamps
create or replace function update_rag_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rag_memories_timestamp on public.rag_memories;
create trigger rag_memories_timestamp
  before update on public.rag_memories
  for each row execute procedure update_rag_timestamp();

-- 7. Row Level Security (RLS) — open for anonymous usage (session-based)
alter table public.rag_memories      enable row level security;
alter table public.user_preferences  enable row level security;

-- Allow all access (anon key) — memories are session-scoped, not user-private
drop policy if exists "Open RAG memories access" on public.rag_memories;
create policy "Open RAG memories access"
  on public.rag_memories for all
  using (true) with check (true);

drop policy if exists "Open preferences access" on public.user_preferences;
create policy "Open preferences access"
  on public.user_preferences for all
  using (true) with check (true);

-- Done!
select 'RAG Memory system setup complete ✓' as status;
