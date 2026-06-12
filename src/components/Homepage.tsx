import React from 'react'
import type { FundamentalsCompany } from '../server/stockApi'
import Header from './Header'

type HomepageProps = {
  companies: FundamentalsCompany[]
}

export default function Homepage({ companies }: HomepageProps) {
  const sortedCompanies = [...companies].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Qualeno</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('qualeno-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
        <style>{`
          body { font-family: "Space Grotesk", "Segoe UI", sans-serif; margin: 0; background: #f6f8fb; color: #0f172a; }
          main { max-width: 1100px; margin: 0 auto; padding: 32px 16px; }
          .site-header { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; border-bottom: 1px solid #e2e8f0; background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(16px); }
          .site-brand, .site-brand:visited { display: inline-flex; align-items: center; color: #0f172a; text-decoration: none; }
          .site-logo { width: 224px; height: auto; color: #0f172a; flex-shrink: 0; }
          .site-theme-toggle { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: #0f172a; cursor: pointer; transition: background 150ms ease, border-color 150ms ease; }
          .site-theme-toggle:hover { background: #f8fafc; }
          .site-theme-toggle svg { width: 17px; height: 17px; }
          .site-theme-sun { display: none; }
          .page-title { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
          h1 { margin: 0 0 8px 0; font-size: 32px; letter-spacing: -0.04em; }
          p { margin: 0; color: #475569; }
          .table-shell { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 15px 18px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
          th { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
          tr:last-child td { border-bottom: 0; }
          tbody tr { cursor: pointer; transition: background 150ms ease, transform 150ms ease; }
          tbody tr:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
          tbody tr:hover { background: #f8fafc; }
          .sort-btn { appearance: none; border: 0; background: transparent; color: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 0; font: inherit; letter-spacing: inherit; text-transform: inherit; }
          .sort-btn:hover { color: #0f172a; }
          .sort-btn::after { content: "↕"; color: #94a3b8; font-size: 11px; }
          .sort-btn[data-active="true"]::after { content: attr(data-direction); color: #2563eb; }
          .rank { width: 72px; color: #64748b; font-variant-numeric: tabular-nums; }
          .left, .left:visited { display: flex; align-items: center; gap: 10px; min-width: 0; color: inherit; text-decoration: none; }
          .left:hover, .left:focus { color: inherit; text-decoration: none; }
          .logo { width: 34px; height: 34px; object-fit: contain; flex-shrink: 0; }
          .text { min-width: 0; }
          .meta { color: #64748b; font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .market-cap { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
          .industry { color: #475569; }
          .empty { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; color: #475569; }
          @media (max-width: 720px) {
            th, td { padding: 12px 10px; }
            .industry { display: none; }
          }
          html.dark body { background: #020617; color: #e2e8f0; }
          html.dark p, html.dark .meta, html.dark .rank, html.dark th { color: #94a3b8; }
          html.dark .site-header { border-color: #1e293b; background: rgba(2, 6, 23, 0.86); }
          html.dark .site-brand, html.dark .site-brand:visited { color: #e2e8f0; }
          html.dark .site-logo { color: #e2e8f0; }
          html.dark .site-theme-toggle { border-color: #334155; background: #0f172a; color: #e2e8f0; }
          html.dark .site-theme-toggle:hover { background: #1e293b; }
          html.dark .site-theme-sun { display: block; }
          html.dark .site-theme-moon { display: none; }
          html.dark .table-shell { border-color: #1e293b; background: #0f172a; box-shadow: 0 18px 45px rgba(0, 0, 0, 0.3); }
          html.dark th { background: linear-gradient(180deg, #111827 0%, #0f172a 100%); border-color: #1e293b; }
          html.dark td { border-color: #1e293b; }
          html.dark tbody tr:hover { background: #111827; }
          html.dark .sort-btn:hover { color: #e2e8f0; }
          html.dark .sort-btn[data-active="true"]::after { color: #60a5fa; }
          html.dark .industry { color: #cbd5e1; }
          html.dark .empty { border-color: #334155; background: #0f172a; color: #94a3b8; }
        `}</style>
      </head>
      <body>
        <Header toggleId="theme-toggle" />
        <main>
          {sortedCompanies.length > 0 ? (
            <div className="table-shell">
              <table id="companies-table">
                <thead>
                  <tr>
                    <th className="rank">
                      <button type="button" className="sort-btn" data-sort="rank" data-type="number">
                        Rank
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" data-sort="name" data-type="text">
                        Name
                      </button>
                    </th>
                    <th className="market-cap">
                      <button type="button" className="sort-btn" data-sort="marketCap" data-type="number">
                        Market Cap
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" data-sort="industry" data-type="text">
                        Industry
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((company, index) => {
                    const hasMarketCap = typeof company.marketCap === 'number' && company.marketCap > 0
                    const industry = company.industry ?? 'Unclassified'

                    return (
                      <tr
                        key={company.symbol}
                        tabIndex={0}
                        data-href={`/ticker/${encodeURIComponent(company.symbol)}`}
                        data-rank={index + 1}
                        data-name={`${company.companyName} ${company.symbol}`.toLowerCase()}
                        data-market-cap={company.marketCap ?? 0}
                        data-industry={`${industry} ${company.category ?? ''}`.toLowerCase()}
                      >
                        <td className="rank">{index + 1}</td>
                        <td>
                          <a href={`/ticker/${encodeURIComponent(company.symbol)}`} className="left">
                            <img src={company.logoUrl} alt={`${company.symbol} logo`} className="logo" loading="lazy" />
                            <div className="text">
                              <strong>{company.companyName}</strong>
                              <div className="meta">{company.symbol}</div>
                            </div>
                          </a>
                        </td>
                        <td className="market-cap">{hasMarketCap ? formatCompactCurrency(company.marketCap ?? 0) : '--'}</td>
                        <td className="industry">
                          <div>{industry}</div>
                          {company.category ? <div className="meta">{company.category}</div> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No companies found yet. Run sync first.</div>
          )}
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const table = document.getElementById('companies-table');
              const tbody = table?.querySelector('tbody');
              const buttons = Array.from(table?.querySelectorAll('.sort-btn') ?? []);
              const themeToggle = document.getElementById('theme-toggle');
              let activeSort = { key: 'marketCap', direction: 'desc' };

              themeToggle?.addEventListener('click', () => {
                const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
                document.documentElement.classList.toggle('dark', nextTheme === 'dark');
                localStorage.setItem('qualeno-theme', nextTheme);
              });

              function updateButtons() {
                buttons.forEach((button) => {
                  const isActive = button.dataset.sort === activeSort.key;
                  button.dataset.active = String(isActive);
                  button.dataset.direction = activeSort.direction === 'asc' ? '↑' : '↓';
                });
              }

              function sortRows(key, type, direction) {
                if (!tbody) return;
                const rows = Array.from(tbody.querySelectorAll('tr'));
                rows.sort((a, b) => {
                  const first = a.dataset[key] ?? '';
                  const second = b.dataset[key] ?? '';
                  const result = type === 'number'
                    ? Number(first) - Number(second)
                    : first.localeCompare(second);
                  return direction === 'asc' ? result : -result;
                });
                rows.forEach((row) => tbody.appendChild(row));
              }

              buttons.forEach((button) => {
                button.addEventListener('click', () => {
                  const key = button.dataset.sort;
                  const type = button.dataset.type ?? 'text';
                  const direction = activeSort.key === key && activeSort.direction === 'asc' ? 'desc' : 'asc';
                  activeSort = { key, direction };
                  sortRows(key, type, direction);
                  updateButtons();
                });
              });

              table?.querySelectorAll('tbody tr').forEach((row) => {
                row.addEventListener('click', (event) => {
                  if (event.target.closest('a, button')) return;
                  const href = row.dataset.href;
                  if (href) window.location.href = href;
                });

                row.addEventListener('keydown', (event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  if (event.target.closest('a, button')) return;
                  event.preventDefault();
                  const href = row.dataset.href;
                  if (href) window.location.href = href;
                });
              });

              updateButtons();
            `,
          }}
        />
      </body>
    </html>
  )
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
