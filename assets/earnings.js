// NQ devlerinin bilanço takvimi ve şirket kartı (bilancolar.html)
import { esc, map, num, signed, loadJSON } from './app.js';

let LIVE = null;
export const setLive = (L) => { LIVE = L; };

export const TR_MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const TR_DAY = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function earningsBlock(list, today) {
  if (!list?.length) return '<p class="muted">Takvim henüz yok.</p>';
  const t0 = Date.parse(today + 'T00:00:00Z');
  return [...list].sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
    const t = Date.parse(e.date + 'T00:00:00Z');
    const days = Math.round((t - t0) / 864e5);
    if (days < -1) return '';
    const dt = new Date(t);
    const label = `${dt.getUTCDate()} ${TR_MON[dt.getUTCMonth()]} ${TR_DAY[dt.getUTCDay()]}`;
    const after = e.time !== 'before';
    const next = new Date(t + 864e5 * (dt.getUTCDay() === 5 ? 3 : 1));
    const impact = after ? `NQ'ya etkisi: ${next.getUTCDate()} ${TR_MON[next.getUTCMonth()]} açılışı` : 'NQ\'ya etkisi: aynı gün açılış';
    const when = days === 0 ? (after ? 'bu gece' : 'bugün') : days === 1 ? 'yarın' : days < 0 ? 'dün gece' : `${days} gün sonra`;
    const hot = days >= -1 && days <= 1;
    return `<div class="earn ${hot ? 'hot' : ''}" data-tk="${esc(e.ticker)}" role="button" tabindex="0" aria-label="${esc(e.name)} bilanço detayı"><div class="top"><b class="mono">${esc(e.ticker)}</b><span>${esc(e.name)}</span>
      <span class="mono small">${label}</span><span class="small ${hot ? 'down' : 'muted'}" style="text-align:right;font-weight:${hot ? 600 : 400}">${when}</span></div>
      <small class="muted">${after ? 'Kapanış sonrası' : 'Açılış öncesi'} · ${impact} · <span class="more">Detay →</span></small></div>`;
  }).join('');
}

