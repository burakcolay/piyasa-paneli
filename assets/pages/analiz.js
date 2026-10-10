import { shell, fail, esc, map, loadJSON, heatBg } from '../app.js';
import { n, pct, pctv, tone } from '../us.js';

const app = shell('analiz');
const REPO = 'https://github.com/burakcolay/Market-Intelligence';
const sgn = (v, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v), d)}`);

// Korelasyon rengi: −1 mavi, 0 beyaz, +1 kırmızı
function corrBg(v) {
  if (v == null) return '#F0F0EC';
  const a = Math.min(1, Math.abs(v));
  return v >= 0 ? `rgba(180,35,24,${0.08 + a * 0.75})` : `rgba(31,79,209,${0.08 + a * 0.75})`;
}

// Basit çizgi grafik: series [{name, color, pts:[[x,y]]}]
function lineSVG(series, { h = 240, zero = true, yfmt = (v) => n(v, 1), xlabels = null } = {}) {
  const all = series.flatMap((s) => s.pts.map((p) => p[1])).filter((v) => v != null);
  if (!all.length) return '';
  let lo = Math.min(...all), hi = Math.max(...all);
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
  const W = 1000, L = 46, R = 8, T = 8, B = 22;
  const len = Math.max(...series.map((s) => s.pts.length));
  const x = (i) => L + (i / Math.max(1, len - 1)) * (W - L - R);
  const y = (v) => T + ((hi - v) / (hi - lo)) * (h - T - B);
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const path = (s) => s.pts.map((p, i) => (p[1] == null ? '' : `${i && s.pts[i - 1][1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`)).join('');
  const xl = xlabels || [series[0].pts[0][0], series[0].pts[Math.floor(len / 2)]?.[0], series[0].pts[len - 1][0]];
  return `<svg viewBox="0 0 ${W} ${h}" style="width:100%;height:auto;display:block" role="img">
    ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-soft)"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10.5" fill="var(--muted)">${esc(yfmt(t))}</text>`).join('')}
    ${zero && lo < 0 && hi > 0 ? `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-width=".8"/>` : ''}
    ${series.map((s) => `<path d="${path(s)}" fill="none" stroke="${s.color}" stroke-width="1.8"/>`).join('')}
    ${xl.map((t, i) => `<text x="${[L, (L + W - R) / 2, W - R][i]}" y="${h - 4}" text-anchor="${['start', 'middle', 'end'][i]}" font-size="10.5" fill="var(--muted)">${esc(String(t ?? ''))}</text>`).join('')}
  </svg>
  <div class="legend-row">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

const pv = (p) => (p == null ? '—' : p < 0.001 ? '<0,001' : n(p, 3));
const verdict = (p) => (p == null ? '' : p < 0.05 ? '<span class="badge b-good">anlamlı</span>' : '<span class="badge b-flat">anlamlı değil</span>');

async function main() {
  const R = await loadJSON('data/analytics/summary.json').catch(() => null);
  if (!R) { app.innerHTML = '<div class="wrap"><section class="card"><p>Analiz verisi henüz üretilmedi. GitHub Actions ilk çalışmadan sonra burada görünecek.</p></section></div>'; return; }
  const g = R.regime, E = R.earnings_study || {}, I = R.insider_study || {};
  let corrWin = 'm63';
  const corrTable = () => `<div class="tbl-wrap"><table class="corr"><thead><tr><th></th>${map(R.corr.labels, (l) => `<th><span>${esc(l)}</span></th>`)}</tr></thead><tbody>
    ${map(R.corr.labels, (l, i) => `<tr><th>${esc(l)}</th>${map(R.corr[corrWin][i], (v, j) => `<td style="background:${corrBg(i === j ? null : v)}" title="${esc(l)} ↔ ${esc(R.corr.labels[j])}">${i === j ? '' : n(v, 2)}</td>`)}</tr>`)}
  </tbody></table></div>`;
  const PCOL = ['#1F4FD1', '#D97706', '#0B7A47', '#7C3AED'];
  const stocks = (R.risk || []).filter((x) => x.cls === 'hisse' && x.beta != null);
  const ddNow = (R.drawdowns || []).filter((x) => x.cls === 'hisse').sort((a, b) => a.current_drawdown - b.current_drawdown).slice(0, 8);
  const tr = R.trend || {};
  const trTot = Object.values(tr).reduce((s, v) => s + v, 0) || 1;
  const buckets = E.drift_by_bucket || {};
  const PATHC = { olumsuz: '#B42318', nötr: '#8A90A0', olumlu: '#0B7A47' };

  app.innerHTML = `<div class="wrap">
    <section class="card lead">
      <span class="eyebrow accent">Veri analizi · ${esc(R.updated)} kapanışı</span>
      <h1 class="page-h">Piyasa analizi</h1>
      <p class="muted">Python, Pandas, SQL ve istatistiksel testlerle her gün otomatik üretilir. Rakamlar 5 yıllık günlük fiyat ve SEC verisinden.</p>
      <div class="grid" style="--min:170px">
        <div class="kpi"><span class="l">Nasdaq 100 trendi</span><span class="v">${esc(g.trend)}</span><span class="s ${g.dist_ma200 > 0 ? 'up' : 'down'}">200 günlük ortalamanın ${sgn(g.dist_ma200)}% ${g.dist_ma200 > 0 ? 'üstünde' : 'altında'}</span></div>
        <div class="kpi"><span class="l">Oynaklık rejimi</span><span class="v">${esc(g.vol_level)}</span><span class="s flat">şimdi %${n(g.vol_now, 1)} · ortanca %${n(g.vol_median, 1)}</span></div>
        <div class="kpi"><span class="l">Trendi yukarı hisseler</span><span class="v">%${n(((tr['güçlü yükseliş'] || 0) + (tr['yükseliş'] || 0)) / trTot * 100, 0)}</span><span class="s flat">200 günlük ortalamanın üstünde</span></div>
        <div class="kpi"><span class="l">Olağandışı hareket</span><span class="v">${(R.anomalies || []).length}</span><span class="s flat">son 10 işlem günü</span></div>
      </div>
    </section>

    <section class="card yorum"><span class="eyebrow accent">Veriler ne söylüyor</span><ul>${map(R.narrative, (s) => `<li class="flat">${esc(s)}</li>`)}</ul></section>

    <div class="row2">
      <section class="card"><div class="head-row"><span class="eyebrow">Sektör dönüşümü</span><span class="xs muted">eşit ağırlıklı getiri %</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sektör</th><th class="r">1 hafta</th><th class="r">1 ay</th><th class="r">3 ay</th><th>Öncü / geride</th></tr></thead><tbody>
        ${map(R.sectors, (s) => `<tr><td>${esc(s.sector)} <small class="muted">${s.n}</small></td>${map(['r_1w', 'r_1m', 'r_3m'], (k) => `<td class="r num" style="background:${heatBg(s[k], 2)}">${sgn(s[k])}</td>`)}<td class="small"><a href="sirket.html?t=${esc(s.leader)}">${esc(s.leader)}</a> / <a href="sirket.html?t=${esc(s.laggard)}">${esc(s.laggard)}</a></td></tr>`)}
        </tbody></table></div>
        <p class="small muted">Kısa vadede öne geçen sektör uzun vadede de öndeyse dönüşüm kalıcıdır; yalnızca 1 haftada öndeyse çoğunlukla tepki alımıdır.</p></section>
      <section class="card"><div class="head-row"><span class="eyebrow">Varlıklar arası ilişki</span><div class="chips"><button class="chip on" data-cw="m63">3 ay</button><button class="chip" data-cw="m252">1 yıl</button></div></div>
        <div id="corr">${corrTable()}</div>
        <p class="small muted">Kırmızı birlikte, mavi ters yönde hareket. Çeşitlendirme ancak düşük ya da ters ilişkili varlıklarla işe yarar.</p></section>
    </div>

    <section class="card"><div class="head-row"><span class="eyebrow">İlişkiler zamanla nasıl değişiyor</span><span class="xs muted">63 günlük kayan korelasyon</span></div>
      ${lineSVG((R.pairs || []).map((p, i) => ({ name: `${p.label} (şimdi ${n(p.now, 2)}, 1 yıl önce ${p.year_ago == null ? '—' : n(p.year_ago, 2)})`, color: PCOL[i], pts: p.series })), { yfmt: (v) => n(v, 1) })}
      <p class="small muted">Korelasyon sabit değildir: kriz dönemlerinde çoğu riskli varlık aynı yöne gider. Bu yüzden geçmiş bir yılın ilişkisine dayanan çeşitlendirme, tam gerektiği anda zayıflayabilir.</p></section>

    <div class="row2">
      <section class="card"><span class="eyebrow">Risk haritası: en yüksek beta</span>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hisse</th><th class="r">Beta</th><th class="r">Yıllık oynaklık</th><th class="r">Oynaklık yüzdeliği</th></tr></thead><tbody>
        ${map(stocks.sort((a, b) => b.beta - a.beta).slice(0, 10), (x) => `<tr><td><a href="sirket.html?t=${esc(x.code)}"><b class="mono">${esc(x.code)}</b></a> <small class="muted">${esc(x.name || '')}</small></td><td class="r num">${n(x.beta, 2)}</td><td class="r num">%${n(x.vol_1y, 0)}</td><td class="r num">${n(x.vol_pctile, 0)}</td></tr>`)}
        </tbody></table></div>
        <p class="small muted">Beta 2: endeks %1 hareket ettiğinde hisse ortalama %2 hareket eder. Yüzdelik 100'e yakınsa hisse şu an son 5 yılının en oynak dönemindedir.</p></section>
      <section class="card"><span class="eyebrow">Zirvesinden en uzak hisseler</span>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hisse</th><th class="r">Şu an zirveden</th><th class="r">5 yılın en büyük düşüşü</th></tr></thead><tbody>
        ${map(ddNow, (x) => `<tr><td><a href="sirket.html?t=${esc(x.code)}"><b class="mono">${esc(x.code)}</b></a> <small class="muted">${esc(x.name || '')}</small></td><td class="r num down">${sgn(x.current_drawdown)}%</td><td class="r num">${sgn(x.max_drawdown)}% <small class="muted">${esc(x.trough_date)}</small></td></tr>`)}
        </tbody></table></div></section>
    </div>

    ${E.avg_path ? `<section class="card">
      <span class="eyebrow accent">Araştırma · olay çalışması</span>
      <h2 style="font-size:20px">Bilanço sonrası fiyat davranışı</h2>
      <p class="muted small">${E.n} bilanço açıklaması, ${E.companies} şirket (${esc(E.period[0])} – ${esc(E.period[1])}). Anormal getiri piyasa modeliyle: her olay için hissenin endekse duyarlılığı olaydan önceki dönemde tahmin edildi, olay günlerindeki fark ölçüldü.</p>
      ${lineSVG(Object.entries(E.avg_path).map(([k, v]) => ({ name: `İlk tepkisi ${k}`, color: PATHC[k] || '#1F4FD1', pts: v.map((y, i) => [E.path_days[i], y]) })), { xlabels: ['gün −5', 'gün ' + E.path_days[Math.floor(E.path_days.length / 2)], 'gün +40'], yfmt: (v) => n(v, 1) + '%' })}
      <div class="grid" style="--min:200px">
        <div class="kpi"><span class="l">Bilanço günü oynaklığı</span><span class="v">${n(E.react_ratio, 1)} kat</span><span class="s flat">sıradan 2 günlük döneme göre</span></div>
        <div class="kpi"><span class="l">Olumlu − olumsuz sürüklenme</span><span class="v">${sgn(E.drift_spread.diff, 2)} puan</span><span class="s flat">gün 2–40 · p ${pv(E.drift_spread.p)} ${verdict(E.drift_spread.p)}</span></div>
        <div class="kpi"><span class="l">Tepki ↔ sonrası (Spearman)</span><span class="v">${n(E.spearman.rho, 3)}</span><span class="s flat">p ${pv(E.spearman.p)} ${verdict(E.spearman.p)}</span></div>
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>İlk tepki grubu</th><th class="r">Olay</th><th class="r">Sonraki 2 ay ort. %</th><th class="r">%95 güven aralığı</th><th class="r">p</th></tr></thead><tbody>
      ${map(Object.entries(buckets), ([k, v]) => `<tr><td>${esc(k)}</td><td class="r num">${v.n}</td><td class="r num ${tone(v.mean)}">${sgn(v.mean, 2)}</td><td class="r num">${v.ci95 ? `${sgn(v.ci95[0], 2)} / ${sgn(v.ci95[1], 2)}` : '—'}</td><td class="r num">${pv(v.p)}</td></tr>`)}
      </tbody></table></div>
    </section>` : ''}

    ${I.alim ? `<section class="card"><span class="eyebrow accent">Araştırma · olay çalışması</span><h2 style="font-size:20px">Yöneticiler alınca hisse ne yapıyor?</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Olay</th><th>Pencere</th><th class="r">Olay</th><th class="r">Ort. anormal getiri %</th><th class="r">Pozitif oran</th><th class="r">p</th><th></th></tr></thead><tbody>
      ${map([['alim', 'Piyasadan alım'], ['plansiz_satis', 'Plansız satış']], ([k, l]) => map([['car20', '1–20 gün'], ['car40', '1–40 gün']], ([w, wl]) => { const v = I[k]?.[w] || {}; return `<tr><td>${l}</td><td>${wl}</td><td class="r num">${v.n ?? 0}</td><td class="r num ${tone(v.mean)}">${sgn(v.mean, 2)}</td><td class="r num">${v.hit == null ? '—' : '%' + n(v.hit, 0)}</td><td class="r num">${pv(v.p)}</td><td>${verdict(v.p)}</td></tr>`; }))}
      </tbody></table></div>
      <p class="small muted">Nasdaq 100'de yönetici alımı nadirdir; örnek küçük olduğu için sonuç tek başına sinyal değildir. Satışların çoğu önceden planlandığından yalnızca plansız satışlar ayrıca incelendi.</p></section>` : ''}

    ${R.anomalies?.length ? `<section class="card"><div class="head-row"><span class="eyebrow">Olağandışı günler</span><span class="xs muted">getirisi ya da hacmi önceki 63 günün normalinden en az 3 standart sapma uzak</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarih</th><th>Varlık</th><th class="r">Getiri</th><th class="r">Getiri z</th><th class="r">Hacim z</th></tr></thead><tbody>
      ${map(R.anomalies.slice().sort((a, b) => b.date.localeCompare(a.date)), (a) => `<tr><td class="num">${esc(a.date)}</td><td><b class="mono">${esc(a.code)}</b> <small class="muted">${esc(a.name || '')}</small></td><td class="r num ${tone(a.ret)}">${sgn(a.ret, 2)}</td><td class="r num">${a.z_ret == null ? '—' : sgn(a.z_ret, 1)}</td><td class="r num">${a.z_vol == null ? '—' : sgn(a.z_vol, 1)}</td></tr>`)}
      </tbody></table></div></section>` : ''}

    <section class="card"><span class="eyebrow">Yöntem ve kaynak kod</span>
      <div class="facts">
        <div><b>Veri hattı</b><span>Yahoo Finance (yedek Stooq) ve SEC EDGAR → Pandas ile temizlik → SQLite veritabanı → istatistik → JSON ve haftalık rapor. GitHub Actions ile her gün otomatik.</span></div>
        <div><b>Kaynak kod</b><span><a href="${REPO}/tree/main/analytics" target="_blank" rel="noopener">analytics/</a> · <a href="${REPO}/tree/main/analytics/sql" target="_blank" rel="noopener">SQL sorguları</a> · <a href="${REPO}/tree/main/analytics/notebooks" target="_blank" rel="noopener">Jupyter defterleri</a> · <a href="${REPO}/tree/main/reports" target="_blank" rel="noopener">Haftalık raporlar</a></span></div>
        <div><b>Sınırlamalar</b><span>Evren bugünkü Nasdaq 100 (hayatta kalma yanlılığı); ücretsiz fiyat kaynağı; olay saatleri gün bazında.</span></div>
      </div></section>
    <p class="source">Bilgi amaçlıdır, yatırım tavsiyesi değildir.</p>
  </div>`;
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cw]'); if (!b) return;
    corrWin = b.dataset.cw;
    app.querySelectorAll('[data-cw]').forEach((x) => x.classList.toggle('on', x === b));
    document.getElementById('corr').innerHTML = corrTable();
  });
}
main().catch(fail);
