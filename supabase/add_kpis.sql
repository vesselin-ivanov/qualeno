-- Flexible KPI rows imported from GOOGLE_SHEET_{TICKER}
-- One row per ticker per fiscal period; metric columns are stored as JSON for easy sheet changes.

create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references public.tickers(id) on delete cascade,
  fiscal_date_ending date not null,
  metrics jsonb not null default '{}'::jsonb,
  labels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ticker_id, fiscal_date_ending)
);

drop trigger if exists trg_kpis_updated_at on public.kpis;
create trigger trg_kpis_updated_at
before update on public.kpis
for each row execute function public.set_updated_at();

create index if not exists idx_kpis_ticker_fiscal_date
on public.kpis (ticker_id, fiscal_date_ending desc);
