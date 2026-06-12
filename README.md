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
- `supabase/add_kpis.sql` (for custom KPI charts)

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

Custom KPI charts:
- By default, KPI tabs are read from the main `GOOGLE_SHEET_ID` document using the ticker as the tab name, e.g. tab `AMZN`.
- Optional: set `GOOGLE_SHEET_{TICKER}` to use a different KPI Google Sheet ID or URL for one ticker.
- Optional: set `GOOGLE_SHEET_{TICKER}_TAB` if the KPI tab name is different from the ticker, e.g. `GOOGLE_SHEET_AMZN_TAB=Amazon KPIs`.
- The sheet should include `fiscalDateEnding` (or `fiscalDateEdnign`) plus numeric KPI columns.
- Run `npm run sync:tickers -- --tickers AMZN` after applying `supabase/add_kpis.sql`.

## Routes

- `/` homepage with companies that have fundamentals
- `/ticker/:ticker` ticker dashboard page
- `/api/fundamentals?ticker=NVDA` fundamentals API
- `/api/tickers/suggest?q=NV` ticker suggestions
