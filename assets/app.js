// Ortak yardımcılar: veri yükleme, başlık/menü, biçimlendirme.

export const PAGES = [
  { key: 'index', href: 'index.html', label: 'Ana Sayfa' },
  { key: 'faizler', href: 'faizler.html', label: 'Faizler & Fed' },
  { key: 'kuresel', href: 'kuresel.html', label: 'Küresel' },
  { key: 'kripto', href: 'kripto.html', label: 'Kripto' },
  { key: 'turkiye', href: 'turkiye.html', label: 'Türkiye' },
  { key: 'makro', href: 'makro.html', label: 'Makro Veriler' },
  { key: 'haftalik', href: 'haftalik.html', label: 'Haftalık Özet' },
  { key: 'sozluk', href: 'sozluk.html', label: 'Sözlük' },
];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const map = (arr, fn) => (arr || []).map(fn).join('');

export function dateTR(iso, withDay = true) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${d} ${MONTHS[m - 1]} ${y}` + (withDay ? `, ${DAYS[dt.getUTCDay()]}` : '');
}

// Sayı biçimleri (Türkçe: virgül ondalık, nokta binlik)
export function num(v, dec = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
export function signed(v, dec = 2, suffix = '%') {
  if (v === null || v === undefined) return '–';
  const s = num(Math.abs(v), dec);
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s + suffix;
}

export const toneClass = (t) => ({ up: 'up', down: 'down', good: 'up', bad: 'down' }[t] || 'flat');
export const signTone = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');

// Isı rengi (performans tabloları)
export function heatBg(v, scale = 1) {
  if (v === null || v === undefined) return '#F0F0EC';
  const x = v / scale;
  if (x >= 3) return '#9FD8B8';
  if (x >= 1) return '#C8EBD6';
  if (x > 0.05) return '#E6F5EC';
  if (x <= -3) return '#E89A8E';
  if (x <= -1) return '#F1C1B9';
  if (x < -0.05) return '#F8E1DD';
  return '#F0F0EC';
}

// --- veri yükleme ---
async function getJSON(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path} yüklenemedi (${r.status})`);
  return r.json();
}

export function selectedDate() {
  const d = new URLSearchParams(location.search).get('d');
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export async function loadDay() {
  const [latest, dates] = await Promise.all([getJSON('data/latest.json'), getJSON('data/daily/index.json').catch(() => [])]);
  const date = selectedDate() || latest.date;
  const data = await getJSON(`data/daily/${date}.json`);
  return { date, latest, dates, data, isOld: date !== latest.date };
}

export const loadJSON = getJSON;

// --- iskelet ---
function withDate(href) {
  const d = selectedDate();
  return d ? `${href}?d=${d}` : href;
}

export function shell(active, { date, dates = [], updated, isOld, latest } = {}) {
  const nav = map(PAGES, (p) => `<a href="${withDate(p.href)}" class="${p.key === active ? 'active' : ''}">${esc(p.label)}</a>`);
  const options = [...dates].sort().reverse().map((d) => `<option value="${d}" ${d === date ? 'selected' : ''}>${esc(dateTR(d, false))}</option>`).join('');
  const dateBox = date
    ? `<label class="date-box"><span>${esc(dateTR(date))}${updated ? ' · ' + esc(updated) : ''}</span>${dates.length > 1 ? `<select aria-label="Gün seç" id="day-pick">${options}</select>` : ''}</label>`
    : '';
  document.body.innerHTML = `
    <header class="site-header">
      <div class="inner">
        <div class="brand-row">
          <a href="${withDate('index.html')}" class="brand" style="text-decoration:none;color:inherit"><b>Piyasa Paneli</b><span>Günlük küresel piyasa takibi</span></a>
          ${dateBox}
        </div>
        <nav class="nav" aria-label="Bölümler">${nav}</nav>
      </div>
      ${isOld && latest ? `<div class="old-banner">Arşivdeki bir günü görüyorsun. <a href="${location.pathname.split('/').pop() || 'index.html'}">Bugüne dön →</a></div>` : ''}
    </header>
    <div id="app"></div>`;
  const pick = document.getElementById('day-pick');
  if (pick) pick.addEventListener('change', () => {
    const u = new URL(location.href);
    if (pick.value === latest?.date) u.searchParams.delete('d'); else u.searchParams.set('d', pick.value);
    location.href = u.toString();
  });
  return document.getElementById('app');
}

export function fail(err) {
  console.error(err);
  const el = document.getElementById('app') || document.body;
  el.innerHTML = `<div class="error">Veri yüklenemedi: ${esc(err.message)}</div>`;
}

// Ortak bileşenler
export function kpi(k, cls = '') {
  return `<div class="kpi ${cls}">
    ${k.code ? `<div class="head-row"><span class="code">${esc(k.code)}</span><span class="l">${esc(k.label)}</span></div>` : `<span class="l">${esc(k.label)}</span>`}
    <span class="v">${esc(k.value)}</span>
    ${k.sub ? `<span class="s ${toneClass(k.tone)}">${esc(k.sub)}</span>` : ''}
  </div>`;
}

export function paras(list, cls = '') {
  return map(list, (p) => `<p class="${cls}">${esc(p)}</p>`);
}

export function lessonBox(l, eyebrow) {
  if (!l) return '';
  return `<section class="card lesson">
    <span class="eyebrow dark">${esc(eyebrow)}: ${esc(l.title)}</span>
    ${paras(l.paragraphs)}
    ${l.rule ? `<p class="rule"><strong>Altın kural:</strong> ${esc(l.rule)}</p>` : ''}
  </section>`;
}

// TradingView gömülü grafik (canlı). Yüklenemezse yerine not gösterilir.
export function tvMini(el, symbol, { range = '3M', height = 220 } = {}) {
  el.innerHTML = '';
  el.style.minHeight = height + 'px';
  const box = document.createElement('div');
  box.className = 'tradingview-widget-container';
  const inner = document.createElement('div');
  inner.className = 'tradingview-widget-container__widget';
  box.appendChild(inner);
  const s = document.createElement('script');
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
  s.async = true;
  s.textContent = JSON.stringify({ symbol, width: '100%', height, locale: 'tr', dateRange: range, colorTheme: 'light', isTransparent: true, autosize: false, largeChartUrl: '' });
  s.onerror = () => { el.innerHTML = '<div class="tv-fallback">Canlı grafik yüklenemedi.</div>'; };
  box.appendChild(s);
  el.appendChild(box);
}
