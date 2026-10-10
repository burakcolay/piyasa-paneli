import { shell, fail, esc, map, ICON, MARKETS, marketById, prefs, loadDaily, loadLive, setLivePill, refreshAlertDot, lazyTV, toast } from '../core.js';
import { eventMarkets, scenario } from '../markets.js';

const app = shell('takvim', { title: 'Takvim' });
const MON = { oca: 0, şub: 1, sub: 1, mar: 2, nis: 3, may: 4, haz: 5, tem: 6, ağu: 7, agu: 7, eyl: 8, eki: 9, kas: 10, ara: 11 };
const IMP = { high: ['var(--down)', 'Yüksek etki'], mid: ['var(--warn)', 'Orta etki'], low: ['var(--ink-3)', 'Düşük etki'], session: ['var(--accent)', 'Seans'] };
let onlyMine = true, onlyHigh = false;

// "13 Eki 09:00", "Sal 13 · 09:00", "Cum 9 · 17:00" → Date (TSİ)
function parseWhen(s, year) {
  const t = String(s).toLocaleLowerCase('tr-TR');
  const tm = t.match(/(\d{1,2}):(\d{2})/);
  let d = t.match(/(\d{1,2})\s+([a-zçğıöşü]{3})/);
  let day, mon;
  if (d && MON[d[2]] != null) { day = +d[1]; mon = MON[d[2]]; }
  else { const m2 = t.match(/[a-zçğıöşü]{3}\s+(\d{1,2})/); if (!m2) return null; day = +m2[1]; mon = null; }
  return { day, mon, h: tm ? +tm[1] : null, m: tm ? +tm[2] : 0, year };
}
function toDate(p, base) {
  if (!p) return null;
  const mon = p.mon ?? base.getMonth();
  let y = p.year; if (p.mon == null && p.day < base.getDate() - 7) return new Date(Date.UTC(y, mon + 1, p.day, (p.h ?? 12) - 3, p.m));
  return new Date(Date.UTC(y, mon, p.day, (p.h ?? 12) - 3, p.m));
}
function ics(ev) {
  const dt = ev.date; if (!dt) return;
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(dt.getTime() + 30 * 60e3);
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Piyasa Paneli Pro//TR', 'BEGIN:VEVENT', `UID:${f(dt)}-${Math.random().toString(36).slice(2)}@piyasa-paneli`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(dt)}`, `DTEND:${f(end)}`, `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`, `DESCRIPTION:${(ev.detail || '').replace(/[,;\n]/g, ' ')}`, 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Piyasa verisi', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'piyasa-takvim.ics'; a.click();
  toast('Takvim dosyası indirildi; açınca telefon ya da bilgisayar takvimine eklenir');
}

