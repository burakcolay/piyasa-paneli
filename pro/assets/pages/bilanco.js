import { shell, fail, esc, map, num, pct, tone, loadDaily, loadLive, setLivePill, refreshAlertDot, withTerms, watchBtn, toast, ICON } from '../core.js';

const app = shell('bilanco', { title: 'Bilançolar' });
const getJSON = (u) => fetch(u, { cache: 'no-cache' }).then((r) => r.json());

function icsFor(e) {
  const d = new Date(`${e.date}T${e.time === 'before' ? '15:00' : '23:05'}:00+03:00`);
  const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Piyasa Paneli Pro//TR', 'BEGIN:VEVENT', `UID:${e.ticker}-${e.date}@piyasa-paneli`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(d)}`, `DTEND:${f(new Date(d.getTime() + 36e5))}`, `SUMMARY:${e.name} bilançosu`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Bilanço', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = `${e.ticker}-bilanco.ics`; a.click();
  toast(`${e.name} bilanço günü takvim dosyası indirildi`);
}

async function main() {
  const [{ day: D }, L, CO] = await Promise.all([loadDaily(), loadLive(), getJSON('../data/companies.json')]);
  setLivePill(L); refreshAlertDot({ live: L });
  const C = CO.companies || CO;
  const list = (D.nq?.earnings || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date(D.date + 'T00:00:00');
  const days = (d) => Math.round((new Date(d + 'T00:00:00') - today) / 864e5);
  const surprise = (a, e) => (a != null && e ? ((a - e) / Math.abs(e)) * 100 : null);

  const body = (e) => {
    const c = C[e.ticker]; if (!c) return '<p class="small muted">Şirket kartı yok.</p>';
    const px = L?.markets?.[e.ticker]?.price, an = c.analysts || {};
    const tot = (an.buy || 0) + (an.hold || 0) + (an.sell || 0);
    const up = px && an.target ? (an.target / px - 1) * 100 : null;
    const eS = surprise(c.last?.eps?.act, c.last?.eps?.est), rS = surprise(c.last?.rev?.act, c.last?.rev?.est);
    return `<div class="co-body">
      <div><h4>Ne iş yapıyor</h4><p>${esc(c.about)}</p></div>
      <div><h4>Nasdaq 100 için anlamı</h4><p>${esc(c.nq_note)}</p></div>
      <div><h4>Son bilanço · ${esc(c.last?.period || '')}</h4>
        <div class="kcards" style="margin-top:6px"><div class="kcard"><span class="l">Hisse başı kâr</span><span class="v" style="font-size:17px">${num(c.last?.eps?.act, 2)} $</span><span class="s ${tone(eS)}">beklenti ${num(c.last?.eps?.est, 2)} · ${pct(eS)}</span></div><div class="kcard"><span class="l">Gelir</span><span class="v" style="font-size:17px">${num(c.last?.rev?.act, 1)} mr $</span><span class="s ${tone(rS)}">beklenti ${num(c.last?.rev?.est, 1)} · ${pct(rS)}</span></div></div>
        <p style="margin-top:8px">${esc(c.last?.note || '')}</p></div>
      <div><h4>Gelir dağılımı · ${esc(c.segments?.period || '')}</h4>${map(c.segments?.items, (s) => `<div class="hbar" style="grid-template-columns:minmax(100px,150px) 1fr 50px"><span>${esc(s.name)}</span><div class="track"><span class="fill" style="left:0;width:${s.share}%;background:var(--accent)"></span></div><span class="val">%${num(s.share, 0)}</span></div>`)}</div>
      ${c.next?.known?.length ? `<div><h4>Bilançodan önce bilinenler</h4><ul>${map(c.next.known, (k) => `<li>${esc(k)}</li>`)}</ul></div>` : ''}
      ${c.next?.watch?.length ? `<div><h4>Bilançoda neye bakılacak</h4><ul>${map(c.next.watch, (k) => `<li>${esc(k)}</li>`)}</ul></div>` : ''}
      ${tot ? `<div><h4>Analistler</h4><div class="alloc" style="margin:6px 0"><span style="width:${an.buy / tot * 100}%;background:var(--up)"></span><span style="width:${an.hold / tot * 100}%;background:#9AA6B6"></span><span style="width:${an.sell / tot * 100}%;background:var(--down)"></span></div><div class="legend"><span><i style="background:var(--up)"></i>Al ${an.buy}</span><span><i style="background:#9AA6B6"></i>Tut ${an.hold}</span><span><i style="background:var(--down)"></i>Sat ${an.sell}</span></div>${an.target ? `<p style="margin-top:6px">Ortalama hedef ${num(an.target, 0)} $${px ? ` · şu an ${num(px, 2)} $ (${pct(up)})` : ''}. Analist görüşlerinin özetidir, tavsiye değildir.</p>` : ''}</div>` : ''}
      ${c.sources?.length ? `<div class="xs muted" style="grid-column:1/-1">Kaynaklar: ${c.sources.map((s) => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)).join(' · ')}</div>` : ''}
    </div>`;
  };

  const nextE = list.find((e) => days(e.date) >= 0);
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Bilançolar</h1><p>Nasdaq 100'ü en çok oynatan dev şirketlerin bilanço takvimi, son sonuçları ve sıradaki bilançoda neye bakılacağı.</p></div></div>
    ${nextE ? `<section class="hero glass"><span class="greet">Sıradaki büyük bilanço</span><h1>${esc(nextE.name)} · ${days(nextE.date) === 0 ? 'bugün' : `${days(nextE.date)} gün sonra`}</h1><p class="lede">${new Date(nextE.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}, ${nextE.time === 'before' ? 'ABD açılışından önce' : 'ABD kapanışından sonra (TSİ gece)'}. ${esc(C[nextE.ticker]?.nq_note || '')}</p><div class="hero-row"><button class="btn primary" data-ics="${nextE.ticker}">${ICON.cal}Takvimime ekle</button></div></section>` : ''}
    <section class="panel glass"><div class="panel-h"><h2>Takvim</h2><span class="small muted">Satıra bas, şirket kartı açılsın</span></div>
      ${map(list, (e) => { const n = days(e.date); const px = L?.markets?.[e.ticker]; return `<details class="co" ${e === nextE ? 'open' : ''}><summary>
        <span class="tk" style="font-size:16px">${esc(e.ticker)}</span>
        <span><b style="font-weight:500">${esc(e.name)}</b><span class="nm" style="display:block">${new Date(e.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })} · ${e.time === 'before' ? 'açılış öncesi' : 'kapanış sonrası'}${px ? ` · ${num(px.price, 2)} $ <span class="${tone(px.chg)}">${pct(px.chg, 2)}</span>` : ''}</span></span>
        <span class="chip ${n >= 0 && n <= 3 ? 'warn' : n < 0 ? '' : 'acc'}">${n < 0 ? 'açıklandı' : n === 0 ? 'bugün' : `${n} gün`}</span>
      </summary>${body(e)}<div style="padding:0 2px 14px;display:flex;gap:8px"><button class="btn" data-ics="${e.ticker}">${ICON.cal}Takvimime ekle</button></div></details>`; })}
    </section>
    ${D.s6?.earnings?.length ? `<section class="panel glass"><div class="panel-h"><h2>Bu hafta diğer bilançolar</h2></div><div class="rows">${map(D.s6.earnings, (e) => `<div class="row"><div class="main-c"><b>${esc(e.ticker)}</b></div><div class="end small">${esc(e.when)}</div></div>`)}</div></section>` : ''}
    <p class="foot-note">Kaynak: Bigdata.com şirket verileri, sabah rutini. Rakamlar milyar $, hisse başı kâr $. Yatırım tavsiyesi değildir.</p>
  </div>`;
  app.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ics]'); if (b) { ev.preventDefault(); icsFor(list.find((x) => x.ticker === b.dataset.ics)); } });
}

main().catch(fail);
