// Canlı fiyatlar. Vercel sunucu fonksiyonu: /api/live
// Kaynaklar: CNBC (endeks, döviz, emtia, BIST ~15 dk gecikmeli, hisseler),
// CoinGecko (kripto fiyat ve piyasa değeri), alternative.me (Korku & Açgözlülük).
// Sonuç CDN'de 2 dk saklanır; kaynaklardan biri çökerse o kısım boş döner, gerisi çalışır.

// Endeks, döviz, emtia, BIST ve hisseler: CNBC'nin herkese açık fiyat servisi (tek istekte hepsi).
// Not: Yahoo ve Stooq, Vercel sunucularından gelen istekleri engelliyor (429/404); CNBC çalışıyor.
const CNBC = {
  spx: '.SPX', ndx: '.NDX', dji: '.DJI', vix: '.VIX',
  us10y: 'US10Y', us30y: 'US30Y',
  xu100: '.XU100', xu030: '.XU030',
  usdtry: 'TRY=', eurtry: 'EURTRY=', eurusd: 'EUR=',
  gold: 'XAU=', brent: '@LCO.1',
  sx5e: '.STOXX50E', dax: '.GDAXI', n225: '.N225', hsi: '.HSI',
  // Risk termometresi
  dxy: '.DXY', hyg: 'HYG', copper: '@HG.1',
  // NQ devleri (bilanço kartları için)
  AAPL: 'AAPL', MSFT: 'MSFT', NVDA: 'NVDA', AMZN: 'AMZN', META: 'META', GOOGL: 'GOOGL', TSLA: 'TSLA', AVGO: 'AVGO',
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

const toNum = (s) => { const n = parseFloat(String(s ?? '').replace(/[,%+]/g, '')); return Number.isFinite(n) ? n : null; };

async function cnbc(out, errors) {
  const syms = Object.values(CNBC).join('|');
  const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${encodeURIComponent(syms)}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1`;
  try {
    const j = await getJSON(url, 8000);
    const list = j?.FormattedQuoteResult?.FormattedQuote || [];
    const byCode = Object.fromEntries(Object.entries(CNBC).map(([k, v]) => [v, k]));
    for (const q of list) {
      const key = byCode[q.symbol];
      const price = toNum(q.last), prev = toNum(q.previous_day_closing);
      if (!key || price == null) continue;
      out[key] = { price, prev, chg: prev ? ((price - prev) / prev) * 100 : toNum(q.change_pct), time: q.last_time ? Date.parse(q.last_time) : null };
    }
  } catch (e) { errors.push(`cnbc: ${e.message}`); }
  for (const k of Object.keys(CNBC)) if (!out[k]) errors.push(`${k}: yok`);
}

module.exports = async (req, res) => {
  const out = { ts: Date.now(), markets: {}, crypto: {}, global: null, fng: null, errors: [] };

  const tasks = [
    cnbc(out.markets, out.errors),
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

  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify(out));
};
