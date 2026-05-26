-- Add support for storing both quarterly and annual fundamentals
-- Run this in Supabase SQL Editor for existing databases

alter table public.quarterly_fundamentals
add column if not exists period_type text;

update public.quarterly_fundamentals
set period_type = 'quarterly'
where period_type is null;

alter table public.quarterly_fundamentals
alter column period_type set default 'quarterly';

alter table public.quarterly_fundamentals
alter column period_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarterly_fundamentals_period_type_check'
  ) then
    alter table public.quarterly_fundamentals
    add constraint quarterly_fundamentals_period_type_check
    check (period_type in ('quarterly', 'annual'));
  end if;
end $$;

alter table public.quarterly_fundamentals
drop constraint if exists quarterly_fundamentals_ticker_id_fiscal_date_ending_key;

alter table public.quarterly_fundamentals
add constraint quarterly_fundamentals_ticker_period_date_key
unique (ticker_id, period_type, fiscal_date_ending);

create index if not exists idx_quarterly_fundamentals_ticker_period_date
on public.quarterly_fundamentals (ticker_id, period_type, fiscal_date_ending desc);
