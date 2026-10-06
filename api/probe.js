// Geçici teşhis: veri kaynaklarının Vercel'den yanıtını gösterir. Sorun çözülünce silinecek.
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const URLS = {
  stooq1: 'https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv',
  stooq2: 'https://stooq.com/q/l/?s=%5Espx+aapl.us&f=sd2t2ohlcp&h&e=csv',
  stooq3: 'https://stooq.pl/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv',
  yspark: 'https://query1.finance.yahoo.com/v7/finance/spark?symbols=AAPL,%5EGSPC&range=1d&interval=1d',
  ychart2: 'https://query2.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
  finnhub: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
  cnbc: 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=.SPX%7C.NDX%7CUS10Y%7CXAU%3D%7C.VIX%7CTRY%3D&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1',
};
module.exports = async (req, res) => {
  const out = {};
  await Promise.all(Object.entries(URLS).map(async ([k, u]) => {
    try {
      const r = await fetch(u, { headers: UA });
      const t = await r.text();
      out[k] = { status: r.status, body: t.slice(0, 400) };
    } catch (e) { out[k] = { error: e.message }; }
  }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
};
