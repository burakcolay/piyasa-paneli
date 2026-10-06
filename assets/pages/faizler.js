import { shell, loadDay, fail, esc, map, kpi, num } from '../app.js';
import { yieldCurve } from '../charts.js';

async function main() {
  const ctx = await loadDay();
  const F = ctx.data.faizler;
  const app = shell('faizler', { ...ctx, updated: `Veriler ${ctx.data.updated}` });

  const tenors = map(F.curve, (c) => {
    const bp = Math.round((c.now - c.m1) * 100);
    return `<div class="kv"><span class="muted" style="width:44px">${esc(c.tenor)}</span><span style="font-weight:500">%${num(c.now, 2)}</span>
      <span style="width:76px;text-align:right" class="${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}">${bp > 0 ? '+' : ''}${bp} bp</span></div>`;
  });

  app.innerHTML = `<main class="wrap">
    <div class="grid" style="--min:200px;gap:12px">${map(F.kpis, (k) => kpi(k, 'big'))}</div>

    <div class="row">
      <section class="card" style="flex:3 1 560px">
        <div class="head-row"><span class="eyebrow">ABD verim eğrisi</span>
          <div class="legend"><span><span style="width:18px;height:3px;background:#1F4FD1;border-radius:2px"></span>Bugün</span><span><span style="width:18px;border-top:2px dashed #8A90A0"></span>1 ay önce</span></div>
        </div>
        ${yieldCurve(F.curve)}
        <p class="note"><strong>Grafik ne söylüyor:</strong> ${esc(F.curve_note)}</p>
      </section>
      <aside class="card" style="flex:1 1 280px">
        <span class="eyebrow">Vadeler</span>
        ${tenors}
        <span class="xs muted">Sağ sütun: 1 aylık değişim, baz puan</span>
      </aside>
    </div>

    <div class="row">
      <section class="card" style="flex:1 1 380px">
        <span class="eyebrow">Fed cephesi</span>
        <div><div class="small muted">Politika faizi</div><div class="mono" style="font-size:22px;font-weight:500">${esc(F.fed.rate)}</div><div class="small down">${esc(F.fed.rate_note)}</div></div>
        <div><div class="small muted">Sonraki toplantı</div><div style="font-size:16px;font-weight:500">${esc(F.fed.next_meeting)}</div></div>
        <div><div class="small muted">Piyasanın fiyatladığı</div><div>${esc(F.fed.pricing)}</div></div>
        <p class="small" style="color:var(--ink-2)">${esc(F.fed.paragraph)}</p>
      </section>
      <section class="card" style="flex:1 1 380px">
        <span class="eyebrow">Fed konuşmacıları · bu hafta ve sonrası</span>
        ${map(F.speakers, (s) => `<div class="list-row"><span class="k" style="width:96px;font-size:13px;font-weight:400">${esc(s.when)}</span><b>${esc(s.who)}</b></div>`)}
      </section>
    </div>
    <p class="source">Kaynak: Bigdata.com (faiz verisi FMP, takvim FXStreet). 1 ay önceki eğri, aylık değişimden hesaplanmıştır.</p>
  </main>`;
}

main().catch(fail);