let COMPANIES = null;
export async function openCompany(tk) {
  if (!COMPANIES) COMPANIES = await loadJSON('data/companies.json').catch(() => ({ companies: {} }));
  const c = COMPANIES.companies?.[tk];
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('.close')) close(); });
  if (!c) { bg.innerHTML = `<div class="modal"><button class="close">Kapat</button><p>${esc(tk)} için detay henüz yok.</p><a href="sirket.html?t=${esc(tk)}">Şirket sayfasına git →</a></div>`; document.body.appendChild(bg); return; }
  const live = LIVE?.markets?.[tk];
  const A = c.analysts;
  const tot = A ? (A.buy + A.hold + A.sell) || 1 : 1;
  const upside = live && A?.target ? ((A.target - live.price) / live.price) * 100 : null;
  const sur = (o) => (o && o.est ? ((o.act - o.est) / Math.abs(o.est)) * 100 : null);
  const surCell = (v) => v == null ? '–' : `<span class="${v >= 0 ? 'up' : 'down'}">${esc(signed(v, 1))}</span>`;
  const L = c.last, N = c.next || {};
  const nd = N.date ? new Date(N.date + 'T00:00:00Z') : null;
  const ndLabel = nd ? `${nd.getUTCDate()} ${TR_MON[nd.getUTCMonth()]} ${TR_DAY[nd.getUTCDay()]}` : '–';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(c.name)}">
    <div class="head-row"><span class="eyebrow accent">${esc(tk)} · NQ devi</span><button class="close" type="button">Kapat ✕</button></div>
    <div><h2>${esc(c.name)}</h2>
      ${live ? `<div class="mono" style="font-size:20px;margin-top:4px">${num(live.price, 2)} $ <span class="small ${live.chg >= 0 ? 'up' : 'down'}">${esc(signed(live.chg, 2))} bugün</span> <i class="dot"></i><span class="xs muted">canlı</span></div>` : ''}
    </div>
    <p>${esc(c.about)}</p>
    ${c.nq_note ? `<p class="note"><strong>NQ için neden önemli:</strong> ${esc(c.nq_note)}</p>` : ''}
    <a class="small" href="sirket.html?t=${esc(tk)}">Finansallar, oranlar ve yorumlar: şirket sayfası →</a>

    <div>
      <h3>Sıradaki bilanço · ${esc(N.period || '')}</h3>
      <div class="small">${ndLabel} · ${N.time === 'before' ? 'açılış öncesi' : 'kapanış sonrası'}</div>
      <table class="tbl" style="margin-top:8px"><thead><tr><th></th><th class="r">Beklenti</th></tr></thead><tbody>
        <tr><td>Hisse başı kâr (EPS)</td><td class="r num">${N.eps_est != null ? num(N.eps_est, 2) + ' $' : '–'}</td></tr>
        <tr><td>Gelir</td><td class="r num">${N.rev_est != null ? num(N.rev_est, 2) + ' mlr $' : '–'}</td></tr>
      </tbody></table>
      ${N.eps_est == null && N.rev_est == null ? '<div class="xs muted" style="margin-top:4px">Analist beklentileri bilançodan yaklaşık 10 gün önce eklenir.</div>' : ''}
      ${N.known?.length ? `<div style="margin-top:10px"><b class="small">Şimdiden bilinenler</b><ul class="small">${map(N.known, (x) => `<li>${esc(x)}</li>`)}</ul></div>` : ''}
      ${N.watch?.length ? `<div style="margin-top:10px"><b class="small">Bilançoda neye bakılacak</b><ul class="small">${map(N.watch, (x) => `<li>${esc(x)}</li>`)}</ul></div>` : ''}
    </div>

    ${L ? `<div>
      <h3>Son bilanço · ${esc(L.period)}</h3>
      <table class="tbl"><thead><tr><th></th><th class="r">Beklenti</th><th class="r">Gerçekleşen</th><th class="r">Sürpriz</th></tr></thead><tbody>
        <tr><td>Hisse başı kâr (EPS)</td><td class="r num">${num(L.eps.est, 2)} $</td><td class="r num" style="font-weight:500">${num(L.eps.act, 2)} $</td><td class="r num">${surCell(sur(L.eps))}</td></tr>
        <tr><td>Gelir</td><td class="r num">${num(L.rev.est, 2)} mlr $</td><td class="r num" style="font-weight:500">${num(L.rev.act, 2)} mlr $</td><td class="r num">${surCell(sur(L.rev))}</td></tr>
      </tbody></table>
      ${L.note ? `<p class="small" style="margin-top:8px;color:var(--ink-2)">${esc(L.note)}</p>` : ''}
    </div>` : ''}

    ${c.segments?.items?.length ? `<div>
      <h3>Gelir nereden geliyor · ${esc(c.segments.period)}</h3>
      ${map(c.segments.items, (g) => `<div class="seg"><span>${esc(g.name)}</span><div class="bar"><span style="width:${Math.max(1, g.share)}%"></span></div><span class="mono small" style="text-align:right">%${num(g.share, 1)}</span></div>`)}
    </div>` : ''}

    ${A ? `<div>
      <h3>Analistler</h3>
      <div class="rate-bar"><span style="width:${A.buy / tot * 100}%;background:#0B7A47"></span><span style="width:${A.hold / tot * 100}%;background:#C9CCD4"></span><span style="width:${A.sell / tot * 100}%;background:#B42318"></span></div>
      <div class="small">${A.buy} al · ${A.hold} tut · ${A.sell} sat</div>
      <div class="small" style="margin-top:4px">Ortalama hedef fiyat: <b class="mono">${num(A.target, 2)} $</b>${upside != null ? ` · şu anki fiyata göre <span class="${upside >= 0 ? 'up' : 'down'}">${esc(signed(upside, 1))}</span>` : ''}</div>
    </div>` : ''}

    ${c.sources?.length ? `<div class="xs muted">Kaynaklar: ${c.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(' · ')}</div>` : ''}
    <div class="xs muted">Veriler Bigdata.com (FMP). Bilgi amaçlıdır, yatırım tavsiyesi değildir. Son güncelleme: ${esc(COMPANIES.updated || '')}</div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.close').focus();
}
