import React from 'react'
import type { FundamentalsCompany } from '../server/stockApi'

type HomepageProps = {
  companies: FundamentalsCompany[]
}

export default function Homepage({ companies }: HomepageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Qualeno</title>
        <style>{`
          body { font-family: "Space Grotesk", "Segoe UI", sans-serif; margin: 0; background: #ffffff; color: #0f172a; }
          main { max-width: 980px; margin: 0 auto; padding: 32px 16px; }
          .home-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
          .header-actions { display: flex; align-items: center; gap: 8px; }
          .icon-btn { width: 34px; height: 34px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: #0f172a; cursor: pointer; }
          .icon-btn:hover { background: #f8fafc; }
          h1 { margin: 0 0 8px 0; font-size: 28px; }
          p { margin: 0; color: #475569; }
          ul { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          li { border-bottom: 1px solid #e2e8f0; }
          li:last-child { border-bottom: 0; }
          .row-link { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; color: inherit; text-decoration: none; }
          .row-link:hover { background: #f8fafc; }
          .left { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .logo { width: 28px; height: 28px; border-radius: 999px; border: 1px solid #e2e8f0; object-fit: contain; background: #fff; flex-shrink: 0; }
          .text { min-width: 0; }
          .meta { color: #64748b; font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .right { text-align: right; flex-shrink: 0; }
          .price { font-weight: 600; }
          .change { font-size: 12px; margin-top: 2px; }
          .change.up { color: #16a34a; }
          .change.down { color: #dc2626; }
          .empty { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; color: #475569; }
        `}</style>
      </head>
      <body>
        <main>
          <header className="home-header">
            <div>
              <h1>Qualeno</h1>
              <p>{companies.length} companies available</p>
            </div>
            <div className="header-actions" aria-label="Header actions">
              <button type="button" className="icon-btn" aria-label="Toggle dark mode" title="Toggle dark mode">
                ◐
              </button>
              <button type="button" className="icon-btn" aria-label="Profile" title="Profile">
                👤
              </button>
            </div>
          </header>
          {companies.length > 0 ? (
            <ul>
              {companies.map((company) => {
                const meta = [company.sector, company.industry].filter(Boolean).join(' • ')
                const hasPrice = typeof company.latestPrice === 'number' && company.latestPrice > 0
                const isPositive = (company.dayChange ?? 0) >= 0
                const changeText =
                  typeof company.dayChange === 'number' && typeof company.dayChangePct === 'number'
                    ? `${isPositive ? '+' : ''}${company.dayChange.toFixed(2)} (${isPositive ? '+' : ''}${company.dayChangePct.toFixed(2)}%) 24h`
                    : '--'

                return (
                  <li key={company.symbol}>
                    <a href={`/ticker/${encodeURIComponent(company.symbol)}`} className="row-link">
                      <div className="left">
                        <img src={company.logoUrl} alt={`${company.symbol} logo`} className="logo" loading="lazy" />
                        <div className="text">
                          <div>
                            <strong>{company.symbol}</strong> — {company.companyName}
                          </div>
                          {meta ? <div className="meta">{meta}</div> : null}
                        </div>
                      </div>
                      <div className="right">
                        <div className="price">{hasPrice ? `${company.latestPrice?.toFixed(2)} USD` : '--'}</div>
                        <div className={`change ${isPositive ? 'up' : 'down'}`}>{hasPrice ? changeText : '--'}</div>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="empty">No companies found yet. Run sync first.</div>
          )}
        </main>
      </body>
    </html>
  )
}
