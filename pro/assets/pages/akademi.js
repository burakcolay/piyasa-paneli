import { shell, fail, esc, map, loadSozluk, loadLive, setLivePill, refreshAlertDot, prefs, activeDays, toast } from '../core.js';

const app = shell('akademi', { title: 'Akademi' });
const getJSON = (u) => fetch(u, { cache: 'no-cache' }).then((r) => r.json());
const QKEY = 'pro-quiz';
const STARTER = ['faiz', 'sahin', 'risk', 'vix', 'egri', 'reel', 'nfp', 'pce', 'dominans'];

function seeded(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; }; }
const firstSentence = (s) => (String(s).match(/^.+?[.!?](\s|$)/) || [s])[0].trim();

function concept(id, c) {
  return `<details class="co" id="k-${esc(id)}"><summary style="grid-template-columns:1fr auto"><span><b style="font-weight:600">${esc(c.name)}</b><span class="nm" style="display:block;max-width:none;white-space:normal">${esc(firstSentence(c.def))}</span></span><span class="chip">${esc(c.cat)}</span></summary>
    <div class="co-body">
      <div><h4>Tanım</h4><p>${esc(c.def)}</p></div>
      <div><h4>Günlük hayattan benzetme</h4><p>${esc(c.analogy || '')}</p></div>
      ${c.chain?.length ? `<div style="grid-column:1/-1"><h4>Zincir</h4><div class="cause">${c.chain.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<span class="step">${esc(x)}</span>`).join('')}</div></div>` : ''}
      ${c.quote ? `<div><h4>Piyasada nasıl geçti</h4><p>"${esc(c.quote)}"</p></div>` : ''}
      ${c.rule ? `<div><h4>Akılda kalacak kural</h4><p>${esc(c.rule)}</p></div>` : ''}
      ${c.related?.length ? `<div class="xs muted" style="grid-column:1/-1">İlgili: ${c.related.map((r) => `<a href="#k-${esc(r)}" data-open="${esc(r)}">${esc(r)}</a>`).join(' · ')}</div>` : ''}
    </div></details>`;
}

async function main() {
  const [S, L, idx] = await Promise.all([loadSozluk(), loadLive(), getJSON('../data/daily/index.json').catch(() => [])]);
  setLivePill(L); refreshAlertDot({ live: L });
  const C = S.concepts || {}; const ids = Object.keys(C);
  const today = new Date().toISOString().slice(0, 10);
  const rnd = seeded(today);
  const pick = [...ids].sort(() => rnd() - 0.5).slice(0, 3);
  const qs = pick.map((id) => { const wrong = ids.filter((x) => x !== id).sort(() => rnd() - 0.5).slice(0, 3); return { id, opts: [id, ...wrong].sort(() => rnd() - 0.5) }; });
  let st = {}; try { st = JSON.parse(localStorage.getItem(QKEY) || '{}'); } catch {}
  if (st.day !== today) st = { day: today, ans: {} };
  const days = activeDays();
  let streak = 0; for (let i = 0; ; i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); if (days.includes(d)) streak++; else break; }
  const last14 = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
  const P = prefs();
  const dates = (Array.isArray(idx) ? idx : idx.dates || []).map((x) => (typeof x === 'string' ? x : x.date)).filter(Boolean).sort().reverse().slice(0, 12);
  let cat = 'Tümü', q = '';

  const quizHTML = () => map(qs, (x, i) => { const a = st.ans[i]; return `<div style="display:flex;flex-direction:column;gap:8px"><div class="quiz-q">${i + 1}. ${esc(firstSentence(C[x.id].def))} <span class="muted">Bu hangi kavram?</span></div>
    <div class="quiz-opts">${map(x.opts, (o) => `<button data-q="${i}" data-o="${esc(o)}" ${a ? 'disabled' : ''} class="${a ? (o === x.id ? 'ok' : o === a ? 'no' : '') : ''}">${esc(C[o].name)}</button>`)}</div>
    ${a ? `<p class="small ${a === x.id ? 'up' : 'down'}">${a === x.id ? 'Doğru.' : `Doğrusu: ${esc(C[x.id].name)}.`} <a href="#k-${esc(x.id)}" data-open="${esc(x.id)}">Kavramı aç</a></p>` : ''}</div>`; });
  const listHTML = () => { const Q = q.toLocaleLowerCase('tr-TR'); const ks = ids.filter((id) => (cat === 'Tümü' || C[id].cat === cat) && (!Q || `${C[id].name} ${C[id].def}`.toLocaleLowerCase('tr-TR').includes(Q))); return ks.length ? map(ks, (id) => concept(id, C[id])) : '<p class="small muted">Eşleşen kavram yok.</p>'; };
  const score = () => qs.filter((x, i) => st.ans[i] === x.id).length;

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Akademi</h1><p>Her gün piyasada geçen kavramlar, sade anlatımla. Sözlük sabah rutiniyle her gün büyüyor.</p></div></div>
    <div class="grid">
      <section class="panel glass c7"><div class="panel-h"><h2>Günün 3 sorusu</h2><span class="small muted" id="score">${Object.keys(st.ans).length === 3 ? `${score()} / 3` : 'Her gün yeni sorular'}</span></div><div id="quiz" style="display:flex;flex-direction:column;gap:18px">${quizHTML()}</div></section>
      <div class="c5" style="display:flex;flex-direction:column;gap:18px">
        <section class="panel glass"><div class="panel-h"><h2>Okuma serin</h2><b style="font-size:22px">${streak} gün</b></div><div class="streak">${map(last14, (d) => `<i class="${days.includes(d) ? 'on' : ''}" title="${d}"></i>`)}</div><p class="small muted">Paneli açtığın her gün sayılır. Her sabah 5 dakika, bir yılda piyasa dilini oturtur.</p></section>
        ${P.level === 'yeni' || !P.level ? `<section class="panel glass"><div class="panel-h"><h2>Buradan başla</h2></div><p class="small muted">Piyasa yorumlarını anlamak için önce bu kavramlar.</p><div class="rows">${map(STARTER.filter((x) => C[x]), (x, i) => `<a class="row" href="#k-${x}" data-open="${x}" style="color:inherit;text-decoration:none;padding:8px 2px"><span class="muted" style="width:18px">${i + 1}</span><div class="main-c"><b>${esc(C[x].name)}</b></div></a>`)}</div></section>` : ''}
      </div>
    </div>
    <section class="panel glass"><div class="panel-h"><h2>Sözlük</h2><span class="small muted">${ids.length} kavram</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><div class="seg" id="cats">${['Tümü', ...(S.categories || [])].map((c, i) => `<button data-cat="${esc(c)}" class="${i ? '' : 'on'}">${esc(c)}</button>`).join('')}</div><input class="inp" id="kq" placeholder="Kavram ara" style="width:180px" aria-label="Kavram ara"></div>
      <div id="klist">${listHTML()}</div></section>
    <section class="panel glass"><div class="panel-h"><h2>Ders arşivi</h2><span class="small muted">Sabah yazısındaki "günün dersi"</span></div><div class="rows" id="lessons"><p class="small muted">Yükleniyor…</p></div></section>
  </div>`;

  const openK = (id) => { const d = document.getElementById('k-' + id); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (b) { st.ans[b.dataset.q] = b.dataset.o; try { localStorage.setItem(QKEY, JSON.stringify(st)); } catch {} document.getElementById('quiz').innerHTML = quizHTML(); if (Object.keys(st.ans).length === 3) { document.getElementById('score').textContent = `${score()} / 3`; toast(`Bugün ${score()}/3`); } return; }
    const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); cat = 'Tümü'; q = ''; document.getElementById('kq').value = ''; document.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x.dataset.cat === 'Tümü')); document.getElementById('klist').innerHTML = listHTML(); openK(o.dataset.open); return; }
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; document.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === c)); document.getElementById('klist').innerHTML = listHTML(); }
  });
  document.getElementById('kq').addEventListener('input', (e) => { q = e.target.value.trim(); document.getElementById('klist').innerHTML = listHTML(); });
  if (location.hash.startsWith('#k-')) setTimeout(() => openK(location.hash.slice(3)), 50);

  const ls = [];
  for (const d of dates) { try { const day = await getJSON(`../data/daily/${d}.json`); if (day.s8) ls.push({ d, s8: day.s8 }); } catch {} }
  document.getElementById('lessons').innerHTML = ls.length ? map(ls, (x) => `<details class="co"><summary style="grid-template-columns:90px 1fr"><span class="small muted">${new Date(x.d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span><b style="font-weight:500">${esc(x.s8.title)}</b></summary><div class="prose small" style="padding:10px 2px 16px">${map(x.s8.paragraphs, (p) => `<p>${esc(p.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1'))}</p>`)}${x.s8.rule ? `<div class="note" style="margin-top:10px"><b>Kural:</b> ${esc(x.s8.rule)}</div>` : ''}</div></details>`) : '<p class="small muted">Arşiv bulunamadı.</p>';
}

main().catch(fail);
