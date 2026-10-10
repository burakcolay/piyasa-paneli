-- Çeyreklik gelirin geçen yılın aynı çeyreğine göre büyümesi ve büyümenin ivmesi.
-- Teknik: LAG(…, 4) ile 4 çeyrek önceki değer; ikinci LAG ile ivme (büyüme hızlanıyor mu).
WITH q AS (
  SELECT code, period_end, value AS revenue
  FROM fundamentals WHERE freq = 'Q' AND metric = 'revenue'
),
g AS (
  SELECT code, period_end, revenue,
         100.0 * (revenue / LAG(revenue, 4) OVER w - 1) AS yoy
  FROM q
  WINDOW w AS (PARTITION BY code ORDER BY period_end)
)
SELECT code, period_end, revenue, ROUND(yoy, 2) AS yoy,
       ROUND(yoy - LAG(yoy) OVER (PARTITION BY code ORDER BY period_end), 2) AS acceleration
FROM g
WHERE yoy IS NOT NULL
ORDER BY code, period_end;
