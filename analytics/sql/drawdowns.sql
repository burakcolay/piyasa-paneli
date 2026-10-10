-- Her varlığın zirveden en büyük düşüşü (maksimum drawdown) ve şu an zirveden ne kadar uzakta olduğu.
-- Teknik: MAX() OVER (ROWS UNBOUNDED PRECEDING) ile o güne kadarki en yüksek kapanış.
WITH peak AS (
  SELECT code, date, close,
         MAX(close) OVER (PARTITION BY code ORDER BY date ROWS UNBOUNDED PRECEDING) AS run_max,
         ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
  FROM prices
),
dd AS (SELECT code, date, rn, 100.0 * (close / run_max - 1) AS drawdown FROM peak)
SELECT d.code, a.name, a.cls,
       ROUND(MIN(drawdown), 1)                                AS max_drawdown,
       (SELECT date FROM dd x WHERE x.code = d.code ORDER BY drawdown LIMIT 1) AS trough_date,
       ROUND(MAX(CASE WHEN rn = 1 THEN drawdown END), 1)      AS current_drawdown
FROM dd d JOIN assets a USING (code)
GROUP BY d.code
ORDER BY max_drawdown;
