import { shell, loadDay, fail, esc, map, kpi, paras, lessonBox, num, signed, tvMini } from '../app.js';
import { gauge, fngLabel, levelMap, flowBars } from '../charts.js';

const coinBg = (v) => v >= 20 ? '#7FCB9F' : v >= 5 ? '#B8E3C9' : v > 0.05 ? '#E6F5EC' : v <= -40 ? '#DB7A6C' : v <= -15 ? '#ECA89D' : v <= -3 ? '#F4CBC4' : v < -0.05 ? '#F8E1DD' : '#F0F0EC';
const TAG = { bad: 'b-bad', good: 'b-good', flat: 'b-mid' };

async function main() {
  const ctx = await loadDay();
  const K = ctx.data.kripto;
  const app = shell('kripto', { ...ctx, updated: `Veriler ${ctx.data.updated}` });
  const [fLabel, fColor] = fngLabel(K.fng.now);
  const d = K.dominance, other = Math.max(0, 100 - d.btc - d.usdt);

  app.innerHTML = `<main class="wrap">
    <div class="row" style="align-items:stretch">
      <div class="grid" style="flex:3 1 600px;--min:190px;gap:12px">${map(K.kpis, (k) => kpi(k, 'big'))}</div>
      <section class="card" style="flex:1 1 280px;align-items:center;gap:4px">
        <span class="eyebrow" style="align-self:flex-start">Korku &amp; Açgözlülük endeksi</span>
        ${gauge(K.fng.now)}
        <span style="font-size:18px;font-weight:700;color:${fColor}">${esc(fLabel)}</span>
        <div class="small muted" style="display:flex;gap:16px">
          <span>Dün <strong class="mono" style="color:var(--ink)">${esc(K.fng.yesterday)}</strong></span>
          <span>Geçen hafta <strong class="mono" style="color:var(--ink)">${esc(K.fng.week)}</strong></span>
        </div>
        <span class="xs muted" style="text-align:center">0–24 aşırı korku · 25–44 korku · 45–55 nötr · 56–75 açgözlülük · 76–100 aşırı açgözlülük</span>
      </section>
    </div>

    <section class="card lead">
      <span class="eyebrow accent">Claude'un kripto okuması</span>
      <h1 style="font-size:26px">${esc(K.reading.headline)}</h1>
      ${paras(K.reading.paragraphs)}
    </section>

    <section class="card">
      <span class="eyebrow">Piyasa değeri ve dominans</span>
      <div class="head-row small muted"><span>TOTAL · toplam kripto piyasa değeri</span><span class="mono" style="color:var(--ink)">${esc(d.total_label)}</span></div>
      <div class="stack" role="img" aria-label="Bitcoin yüzde ${num(d.btc, 1)}, USDT yüzde ${num(d.usdt, 1)}, diğer yüzde ${num(other, 1)}.">
        <div style="width:${d.btc}%;background:#163A9C;color:#fff">BTC %${num(d.btc, 0)}</div>
        <div style="width:${d.usdt}%;background:#8A90A0;padding:0"></div>
        <div style="flex:1;background:#9DB3EE">Diğer %${num(other, 1)}</div>
      </div>
      <div class="legend xs muted">
        <span><span class="swatch" style="background:#163A9C"></span>Bitcoin (BTC.D)</span>
        <span><span class="swatch" style="background:#8A90A0"></span>Tether USDT (USDT.D)</span>
        <span><span class="swatch" style="background:#9DB3EE"></span>Ethereum ve diğerleri</span>
        <span style="margin-left:auto">TOTAL2 = TOTAL − Bitcoin ${esc(d.total2_label)}</span>
      </div>
      <div class="grid" style="--min:230px;gap:12px">${map(K.dom_cards, (c) => `<div class="kpi soft" style="padding:14px"><span class="code">${esc(c.code)}</span><span class="small" style="color:var(--ink-2)">${esc(c.text)}</span></div>`)}</div>
    </section>

    <section class="card">
      <span class="eyebrow">Canlı grafikler · TradingView</span>
      <div class="grid" style="--min:260px">
        ${['CRYPTOCAP:TOTAL', 'CRYPTOCAP:TOTAL2', 'CRYPTOCAP:BTC.D', 'CRYPTOCAP:USDT.D'].map((s, i) => `<div class="tv" id="tv-${i}" data-s="${s}"></div>`).join('')}
      </div>
    </section>

    <div class="row">
      <section class="card" style="flex:3 1 540px">
        <span class="eyebrow">Bitcoin seviye haritası</span>
        <div class="tbl-wrap"><div style="min-width:560px">${levelMap(K.levels)}</div></div>
        <p class="small" style="color:var(--ink-2)"><strong>Nasıl okunur:</strong> ${esc(K.levels.note)}</p>
      </section>
      <section class="card" style="flex:2 1 340px">
        <span class="eyebrow">Spot Bitcoin ETF akışları</span>
        ${flowBars(K.etf)}
        <p class="small" style="color:var(--ink-2)">${esc(K.etf_note)}</p>
      </section>
    </div>

    <section class="card">
      <div class="head-row"><span class="eyebrow">Büyük coinler · performans</span><span class="small muted">Yeşil yükseliş, kırmızı düşüş</span></div>
      <div class="tbl-wrap"><table class="heatmap" style="min-width:680px">
        <thead><tr><th style="text-align:left">Coin</th><th style="text-align:right">Fiyat ($)</th><th>1 gün</th><th>1 hafta</th><th>1 ay</th><th>3 ay</th><th>Yılbaşından</th><th>1 yıl</th></tr></thead>
        <tbody>${map(K.coins, (c) => `<tr><td><span class="mono" style="font-weight:600">${esc(c.sym)}</span> <span class="muted small">${esc(c.name)}</span></td>
          <td class="mono small" style="text-align:right">${esc(c.price)}</td>
          ${['d1', 'w1', 'm1', 'm3', 'ytd', 'y1'].map((k) => `<td class="c" style="background:${coinBg(c[k])}">${esc(signed(c[k], 1, ''))}</td>`).join('')}</tr>`)}</tbody>
      </table></div>
      <p class="note"><strong>Tablo ne söylüyor:</strong> ${esc(K.coins_note)}</p>
    </section>

    <div class="row">
      <section class="card" style="flex:1 1 360px;gap:6px">
        <span class="eyebrow">Kurumsal tarafta</span>
        ${map(K.institutional, (i) => `<div class="list-row"><span class="k">${esc(i.v)}</span><div><b>${esc(i.title)}</b><small>${esc(i.note)}</small></div></div>`)}
      </section>
      <section class="card" style="flex:1 1 360px;gap:6px">
        <span class="eyebrow">Kripto şu an neye tepki veriyor</span>
        ${map(K.drivers, (d) => `<div class="list-row"><span class="badge ${TAG[d.tone] || 'b-flat'}">${esc(d.tag)}</span><div><b>${esc(d.title)}</b><small>${esc(d.note)}</small></div></div>`)}
      </section>
    </div>

    ${lessonBox(K.lesson, 'Kripto dersi')}
    <p class="source">Kaynak: Bigdata.com (fiyatlar FMP, haberler). TOTAL2 ve USDT.D, toplam piyasa değeri ile BTC ve USDT piyasa değerlerinden hesaplanır. Yatırım tavsiyesi değildir.</p>
  </main>`;

  document.querySelectorAll('.tv[data-s]').forEach((el) => tvMini(el, el.dataset.s, { range: '3M', height: 200 }));
}

main().catch(fail);
