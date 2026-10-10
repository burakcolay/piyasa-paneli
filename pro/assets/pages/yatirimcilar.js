import { shell, fail, esc, map, num, pct, tone, usd, loadUS, params, qm } from '../core.js';
import { pctv, chip } from '../us.js';

const app = shell('yatirimcilar', { title: 'Büyük yatırımcılar' });

async function main() {
  const [F, U] = await Promise.all([loadUS('funds.json'), loadUS('universe.json').catch(() => ({ rows: [] }))]);
  const inIdx = new Set(U.rows.map((r) => r.t));
  const funds = F.funds.slice().sort((a, b) => b.total - a.total);
  const sel = params().get('f');
  const fund = funds.find((f) => f.name === sel);

  if (fund) return detail(fund, inIdx);

  // Nasdaq 100 içinde fonların ortak hareketi
  const agg = Object.entries(F.holders).map(([t, hs]) => ({ t, n: hs.filter((h) => h.chg !== 'out').length, buy: hs.filter((h) => h.chg === 'new' || h.chg === 'add').length, sell: hs.filter((h) => h.chg === 'cut' || h.chg === 'out').length, newN: hs.filter((h) => h.chg === 'new').length }));
  const name = (t) => U.rows.find((r) => r.t === t)?.name || '';
  const most = agg.slice().sort((a, b) => b.n - a.n).slice(0, 10);
  const bought = agg.filter((a) => a.buy > a.sell).sort((a, b) => b.buy - b.sell - (a.buy - a.sell)).slice(0, 8);
  const sold = agg.filter((a) => a.sell > a.buy).sort((a, b) => b.sell - b.buy - (a.sell - a.buy)).slice(0, 8);
  const list = (L, k) => map(L, (a) => `<a class="row" href="sirket.html?t=${a.t}#yat"><div class="main-c"><b>${esc(a.t)}</b><small>${esc(name(a.t))}</small></div><span class="end small">${k(a)}</span></a>`);

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Büyük yatırımcılar</h1><p>Tanınmış 20 fonun son ${qm('f13')} bildirimleri: ne tutuyorlar, son çeyrekte neyi aldılar, neyi sattılar. Bildirimler çeyrek sonundan 45 gün sonra gelir, gecikmeli bir fotoğraftır.</p></div></div>
    <div class="row3">
      <section class="panel"><div class="panel-h"><h2>En çok tutulan</h2><span class="xs muted">Nasdaq 100 içinde</span></div><div class="rows">${list(most, (a) => `${a.n} fon`)}</div></section>
      <section class="panel"><div class="panel-h"><h2>Son çeyrekte alınan</h2></div><div class="rows">${list(bought, (a) => `<span class="up">${a.buy} aldı</span>${a.sell ? ` <span class="muted">· ${a.sell} sattı</span>` : ''}`) || '<p class="small muted">Belirgin ortak alım yok.</p>'}</div></section>
      <section class="panel"><div class="panel-h"><h2>Son çeyrekte satılan</h2></div><div class="rows">${list(sold, (a) => `<span class="down">${a.sell} sattı</span>${a.buy ? ` <span class="muted">· ${a.buy} aldı</span>` : ''}`) || '<p class="small muted">Belirgin ortak satış yok.</p>'}</div></section>
    </div>
    <section class="panel"><div class="panel-h"><h2>Fonlar</h2></div><div class="fund-grid">
      ${map(funds, (f) => { const top = f.holdings.filter((h) => h.value > 0).slice(0, 3); return `<a class="fund-card" href="?f=${encodeURIComponent(f.name)}"><div><b>${esc(f.person)}</b><small>${esc(f.name)}</small></div><div class="fc-v">${usd(f.total)}<small>${f.n} pozisyon · ${esc(f.period)}</small></div><div class="fc-top">${map(top, (h) => `<span>${esc(h.t || short(h.name))} <i>${pctv((h.value / f.total) * 100, 0)}</i></span>`)}</div></a>`; })}
    </div></section>
    <p class="foot-note">Kaynak: SEC EDGAR 13F-HR. Opsiyonlar ve açığa satışlar dahil değildir. Yatırım tavsiyesi değildir.</p>
  </div>`;
}
const short = (n) => String(n || '').split(' ').slice(0, 2).join(' ');

function detail(f, inIdx) {
  const live = f.holdings.filter((h) => h.value > 0);
  const moves = f.holdings.filter((h) => h.chg !== 'same').sort((a, b) => ({ new: 0, add: 1, cut: 2, out: 3 }[a.chg] - { new: 0, add: 1, cut: 2, out: 3 }[b.chg]) || b.value - a.value);
  const top10 = live.slice(0, 10).reduce((s, h) => s + h.value, 0) / f.total * 100;
  const row = (h) => `<tr><td>${h.t && inIdx.has(h.t) ? `<a class="row-link" href="sirket.html?t=${h.t}"><span class="tk">${esc(h.t)}</span><span class="nm">${esc(h.name)}</span></a>` : `<b>${esc(h.name)}</b>`}</td><td class="n">${usd(h.value)}</td><td class="n">${pctv((h.value / f.total) * 100, 1)}</td><td class="n">${h.prevShares && h.shares && h.chg !== 'new' ? `<span class="${tone(h.shares - h.prevShares)}">${pct((h.shares / h.prevShares - 1) * 100, 0)}</span>` : ''}</td><td>${chip(h.chg)}</td></tr>`;
  app.innerHTML = `<div class="page">
    <a class="small" href="yatirimcilar.html">← Tüm fonlar</a>
    <div class="page-head"><div><h1>${esc(f.person)}</h1><p>${esc(f.name)} · ${esc(f.period)} çeyrek sonu, ${esc(f.filed)} tarihinde bildirildi.</p></div></div>
    <div class="stats"><div class="stat"><div class="l">ABD hisse portföyü</div><div class="v">${usd(f.total)}</div></div><div class="stat"><div class="l">Pozisyon</div><div class="v">${f.n}</div></div><div class="stat"><div class="l">İlk 10'un payı</div><div class="v">${pctv(top10, 0)}</div><div class="s muted">${top10 > 70 ? 'Yoğun portföy' : top10 > 40 ? 'Orta' : 'Dağınık portföy'}</div></div><div class="stat"><div class="l">Son çeyrek</div><div class="v small" style="font-size:15px">${moves.filter((h) => h.chg === 'new').length} yeni, ${moves.filter((h) => h.chg === 'out').length} çıkış</div></div></div>
    <div class="grid2">
      <section class="panel"><div class="panel-h"><h2>En büyük pozisyonlar</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hisse</th><th class="n">Değer</th><th class="n">Pay</th><th class="n">Adet değ.</th><th></th></tr></thead><tbody>${map(live.slice(0, 25), row)}</tbody></table></div></section>
      <section class="panel"><div class="panel-h"><h2>Son çeyrekte değişenler</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hisse</th><th class="n">Değer</th><th class="n">Pay</th><th class="n">Adet değ.</th><th></th></tr></thead><tbody>${map(moves.slice(0, 25), row) || '<tr><td colspan="5" class="muted">Değişiklik yok.</td></tr>'}</tbody></table></div></section>
    </div>
    <p class="foot-note">Kaynak: SEC EDGAR 13F-HR. Yatırım tavsiyesi değildir.</p>
  </div>`;
}
main().catch(fail);
