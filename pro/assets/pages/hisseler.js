import { shell, fail, esc, map, num, pct, tone, usd, loadUS, watchBtn, toggleWatch, isWatched, qm } from '../core.js';
import { pctv } from '../us.js';

const app = shell('hisseler', { title: 'Hisseler' });
// Hazır filtreler: tek tıkla en sık sorulan sorular
const PRESETS = [
  ['all', 'Tümü', () => true],
  ['watch', 'Takibim', (r) => isWatched('us', r.t)],
  ['growth', 'Hızlı büyüyen', (r) => r.revGrowth > 20],
  ['cheap', 'Düşük F/K', (r) => r.pe > 0 && r.pe < 20],
  ['margin', 'Yüksek marj', (r) => r.netMargin > 25],
  ['cash', 'Nakit makinesi', (r) => r.fcfYield > 4],
  ['insider', 'Yöneticiler alıyor', (r) => r.insiderNet90 > 0],
  ['loss', 'Zarar eden', (r) => r.netMargin < 0],
];
const COLS = [
  ['mcap', 'Piyasa değeri', (r) => usd(r.mcap)],
  ['chg', 'Gün', (r) => `<span class="${tone(r.chg)}">${pct(r.chg, 2)}</span>`],
  ['pe', 'F/K', (r) => (r.pe > 0 ? num(r.pe, 1) : '—'), 'fk'],
  ['ps', 'F/S', (r) => num(r.ps, 1), 'fs'],
  ['revGrowth', 'Büyüme', (r) => `<span class="${tone(r.revGrowth)}">${pct(r.revGrowth, 0)}</span>`],
  ['netMargin', 'Net marj', (r) => pctv(r.netMargin, 0), 'marj'],
  ['fcfYield', 'Nakit verimi', (r) => pctv(r.fcfYield, 1), 'fcfy'],
];

async function main() {
  const U = await loadUS('universe.json');
  const rows = U.rows;
  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort();
  let st = { p: 'all', sort: 'mcap', dir: -1, sec: '', q: '' };
  try { st = { ...st, ...JSON.parse(sessionStorage.getItem('us-screen') || '{}') }; } catch {}

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Hisseler</h1><p>${esc(U.index)} şirketleri. Finansallar SEC bildirimlerinden, son 12 ay. Satıra tıkla, şirketin tüm verisi açılsın.</p></div></div>
    <div class="filters">
      <div class="seg" id="pre">${map(PRESETS, ([k, l]) => `<button data-p="${k}">${l}</button>`)}</div>
      <div class="frow">
        <input class="inp" id="q" placeholder="Şirket ara" aria-label="Şirket ara" style="flex:1 1 180px">
        <select class="sel" id="sec" aria-label="Sektör"><option value="">Tüm sektörler</option>${map(sectors, (s) => `<option>${esc(s)}</option>`)}</select>
      </div>
    </div>
    <section class="panel" style="padding:6px 8px"><div class="tbl-wrap"><table class="tbl" id="t"></table></div></section>
    <p class="foot-note">Veri ${esc(U.updated)} tarihli. Fiyatlar kapanış, finansallar SEC EDGAR (XBRL). Yatırım tavsiyesi değildir.</p>
  </div>`;
  const T = document.getElementById('t');
  const draw = () => {
    try { sessionStorage.setItem('us-screen', JSON.stringify(st)); } catch {}
    const f = PRESETS.find((p) => p[0] === st.p)[2];
    const q = st.q.toLowerCase();
    const L = rows.filter((r) => f(r) && (!st.sec || r.sector === st.sec) && (!q || r.t.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)))
      .sort((a, b) => ((a[st.sort] ?? -Infinity) - (b[st.sort] ?? -Infinity)) * st.dir);
    app.querySelectorAll('#pre button').forEach((b) => b.classList.toggle('on', b.dataset.p === st.p));
    T.innerHTML = `<thead><tr><th></th><th>Şirket</th>${map(COLS, ([k, l, , t]) => `<th class="n"><button data-s="${k}">${l}${st.sort === k ? (st.dir < 0 ? ' ↓' : ' ↑') : ''}</button>${t ? qm(t) : ''}</th>`)}</tr></thead>
      <tbody>${L.length ? map(L, (r) => `<tr data-href="sirket.html?t=${r.t}" style="cursor:pointer"><td style="width:30px">${watchBtn('us', r.t)}</td><td><a class="row-link" href="sirket.html?t=${r.t}"><span class="tk">${esc(r.t)}</span><span class="nm">${esc(r.name)}</span></a></td>${map(COLS, ([, , f]) => `<td class="n">${f(r)}</td>`)}</tr>`) : `<tr><td colspan="9" class="muted" style="padding:24px;text-align:center">Bu filtreye uyan şirket yok.</td></tr>`}</tbody>`;
    document.getElementById('cnt')?.remove();
    T.closest('.panel').insertAdjacentHTML('beforebegin', `<p class="xs muted" id="cnt">${L.length} şirket</p>`);
  };
  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-watch]')) { if (st.p === 'watch') setTimeout(draw, 0); return; }
    const p = e.target.closest('[data-p]'); if (p) { st.p = p.dataset.p; draw(); return; }
    const s = e.target.closest('[data-s]'); if (s) { st.dir = st.sort === s.dataset.s ? -st.dir : -1; st.sort = s.dataset.s; draw(); return; }
    if (e.target.closest('a,button,.qm')) return;
    const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href;
  });
  const qi = document.getElementById('q'), si = document.getElementById('sec');
  qi.value = st.q; si.value = st.sec;
  qi.addEventListener('input', () => { st.q = qi.value; draw(); });
  si.addEventListener('change', () => { st.sec = si.value; draw(); });
  draw();
}
main().catch(fail);
