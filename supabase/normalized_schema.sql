-- Normalized schema for stock fundamentals + daily prices
-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

-- 1) Master ticker/company table
create table if not exists public.tickers (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  company_name text,
  sector text,
  industry text,
  category text,
  exchange text,
  location text,
  currency text not null default 'USD',
  source text not null default 'Alpha Vantage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Quarterly fundamentals (1 row per ticker per fiscal quarter)
create table if not exists public.quarterly_fundamentals (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references public.tickers(id) on delete cascade,
  period_type text not null default 'quarterly' check (period_type in ('quarterly', 'annual')),
  fiscal_date_ending date not null,

  total_revenue numeric,
  net_income numeric,
  reported_eps numeric,
  expenses numeric,
  ebitda numeric,
  free_cash_flow numeric,
  cash numeric,
  debt numeric,
  shares_outstanding numeric,
  dividends_per_share numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ticker_id, period_type, fiscal_date_ending)
);

-- 3) Daily prices (1 row per ticker per trading day)
create table if not exists public.daily_prices (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references public.tickers(id) on delete cascade,
  trading_date date not null,
  close_price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ticker_id, trading_date)
);

-- 4) Optional metadata about refreshes/cache
create table if not exists public.ticker_refresh_log (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references public.tickers(id) on delete cascade,
  refreshed_at timestamptz not null default now(),
  status text not null default 'success',
  note text
);

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tickers_updated_at on public.tickers;
create trigger trg_tickers_updated_at
before update on public.tickers
for each row execute function public.set_updated_at();

drop trigger if exists trg_quarterly_fundamentals_updated_at on public.quarterly_fundamentals;
create trigger trg_quarterly_fundamentals_updated_at
before update on public.quarterly_fundamentals
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_prices_updated_at on public.daily_prices;
create trigger trg_daily_prices_updated_at
before update on public.daily_prices
for each row execute function public.set_updated_at();

-- Helpful indexes
create index if not exists idx_tickers_symbol on public.tickers(symbol);
create index if not exists idx_quarterly_fundamentals_ticker_date on public.quarterly_fundamentals(ticker_id, fiscal_date_ending desc);
create index if not exists idx_daily_prices_ticker_date on public.daily_prices(ticker_id, trading_date desc);
create index if not exists idx_refresh_log_ticker_refreshed on public.ticker_refresh_log(ticker_id, refreshed_at desc);

-- View for latest daily price per ticker
create or replace view public.v_latest_ticker_price as
select
  t.id as ticker_id,
  t.symbol,
  t.company_name,
  dp.trading_date,
  dp.close_price
from public.tickers t
join lateral (
  select trading_date, close_price
  from public.daily_prices
  where ticker_id = t.id
  order by trading_date desc
  limit 1
) dp on true;
