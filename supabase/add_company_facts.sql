-- Migration to add company facts columns to tickers table
-- Run this in Supabase SQL Editor

alter table public.tickers
add column if not exists sector text,
add column if not exists industry text,
add column if not exists category text,
add column if not exists exchange text,
add column if not exists location text;
