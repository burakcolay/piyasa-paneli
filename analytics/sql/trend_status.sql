-- 50 ve 200 günlük hareketli ortalamalar ve fiyatın bunlara göre konumu (trend sağlığı).
-- Teknik: AVG() OVER (ROWS BETWEEN n PRECEDING AND CURRENT ROW) ile hareketli ortalama.
WITH ma AS (
  SELECT code, date, close,
         AVG(close) OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)  AS ma50,
         AVG(close) OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
         COUNT(*)   OVER (PARTITION BY code ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS n,
         ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
  FROM prices
)
SELECT code, date, close, ROUND(ma50, 2) AS ma50, ROUND(ma200, 2) AS ma200,
       ROUND(100.0 * (close / ma200 - 1), 1) AS dist_ma200,
       CASE WHEN close > ma50 AND ma50 > ma200 THEN 'güçlü yükseliş'
            WHEN close > ma200                  THEN 'yükseliş'
            WHEN close < ma50 AND ma50 < ma200  THEN 'güçlü düşüş'
            ELSE 'düşüş' END AS trend
FROM ma
WHERE rn = 1 AND n = 200;
