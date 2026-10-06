// Canlı fiyatlar. Vercel sunucu fonksiyonu: /api/live
// Kaynaklar: Yahoo Finance (endeks, döviz, emtia, BIST ~15 dk gecikmeli),
// CoinGecko (kripto fiyat ve piyasa değeri), alternative.me (Korku & Açgözlülük).
// Sonuç CDN'de 60 sn saklanır; kaynaklardan biri çökerse o kısım boş döner, gerisi çalışır.

const YAHOO = {
  spx: '^GSPC', ndx: '^NDX', dji: '^DJI', vix: '^VIX',
  us10y: '^TNX', us30y: '^TYX',
  xu100: 'XU100.IS', xu030: 'XU030.IS',
  usdtry: 'TRY=X', eurtry: 'EURTRY=X', eurusd: 'EURUSD=X',
  gold: 'GC=F', brent: 'BZ=F',
  sx5e: '^STOXX50E', dax: '^GDAXI', n225: '^N225', hsi: '^HSI',
};
const COINS = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana' };
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36', Accept: 'application/json' };

async function getJSON(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function yahoo(key, sym) {
  const j = await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
  const m = j?.chart?.result?.[0]?.meta;
  if (!m || typeof m.regularMarketPrice !== 'number') throw new Error('veri yok');
  let price = m.regularMarketPrice;
  let prev = m.chartPreviousClose ?? m.previousClose ?? null;
  // Eski usul ^TNX/^TYX 10 ile çarpılmış gelebilir (42,6 = %4,26)
  if ((key === 'us10y' || key === 'us30y') && price > 20) { price /= 10; if (prev) prev /= 10; }
  return [key, { price, prev, chg: prev ? ((price - prev) / prev) * 100 : null, time: m.regularMarketTime ? m.regularMarketTime * 1000 : null }];
}

module.exports = async (req, res) => {
  const out = { ts: Date.now(), markets: {}, crypto: {}, global: null, fng: null, errors: [] };

  const tasks = [
    ...Object.entries(YAHOO).map(([k, s]) => yahoo(k, s).then(([kk, v]) => { out.markets[kk] = v; }).catch((e) => out.errors.push(`${k}: ${e.message}`))),
    getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINS).join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`)
      .then((j) => {
        for (const [k, id] of Object.entries(COINS)) {
          if (j[id]) out.crypto[k] = { price: j[id].usd, chg: j[id].usd_24h_change ?? null, mcap: j[id].usd_market_cap ?? null };
        }
      }).catch((e) => out.errors.push(`coingecko: ${e.message}`)),
    getJSON('https://api.coingecko.com/api/v3/global')
      .then((j) => {
        const d = j.data;
        const total = d.total_market_cap.usd;
        out.global = {
          total, chg: d.market_cap_change_percentage_24h_usd ?? null,
          btcd: d.market_cap_percentage.btc, usdtd: d.market_cap_percentage.usdt ?? null,
          total2: total * (1 - d.market_cap_percentage.btc / 100),
        };
      }).catch((e) => out.errors.push(`global: ${e.message}`)),
    getJSON('https://api.alternative.me/fng/?limit=8')
      .then((j) => {
        const d = j.data || [];
        out.fng = { now: +d[0]?.value, yesterday: d[1] ? +d[1].value : null, week: d[7] ? +d[7].value : null };
      }).catch((e) => out.errors.push(`fng: ${e.message}`)),
  ];
  await Promise.all(tasks);

  // Gram altın = ons altın ($) × USD/TRY / 31,1035
  const g = out.markets.gold, u = out.markets.usdtry;
  if (g && u) {
    const price = (g.price * u.price) / 31.1035;
    const prev = g.prev && u.prev ? (g.prev * u.prev) / 31.1035 : null;
    out.markets.gramgold = { price, prev, chg: prev ? ((price - prev) / prev) * 100 : null, time: g.time };
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify(out));
};
