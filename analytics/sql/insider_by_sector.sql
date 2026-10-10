-- Son 180 günde yöneticilerin sektör bazında net alım/satımı ve plansız (10b5-1 dışı) satışların payı.
SELECT a.sector,
       COUNT(DISTINCT t.code)                                   AS companies,
       ROUND(SUM(t.buy_usd) / 1e6, 1)                           AS buy_musd,
       ROUND(SUM(t.sell_usd) / 1e6, 1)                          AS sell_musd,
       ROUND((SUM(t.buy_usd) - SUM(t.sell_usd)) / 1e6, 1)       AS net_musd,
       ROUND(100.0 * SUM(CASE WHEN t.plan = 0 THEN t.sell_usd ELSE 0 END) / NULLIF(SUM(t.sell_usd), 0), 0) AS unplanned_sell_pct
FROM insider_trades t JOIN assets a USING (code)
WHERE t.date >= date((SELECT MAX(date) FROM prices), '-180 day')
GROUP BY a.sector
ORDER BY net_musd DESC;
