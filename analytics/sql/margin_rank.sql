-- Son mali yılda faaliyet marjı ve sektör içindeki sırası (yüzdelik dilim).
-- Teknik: koşullu pivot (uzun tablodan geniş tabloya), PERCENT_RANK pencere fonksiyonu.
WITH last_year AS (                                -- eski kalmış (güncel raporu olmayan) şirketler dışarıda
  SELECT code, MAX(period_end) AS period_end FROM fundamentals WHERE freq = 'Y' GROUP BY code
  HAVING MAX(period_end) >= date((SELECT MAX(period_end) FROM fundamentals), '-18 months')
),
wide AS (
  SELECT f.code, f.period_end,
         MAX(CASE WHEN metric = 'revenue' THEN value END) AS revenue,
         MAX(CASE WHEN metric = 'opinc'   THEN value END) AS opinc,
         MAX(CASE WHEN metric = 'net'     THEN value END) AS net
  FROM fundamentals f JOIN last_year l USING (code, period_end)
  WHERE f.freq = 'Y'
  GROUP BY f.code, f.period_end
)
SELECT w.code, a.sector, w.period_end,
       ROUND(100.0 * opinc / revenue, 1) AS op_margin,
       ROUND(100.0 * net / revenue, 1)   AS net_margin,
       ROUND(100 * PERCENT_RANK() OVER (PARTITION BY a.sector ORDER BY opinc / revenue), 0) AS sector_pctile
FROM wide w JOIN assets a USING (code)
WHERE revenue > 0
ORDER BY a.sector, op_margin DESC;
