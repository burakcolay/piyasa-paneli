-- Sektörlerin eşit ağırlıklı getirisi ve sektör içi en iyi / en kötü hisse.
-- Teknik: CTE zinciri, pencere fonksiyonu ile sektör içi sıralama (RANK), GROUP BY ile toplulaştırma.
WITH ranked AS (
  SELECT code, date, close, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
  FROM prices
),
ret AS (
  SELECT code,
         100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 6 THEN close END) - 1)  AS r_1w,
         100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 22 THEN close END) - 1) AS r_1m,
         100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 64 THEN close END) - 1) AS r_3m
  FROM ranked WHERE rn <= 64 GROUP BY code
),
stock AS (
  SELECT a.sector, r.*,
         RANK() OVER (PARTITION BY a.sector ORDER BY r.r_1m DESC) AS best,
         RANK() OVER (PARTITION BY a.sector ORDER BY r.r_1m ASC)  AS worst
  FROM ret r JOIN assets a USING (code)
  WHERE a.cls = 'hisse' AND a.sector <> ''
)
SELECT sector,
       COUNT(*)                                  AS n,
       ROUND(AVG(r_1w), 2)                       AS r_1w,
       ROUND(AVG(r_1m), 2)                       AS r_1m,
       ROUND(AVG(r_3m), 2)                       AS r_3m,
       SUM(CASE WHEN r_1m > 0 THEN 1 ELSE 0 END) AS up_1m,
       MAX(CASE WHEN best = 1 THEN code END)     AS leader,
       MAX(CASE WHEN worst = 1 THEN code END)    AS laggard
FROM stock
GROUP BY sector
ORDER BY r_1m DESC;
