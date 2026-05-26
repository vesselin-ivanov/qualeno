create table if not exists public.ticker_fundamentals_cache (
  ticker text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ticker_fundamentals_cache_updated_at on public.ticker_fundamentals_cache;
create trigger trg_ticker_fundamentals_cache_updated_at
before update on public.ticker_fundamentals_cache
for each row execute function public.set_updated_at();

create index if not exists idx_ticker_fundamentals_cache_fetched_at
on public.ticker_fundamentals_cache (fetched_at desc);
