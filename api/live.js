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
  // NQ devleri (bilanço kartları için)
  // Risk termometresi
  dxy: 'DX-Y.NYB', hyg: 'HYG', copper: 'HG=F',
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

function toQuote(key, m) {
  if (!m || typeof m.regularMarketPrice !== 'number') return null;
  let price = m.regularMarketPrice;
  let prev = m.chartPreviousClose ?? m.previousClose ?? null;
  // Eski usul ^TNX/^TYX 10 ile çarpılmış gelebilir (42,6 = %4,26)
  if ((key === 'us10y' || key === 'us30y') && price > 20) { price /= 10; if (prev) prev /= 10; }
  return { price, prev, chg: prev ? ((price - prev) / prev) * 100 : null, time: m.regularMarketTime ? m.regularMarketTime * 1000 : null };
}

// Tek sembol (yedek yol)
async function yahooOne(key, sym, host = 'query1') {
  const j = await getJSON(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
  const q = toQuote(key, j?.chart?.result?.[0]?.meta);
  if (!q) throw new Error('veri yok');
  return q;
}

// Toplu istek: tek çağrıda 20 sembole kadar (Yahoo çok sayıda paralel isteği kısıtlıyor)
async function yahooBatch(entries) {
  const out = {};
  for (let i = 0; i < entries.length; i += 20) {
    const part = entries.slice(i, i + 20);
    const syms = part.map(([, s]) => s).join(',');
    try {
      const j = await getJSON(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(syms)}&range=1d&interval=1d`, 8000);
      const list = j?.spark?.result || [];
      for (const r of list) {
        const ent = part.find(([, s]) => s === r.symbol);
        const q = ent && toQuote(ent[0], r.response?.[0]?.meta);
        if (q) out[ent[0]] = q;
      }
    } catch { /* yedek yola düşer */ }
  }
  return out;
}

// Stooq: tek istekte tüm semboller (CSV, anahtar gerektirmez, ~15 dk gecikmeli)
const STOOQ = {
  spx: '^spx', ndx: '^ndx', dji: '^dji', vix: '^vix',
  us10y: '10usy.b', us30y: '30usy.b',
  usdtry: 'usdtry', eurtry: 'eurtry', eurusd: 'eurusd',
  gold: 'xauusd', brent: 'cb.f',
  dax: '^dax', n225: '^nkx', hsi: '^hsi',
  dxy: 'dx.f', hyg: 'hyg.us', copper: 'hg.f',
  AAPL: 'aapl.us', MSFT: 'msft.us', NVDA: 'nvda.us', AMZN: 'amzn.us', META: 'meta.us', GOOGL: 'googl.us', TSLA: 'tsla.us', AVGO: 'avgo.us',
};

async function stooq(out, errors) {
  const syms = Object.values(STOOQ).join('+');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(syms).replace(/%2B/g, '+')}&f=sd2t2ohlcp&h&e=csv`, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status}`);
    const lines = (await r.text()).trim().split(/\r?\n/);
    const head = lines.shift().split(',').map((h) => h.trim().toLowerCase());
    const iS = head.indexOf('symbol'), iC = head.indexOf('close'), iP = head.findIndex((h) => h.startsWith('prev'));
    const bySym = Object.fromEntries(Object.entries(STOOQ).map(([k, v]) => [v.toUpperCase(), k]));
    for (const ln of lines) {
      const c = ln.split(',');
      const key = bySym[(c[iS] || '').toUpperCase()];
      const price = parseFloat(c[iC]), prev = iP >= 0 ? parseFloat(c[iP]) : NaN;
      if (!key || !Number.isFinite(price)) continue;
      out[key] = { price, prev: Number.isFinite(prev) ? prev : null, chg: Number.isFinite(prev) && prev ? ((price - prev) / prev) * 100 : null, time: null, src: 'stooq' };
    }
  } catch (e) { errors.push(`stooq: ${e.message}`); }
  finally { clearTimeout(t); }
}

module.exports = async (req, res) => {
  const out = { ts: Date.now(), markets: {}, crypto: {}, global: null, fng: null, errors: [] };

  const tasks = [
    (async () => {
      // Önce Stooq (tek istek), eksik kalanlar Yahoo toplu istekle (en fazla 2 çağrı)
      await stooq(out.markets, out.errors);
      const missing = Object.entries(YAHOO).filter(([k]) => !out.markets[k]);
      if (missing.length) Object.assign(out.markets, await yahooBatch(missing));
      for (const [k] of Object.entries(YAHOO)) if (!out.markets[k]) out.errors.push(`${k}: yok`);
    })(),
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
