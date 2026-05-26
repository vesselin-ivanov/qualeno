# Stock Fundamentals Dashboard

A full-stack TypeScript app for exploring stock fundamentals with interactive charts.

It supports:
- Quarterly and annual fundamentals tabs
- Price chart with latest close and 24h move
- Ticker pages at `/ticker/{SYMBOL}`
- Homepage listing companies with stored fundamentals
- Manual fundamentals input from Google Sheets
- Price sync from Alpha Vantage (with fallback support)

## Tech Stack

- Frontend: React + Vite + Recharts + Tailwind CSS
- Backend: Express + Vite SSR
- Database: Supabase (normalized schema)

## Data Sources

- Fundamentals and company profile: Google Sheets tabs (`Company`, `Quarterly`, `Annual`)
- Daily prices: Alpha Vantage (`TIME_SERIES_DAILY`, close price)
- Optional fallback: Financial Datasets prices (if configured)

## Project Structure

- `src/App.tsx`: ticker page UI
- `src/components/`: chart and UI components
- `src/server/stockApi.ts`: sync logic, source parsing, DB read/write
- `server.ts`: SSR server, `/` homepage, `/ticker/:ticker` route
- `scripts/sync-tickers.ts`: CLI sync command
- `supabase/`: SQL schema/migrations

### Company tab
Required:
- `symbol` (or `ticker`)

### Quarterly and Annual tabs
Required:
- `symbol` (or `ticker`)
- `fiscalDateEnding` in `YYYY-MM-DD`

## Setup

```bash
npm install
```

Apply Supabase schema/migrations in SQL Editor:
- `supabase/normalized_schema.sql`
- `supabase/add_fundamentals_period_type.sql`
- `supabase/add_company_facts.sql` (if needed in your DB)

## Run

Development:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm run start
```

## Sync Fundamentals + Prices

Sync all tickers discovered in sheets:
```bash
npm run sync:tickers -- --sheet-all
```

Sync specific tickers:
```bash
npm run sync:tickers -- --tickers NVDA,META
```

## Routes

- `/` homepage with companies that have fundamentals
- `/ticker/:ticker` ticker dashboard page
- `/api/fundamentals?ticker=NVDA` fundamentals API
- `/api/tickers/suggest?q=NV` ticker suggestions