async function main() {
  const [{ day: D }, L] = await Promise.all([loadDaily(), loadLive()]);
  setLivePill(L); refreshAlertDot({ live: L });
  const base = new Date(D.date + 'T12:00:00+03:00'), year = base.getFullYear();
  const P = prefs(); const mine = P.markets.length ? P.markets : MARKETS.map((m) => m.id);

  const evs = [];
  const seen = new Set();
  const push = (e) => { const k = e.title.replace(/\s*\(.*?\)/g, '').toLocaleLowerCase('tr-TR').replace(/türkiye|abd|euro bölgesi|almanya|fed|[^a-zçğıöşü0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24) + (e.date ? e.date.toISOString().slice(0, 10) : ''); if (seen.has(k)) return; seen.add(k); e.markets = eventMarkets(e.title, e.country); e.sc = scenario(`${e.country || ''} ${e.title}`); evs.push(e); };
  (D.s6?.today || []).forEach((e) => { const [h, m] = e.time.split(':').map(Number); push({ title: e.title, detail: e.detail, impact: e.impact, date: new Date(Date.UTC(year, base.getMonth(), base.getDate(), h - 3, m)), today: true }); });
  (D.makro?.upcoming || []).forEach((e) => push({ title: e.name, country: e.country, detail: `Beklenti ${e.cons} · önceki ${e.prev}`, impact: e.impact, date: toDate(parseWhen(e.when, year), base), whenLabel: e.when }));
  (D.s6?.week || []).forEach((e) => push({ title: e.title, detail: e.expect, impact: /fed|tüfe|tcmb|istihdam|bilanço|pce|gsyh/i.test(e.title) ? 'high' : 'mid', date: toDate(parseWhen(e.when, year), base), whenLabel: e.when }));
  (D.faizler?.speakers || []).forEach((s) => push({ title: `Fed: ${s.who}`, detail: 'Konuşma', impact: 'low', date: toDate(parseWhen(s.when, year), base), whenLabel: s.when }));
  evs.sort((a, b) => (a.date?.getTime() || 9e15) - (b.date?.getTime() || 9e15));

  const now = new Date();
  const next = evs.find((e) => e.date && e.date > now && e.impact === 'high');
  const fmtWhen = (e) => e.date ? `${e.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Europe/Istanbul' })} ${e.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}` : esc(e.whenLabel || '');

  const render = () => {
    const list = evs.filter((e) => (!onlyMine || e.markets.some((m) => mine.includes(m))) && (!onlyHigh || e.impact === 'high'));
    const groups = {};
    list.forEach((e) => { const k = e.date ? e.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'Europe/Istanbul' }) : 'Tarihi belirsiz'; (groups[k] ||= []).push(e); });
    document.getElementById('cal').innerHTML = Object.keys(groups).length ? map(Object.entries(groups), ([g, es]) => `<div class="day-h">${esc(g)}</div>${map(es, (e) => {
      const idx = evs.indexOf(e), past = e.date && e.date < now;
      return `<div class="cal-row" style="${past ? 'opacity:.55' : ''}">
        <span class="when"><span class="imp" style="background:${IMP[e.impact]?.[0] || 'var(--ink-3)'}" title="${IMP[e.impact]?.[1] || ''}"></span>${e.date ? e.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '—'}</span>
        <div><b style="font-weight:500">${esc(e.country ? `${e.country} · ${e.title}` : e.title)}</b>
          <div class="xs muted">${esc(e.detail || '')}${e.markets.length ? ` · ${e.markets.map((m) => marketById(m).short).join(', ')}` : ''}</div>
          ${e.sc && e.impact !== 'session' ? `<div class="scen"><div><b class="up">${esc(e.sc.aT)}</b>${esc(e.sc.a)}</div><div><b class="down">${esc(e.sc.bT)}</b>${esc(e.sc.b)}</div></div>` : ''}</div>
        <div class="nums">${e.date && !past && e.impact !== 'session' ? `<button class="watch" data-ics="${idx}" title="Takvimime ekle" aria-label="Takvimime ekle">${ICON.cal}</button>` : ''}</div>
      </div>`; })}`) : '<div class="empty-state"><b>Bu filtrede olay yok</b><p>"Tüm piyasalar" ya da "Tüm etkiler"i seçebilirsin.</p></div>';
  };

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Takvim</h1><p>Piyasayı oynatacak veriler, bilançolar ve konuşmalar. Her önemli verinin altında beklentiden sapınca genelde ne olduğu yazıyor.</p></div></div>
    <div class="grid">
      <section class="panel glass c4"><div class="panel-h"><h2>Sıradaki yüksek etkili veri</h2></div>
        ${next ? `<b style="font-size:16px">${esc(next.country ? `${next.country} · ${next.title}` : next.title)}</b><div class="countdown" id="cd"></div><div class="small muted">${fmtWhen(next)} TSİ · ${esc(next.detail || '')}</div>` : '<p class="small muted">Takvimde yaklaşan yüksek etkili veri yok.</p>'}</section>
      <section class="panel glass c8"><div class="panel-h"><h2>Nasıl okunur</h2></div>
        <p class="small ink2">Piyasa veriye değil, verinin <b>beklentiden ne kadar saptığına</b> tepki verir. Beklenti zaten fiyatlıdır; sürpriz fiyatı hareket ettirir. Kırmızı nokta yüksek etkili verileri gösterir: bu saatlerde oynaklık ilk dakikalarda patlar, fiyat sağa sola savrulabilir.</p>
        <div class="legend">${map(Object.values(IMP), ([c, l]) => `<span><i style="background:${c};border-radius:50%"></i>${l}</span>`)}</div></section>
    </div>
    <section class="panel glass">
      <div class="panel-h"><h2>Önümüzdeki günler</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><div class="seg"><button data-f="mine" class="on">Piyasalarım</button><button data-f="all">Tüm piyasalar</button></div><div class="seg"><button data-i="all" class="on">Tüm etkiler</button><button data-i="high">Yüksek etkili</button></div></div></div>
      <div id="cal"></div>
    </section>
    ${D.makro?.surprises?.length ? `<section class="panel glass"><div class="panel-h"><h2>Son açıklananlar</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Veri</th><th class="n">Açıklanan</th><th class="n">Beklenti</th><th class="n">Önceki</th><th>Sonuç</th></tr></thead><tbody>${map(D.makro.surprises, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b><span class="nm">${esc(r.meta)}</span></td><td class="n"><b>${esc(r.actual)}</b></td><td class="n">${esc(r.cons)}</td><td class="n muted">${esc(r.prev)}</td><td><span class="chip ${r.tone === 'good' ? 'good' : r.tone === 'bad' ? 'bad' : ''}">${esc(r.verdict)}</span></td></tr>`)}</tbody></table></div></section>` : ''}
    <section class="panel glass"><div class="panel-h"><h2>Küresel ekonomik takvim</h2><span class="small muted">TradingView, canlı</span></div><div id="tv-cal"></div></section>
    <p class="foot-note">Senaryolar genel piyasa mekanizmasını anlatır, kesin sonuç ya da yatırım tavsiyesi değildir. Saatler TSİ.</p>
  </div>`;
  render();
  lazyTV(document.getElementById('tv-cal'), 'events', { importanceFilter: '0,1', countryFilter: 'us,eu,tr,de,gb,jp,cn' }, 560);
  app.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]'); if (f) { onlyMine = f.dataset.f === 'mine'; app.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b === f)); render(); }
    const i = e.target.closest('[data-i]'); if (i) { onlyHigh = i.dataset.i === 'high'; app.querySelectorAll('[data-i]').forEach((b) => b.classList.toggle('on', b === i)); render(); }
    const c = e.target.closest('[data-ics]'); if (c) ics(evs[+c.dataset.ics]);
  });
  if (next) {
    const tick = () => { const ms = next.date - new Date(); const el = document.getElementById('cd'); if (!el) return; if (ms <= 0) { el.textContent = 'Açıklandı'; return; } const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60; el.textContent = `${d ? d + ' g ' : ''}${h} sa ${m} dk`; };
    tick(); setInterval(tick, 30000);
  }
}

main().catch(fail);
