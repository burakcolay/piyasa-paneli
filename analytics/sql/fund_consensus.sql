-- Takip edilen büyük fonların ortak tercihleri: kaç fon tutuyor, son çeyrekte kaçı artırdı/azalttı.
SELECT code,
       COUNT(*)                                                     AS funds,
       SUM(CASE WHEN change IN ('new', 'add') THEN 1 ELSE 0 END)    AS buyers,
       SUM(CASE WHEN change IN ('cut', 'out') THEN 1 ELSE 0 END)    AS sellers,
       ROUND(SUM(value_usd) / 1e9, 2)                               AS total_busd
FROM fund_holdings
WHERE code IS NOT NULL
GROUP BY code
HAVING funds >= 3
ORDER BY buyers - sellers DESC, funds DESC;
