-- Her varlığın 1 hafta, 1 ay, 3 ay ve yılbaşından bu yana getirisi.
-- Teknik: ROW_NUMBER ile her varlığın günlerini sondan numaralar, N gün önceki kapanışı koşullu toplama ile alır.
WITH ranked AS (
  SELECT code, date, close,
         ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
  FROM prices
),
ytd_base AS (                                   -- geçen yılın son kapanışı
  SELECT code, close AS ytd_close
  FROM (SELECT code, close, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS r
        FROM prices WHERE date < strftime('%Y-01-01', (SELECT MAX(date) FROM prices)))
  WHERE r = 1
)
SELECT r.code, a.name, a.sector, a.cls,
       MAX(CASE WHEN rn = 1 THEN date END)                                       AS last_date,
       MAX(CASE WHEN rn = 1 THEN close END)                                      AS last_close,
       100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 6 THEN close END) - 1)  AS r_1w,
       100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 22 THEN close END) - 1) AS r_1m,
       100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(CASE WHEN rn = 64 THEN close END) - 1) AS r_3m,
       100.0 * (MAX(CASE WHEN rn = 1 THEN close END) / MAX(y.ytd_close) - 1)                     AS r_ytd
FROM ranked r
JOIN assets a USING (code)
LEFT JOIN ytd_base y USING (code)
WHERE rn <= 64
GROUP BY r.code;
