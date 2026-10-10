import { shell, fail, esc, map, num, pct, tone, loadLive, setLivePill, refreshAlertDot, toast, ICON, liveOf, marketById } from '../core.js';

const app = shell('portfoy', { title: 'Portföyüm' });
const KEY = 'pro-portfolio-v1';
// Canlı fiyatı olan varlıklar: [anahtar, ad, para birimi, sınıf, piyasa]
const ASSETS = [
  ['usdtry', 'Dolar (USD)', 'TRY', 'Döviz', 'emtia'], ['eurtry', 'Euro (EUR)', 'TRY', 'Döviz', 'emtia'],
  ['gramgold', 'Gram altın', 'TRY', 'Altın', 'emtia'],
  ['c:btc', 'Bitcoin', 'USD', 'Kripto', 'kripto'], ['c:eth', 'Ethereum', 'USD', 'Kripto', 'kripto'], ['c:sol', 'Solana', 'USD', 'Kripto', 'kripto'], ['c:bnb', 'BNB', 'USD', 'Kripto', 'kripto'],
  ['AAPL', 'Apple', 'USD', 'ABD hisse', 'abd'], ['MSFT', 'Microsoft', 'USD', 'ABD hisse', 'abd'], ['NVDA', 'Nvidia', 'USD', 'ABD hisse', 'abd'], ['AMZN', 'Amazon', 'USD', 'ABD hisse', 'abd'], ['META', 'Meta', 'USD', 'ABD hisse', 'abd'], ['GOOGL', 'Alphabet', 'USD', 'ABD hisse', 'abd'], ['TSLA', 'Tesla', 'USD', 'ABD hisse', 'abd'], ['AVGO', 'Broadcom', 'USD', 'ABD hisse', 'abd'],
  ['manual', 'Diğer (BIST hissesi, fon, mevduat…)', 'TRY', 'Diğer', 'bist'],
];
const A = Object.fromEntries(ASSETS.map((a) => [a[0], a]));
const CLS_COLOR = { Döviz: '#1F7FA8', Altın: '#B8862B', Kripto: '#6B5BD2', 'ABD hisse': '#0C7A55', Diğer: '#8A97A8' };
const SAMPLE = [
  { id: 's1', key: 'gramgold', qty: 20, cost: 3900 }, { id: 's2', key: 'usdtry', qty: 1500, cost: 41.5 },
  { id: 's3', key: 'c:btc', qty: 0.03, cost: 64000 }, { id: 's4', key: 'NVDA', qty: 4, cost: 120 },
  { id: 's5', key: 'manual', name: 'TUPRS', qty: 200, cost: 158, price: 171 },
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

async function main() {
  let L = await loadLive();
  setLivePill(L); refreshAlertDot({ live: L });
  let P = load();
  const usd = () => liveOf(L, 'usdtry')?.price || null;

  const val = (r) => {
    const a = A[r.key];
    const lv = r.key === 'manual' ? null : liveOf(L, r.key);
    const px = r.key === 'manual' ? +r.price : lv?.price;
    const fx = a[2] === 'USD' ? usd() : 1;
    const now = px != null && fx ? px * r.qty * fx : null;
    const cost = r.cost * r.qty * (a[2] === 'USD' ? (r.costFx || fx) : 1);
    const day = lv?.chg != null && now != null ? now - now / (1 + lv.chg / 100) : 0;
    return { a, px, now, cost, pl: now != null ? now - cost : null, plp: now != null && cost ? (now / cost - 1) * 100 : null, day, chg: lv?.chg ?? null };
  };

  const render = () => {
    const rows = P.map((r) => ({ r, ...val(r) }));
    const total = rows.reduce((s, x) => s + (x.now || 0), 0), cost = rows.reduce((s, x) => s + x.cost, 0), day = rows.reduce((s, x) => s + x.day, 0);
    const dayP = total ? (day / (total - day)) * 100 : 0;
    const byCls = {}; rows.forEach((x) => { byCls[x.a[3]] = (byCls[x.a[3]] || 0) + (x.now || 0); });
    const mover = [...rows].filter((x) => x.day).sort((a, b) => Math.abs(b.day) - Math.abs(a.day))[0];
    const story = rows.length ? `Portföyün bugün ${pct(dayP, 2)} (${num(day, 0)} ₺) değişti${mover ? `; en büyük etki ${mover.r.name || mover.a[1]} tarafından geldi (${pct(mover.chg, 2)}).` : '.'} Neden hareket ettiğini ${mover ? `<a href="piyasa.html?m=${mover.a[4]}">${esc(marketById(mover.a[4]).name)}</a> sayfasındaki sabah okumasında bulabilirsin.` : 'piyasa sayfalarında bulabilirsin.'}` : '';

    app.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Portföyüm</h1><p>Varlıklarını gir, canlı fiyatlarla günlük değişimini ve kâr/zararını gör. Veriler sadece bu tarayıcıda saklanır.</p></div></div>
      ${rows.length ? `<section class="hero glass">
        <span class="greet">Toplam değer</span>
        <h1 style="font-size:40px;margin-top:4px">${num(total, 0)} ₺</h1>
        <div class="stats" style="margin-top:14px">
          <div class="stat"><div class="l">Bugün</div><div class="v ${tone(day)}">${day >= 0 ? '+' : '−'}${num(Math.abs(day), 0)} ₺</div><div class="s ${tone(dayP)}">${pct(dayP, 2)}</div></div>
          <div class="stat"><div class="l">Toplam kâr/zarar</div><div class="v ${tone(total - cost)}">${total - cost >= 0 ? '+' : '−'}${num(Math.abs(total - cost), 0)} ₺</div><div class="s ${tone(total - cost)}">${pct(cost ? (total / cost - 1) * 100 : 0)}</div></div>
          <div class="stat"><div class="l">Dolar karşılığı</div><div class="v">${usd() ? num(total / usd(), 0) + ' $' : '—'}</div><div class="s muted">USD/TRY ${num(usd(), 2)}</div></div>
        </div>
        <p class="lede" style="margin-top:16px">${story}</p>
        <div style="margin-top:14px"><div class="alloc">${map(Object.entries(byCls), ([k, v]) => `<span style="width:${(v / total) * 100}%;background:${CLS_COLOR[k]}" title="${esc(k)}"></span>`)}</div><div class="legend" style="margin-top:8px">${map(Object.entries(byCls), ([k, v]) => `<span><i style="background:${CLS_COLOR[k]}"></i>${esc(k)} %${num((v / total) * 100, 0)}</span>`)}</div></div>
      </section>` : `<section class="panel glass empty-state"><b>Portföyün boş</b><p>Aşağıdan varlık ekle ya da nasıl göründüğünü görmek için örnek portföyü yükle.</p><button class="btn primary" id="sample">Örnek portföy yükle</button></section>`}
      ${rows.length ? `<section class="panel glass"><div class="panel-h"><h2>Varlıklar</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Varlık</th><th class="n">Miktar</th><th class="n">Maliyet</th><th class="n">Fiyat</th><th class="n">Değer ₺</th><th class="n">Bugün</th><th class="n">Kâr/zarar</th><th></th></tr></thead><tbody>
        ${map(rows, (x) => `<tr><td><b>${esc(x.r.name || x.a[1])}</b><span class="nm">${esc(x.a[3])}${x.r.key === 'manual' ? ' · fiyat elle' : ''}</span></td><td class="n">${num(x.r.qty, x.r.qty < 1 ? 4 : 2)}</td><td class="n">${num(x.r.cost, 2)} ${x.a[2] === 'USD' ? '$' : '₺'}</td><td class="n">${x.px != null ? num(x.px, x.px < 10 ? 4 : 2) : '—'} ${x.a[2] === 'USD' ? '$' : '₺'}</td><td class="n">${x.now != null ? num(x.now, 0) : '—'}</td><td class="n ${tone(x.chg)}">${x.chg != null ? pct(x.chg, 2) : '—'}</td><td class="n ${tone(x.pl)}">${x.pl != null ? `${x.pl >= 0 ? '+' : '−'}${num(Math.abs(x.pl), 0)} ₺ <small>(${pct(x.plp)})</small>` : '—'}</td><td>${x.r.key === 'manual' ? `<button class="watch" data-price="${x.r.id}" title="Fiyatı güncelle">${ICON.gear}</button>` : ''}<button class="watch" data-del="${x.r.id}" title="Sil" aria-label="Sil">${ICON.trash}</button></td></tr>`)}
      </tbody></table></div></section>` : ''}
      <section class="panel glass"><div class="panel-h"><h2>Varlık ekle</h2></div>
        <form id="add" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
          <select class="sel" name="key" aria-label="Varlık">${map(ASSETS, (a) => `<option value="${a[0]}">${esc(a[1])}</option>`)}</select>
          <input class="inp" name="name" placeholder="Adı (ör. THYAO)" style="width:140px" hidden aria-label="Varlık adı">
          <input class="inp" name="qty" type="number" step="any" min="0" placeholder="Miktar" style="width:120px" required aria-label="Miktar">
          <input class="inp" name="cost" type="number" step="any" min="0" placeholder="Birim maliyet" style="width:140px" required aria-label="Birim maliyet">
          <input class="inp" name="price" type="number" step="any" min="0" placeholder="Güncel fiyat ₺" style="width:140px" hidden aria-label="Güncel fiyat">
          <span class="small muted" id="cur">₺</span>
          <button class="btn primary" type="submit">${ICON.plus}Ekle</button>
        </form>
        <p class="xs muted">Dolar bazlı varlıklarda maliyeti dolar olarak gir; kâr/zarar bugünkü kurla TL'ye çevrilir. BIST hisseleri ve fonlar için canlı fiyat lisans gerektirdiğinden fiyatı elle giriyorsun.</p>
      </section>
      <p class="foot-note">Canlı fiyatlar: CNBC ve CoinGecko, ~1 dakikada bir. Kişisel takip aracıdır, yatırım tavsiyesi değildir.</p>
    </div>`;

    const f = document.getElementById('add');
    const sync = () => { const m = f.key.value === 'manual'; f.name.hidden = !m; f.price.hidden = !m; f.price.required = m; document.getElementById('cur').textContent = A[f.key.value][2] === 'USD' ? '$ (birim maliyet)' : '₺ (birim maliyet)'; };
    f.key.addEventListener('change', sync); sync();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = { id: 'p' + Date.now(), key: f.key.value, qty: +f.qty.value, cost: +f.cost.value };
      if (r.key === 'manual') { r.name = f.name.value.trim().toUpperCase() || 'Diğer'; r.price = +f.price.value; }
      if (!(r.qty > 0)) { toast('Miktar gir'); return; }
      P.push(r); save(P); toast('Eklendi'); render();
    });
    document.getElementById('sample')?.addEventListener('click', () => { P = SAMPLE.map((x) => ({ ...x })); save(P); render(); });
  };
  render();
  app.addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]'); if (d) { P = P.filter((x) => x.id !== d.dataset.del); save(P); render(); }
    const p = e.target.closest('[data-price]'); if (p) { const r = P.find((x) => x.id === p.dataset.price); const v = prompt(`${r.name} güncel fiyatı (₺)`, r.price); if (v != null && isFinite(+v)) { r.price = +v; save(P); render(); } }
  });
  setInterval(async () => { const L2 = await loadLive(); if (L2) { L = L2; setLivePill(L); if (!document.activeElement?.closest('form')) render(); } }, 60000);
}

main().catch(fail);
