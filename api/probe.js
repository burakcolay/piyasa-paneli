// Geçici teşhis: CNBC sembollerini doğrular. Sorun çözülünce silinecek.
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const SYMS = ['.SPX', '.NDX', '.DJI', '.VIX', 'US10Y', 'US30Y', '.XU100', '.XU030', 'TRY=', 'EURTRY=', 'EUR=', 'XAU=', '@LCO.1', '.STOXX50E', '.GDAXI', '.N225', '.HSI', '.DXY', 'HYG', '@HG.1', 'AAPL', 'NVDA'];
module.exports = async (req, res) => {
  const u = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${encodeURIComponent(SYMS.join('|'))}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1`;
  const r = await fetch(u, { headers: UA });
  const j = await r.json();
  const q = j?.FormattedQuoteResult?.FormattedQuote || [];
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: r.status, keys: Object.keys(q[0] || {}), quotes: q.map((x) => ({ s: x.symbol, code: x.code, last: x.last, chg: x.change, pct: x.change_pct, prev: x.previous_day_closing, t: x.last_time })) });
};
