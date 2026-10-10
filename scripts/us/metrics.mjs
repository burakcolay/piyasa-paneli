// Finansallardan türetilen oranlar, büyüme, F-skoru. build.mjs kullanır; sayfa sadece sonucu gösterir.
const div = (a, b) => (a == null || b == null || b === 0 ? null : a / b);
const pc = (a, b) => { const x = div(a, b); return x == null ? null : x * 100; };
const avg = (a, b) => (a == null ? b : b == null ? a : (a + b) / 2);
const sum = (...xs) => (xs.every((x) => x == null) ? null : xs.reduce((s, x) => s + (x || 0), 0));

// Tek dönemin oranları. prev: bir önceki aynı uzunluktaki dönem (ortalama bilanço için)
export function ratios(r, prev = {}) {
  const totDebt = sum(r.debt, r.stDebt);
  const ebitda = r.opinc != null && r.da != null ? r.opinc + r.da : null;
  const fcf = r.ocf != null ? r.ocf - (r.capex || 0) : null;
  const taxRate = r.tax != null && r.pretax > 0 ? Math.min(Math.max(r.tax / r.pretax, 0), 0.5) : 0.21;
  const invested = sum(r.equity, totDebt) != null ? sum(r.equity, totDebt) - (r.cash || 0) : null;
  return {
    grossM: pc(r.gross, r.revenue), opM: pc(r.opinc, r.revenue), netM: pc(r.net, r.revenue), ebitdaM: pc(ebitda, r.revenue), fcfM: pc(fcf, r.revenue),
    roe: pc(r.net, avg(r.equity, prev.equity)), roa: pc(r.net, avg(r.assets, prev.assets)),
    roic: invested > 0 && r.opinc != null ? (r.opinc * (1 - taxRate) / invested) * 100 : null,
    current: div(r.curAssets, r.curLiab), quick: r.curAssets != null && r.curLiab ? (r.curAssets - (r.inv || 0)) / r.curLiab : null,
    debtEq: r.equity > 0 ? div(totDebt, r.equity) : null,
    netDebtEbitda: ebitda > 0 && totDebt != null ? (totDebt - (r.cash || 0) - (r.stInv || 0)) / ebitda : null,
    intCover: r.interest > 0 ? div(r.opinc, r.interest) : null,
    invTurn: div(r.cogs, avg(r.inv, prev.inv)), recvDays: r.revenue && r.recv != null ? (r.recv / r.revenue) * 365 : null,
    taxRate: r.tax != null && r.pretax > 0 ? (r.tax / r.pretax) * 100 : null,
    rndPct: pc(r.rnd, r.revenue), sbcPct: pc(r.sbc, r.revenue), capexPct: pc(r.capex, r.revenue),
    payout: r.net > 0 && r.divPaid != null ? pc(r.divPaid, r.net) : null,
    ebitda, fcf, totDebt, netDebt: totDebt != null ? totDebt - (r.cash || 0) - (r.stInv || 0) : null,
  };
}

const cagr = (a, b, y) => (a > 0 && b > 0 ? (Math.pow(b / a, 1 / y) - 1) * 100 : null);

export function metrics(fin, mcap) {
  if (!fin?.annual?.length) return null;
  const A = fin.annual, Q = fin.quarterly || [];
  const annual = A.map((r, i) => ({ end: r.end, fy: r.fy, ...ratios(r, A[i - 1] || {}) }));
  const quarterly = Q.map((r, i) => { const x = ratios(r, Q[i - 1] || {}); const k = ['grossM', 'opM', 'netM', 'ebitdaM', 'fcfM', 'current', 'quick', 'debtEq', 'taxRate', 'rndPct', 'sbcPct', 'ebitda', 'fcf', 'netDebt']; return { end: r.end, ...Object.fromEntries(k.map((j) => [j, x[j]])) }; });
  // Son 12 ay: çeyrek akışları + son bilanço; ortalama için 4 çeyrek önceki bilanço
  const lastQ = Q.at(-1) || {}, yearAgo = Q.at(-5) || A.at(-2) || {};
  const tt = { ...fin.ttm }; for (const k of ['cash', 'stInv', 'recv', 'inv', 'curAssets', 'assets', 'curLiab', 'stDebt', 'debt', 'liab', 'equity']) tt[k] = fin.bs?.[k] ?? lastQ[k] ?? null;
  const ttm = ratios(tt, yearAgo);
  const ev = mcap != null && ttm.netDebt != null ? mcap + ttm.netDebt : mcap;
  const val = { ev, evEbitda: ttm.ebitda > 0 ? div(ev, ttm.ebitda) : null, evSales: div(ev, tt.revenue), pb: tt.equity > 0 ? div(mcap, tt.equity) : null, fcfYield: pc(ttm.fcf, mcap), divYield: pc(tt.divPaid, mcap), buybackYield: pc(tt.buyback, mcap) };

  // Büyüme: yıllık bileşik
  const G = {};
  for (const k of ['revenue', 'opinc', 'net', 'eps', 'fcf', 'dps']) {
    const s = A.map((r) => (k === 'fcf' ? (r.ocf != null ? r.ocf - (r.capex || 0) : null) : r[k]));
    const L = s.length - 1;
    G[k] = { y1: L >= 1 ? cagr(s[L - 1], s[L], 1) : null, y3: L >= 3 ? cagr(s[L - 3], s[L], 3) : null, y5: L >= 5 ? cagr(s[L - 5], s[L], 5) : null };
  }

  // Piotroski F-skoru: son iki yıl
  let fscore = null;
  if (A.length >= 2) {
    const c = A.at(-1), p = A.at(-2), rc = annual.at(-1), rp = annual.at(-2);
    const lev = (r) => div(r.debt, r.assets), turn = (r, pr) => div(r.revenue, avg(r.assets, pr?.assets));
    const items = [
      ['Net kâr pozitif', c.net != null ? c.net > 0 : null],
      ['Faaliyet nakit akışı pozitif', c.ocf != null ? c.ocf > 0 : null],
      ['Aktif kârlılığı arttı', rc.roa != null && rp.roa != null ? rc.roa > rp.roa : null],
      ['Nakit akışı kârdan büyük (kâr kalitesi)', c.ocf != null && c.net != null ? c.ocf > c.net : null],
      ['Uzun vadeli borç oranı düştü', lev(c) != null && lev(p) != null ? lev(c) <= lev(p) : null],
      ['Cari oran arttı', rc.current != null && rp.current != null ? rc.current > rp.current : null],
      ['Hisse sayısı artmadı', c.shDil != null && p.shDil != null ? c.shDil <= p.shDil * 1.01 : null],
      ['Brüt marj arttı', rc.grossM != null && rp.grossM != null ? rc.grossM > rp.grossM : null],
      ['Varlık devir hızı arttı', turn(c, p) != null && turn(p, A.at(-3)) != null ? turn(c, p) > turn(p, A.at(-3)) : null],
    ].map(([label, ok]) => ({ label, ok }));
    const known = items.filter((x) => x.ok != null);
    fscore = { score: known.filter((x) => x.ok).length, n: known.length, year: c.fy, items };
  }
  return { annual, quarterly, ttm, val, growth: G, fscore };
}
