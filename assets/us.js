// ABD hisseleri: ortak biçimlendirme ve küçük grafik.
import { esc } from './app.js';

const nf = (d) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const n = (v, d = 0) => (v == null || !isFinite(v) ? '—' : nf(d).format(v).replace('-', '−'));
export const pct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}%${nf(d).format(Math.abs(v))}`);
export const pctv = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `%${n(v, d)}`);
export const tone = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
// Dolar tutarı: $3,2 T · $412 Mr · $18 Mn
export function usd(v, d) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  const [k, u] = a >= 1e12 ? [1e12, ' T'] : a >= 1e9 ? [1e9, ' Mr'] : a >= 1e6 ? [1e6, ' Mn'] : a >= 1e3 ? [1e3, ' B'] : [1, ''];
  const x = a / k; return `${s}$${nf(d ?? (x >= 100 ? 0 : x >= 10 ? 1 : 2)).format(x)}${u}`;
}
export const loadUS = (p) => fetch(`data/us/${p}`, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`data/us/${p}: ${r.status}`); return r.json(); });

// Terim açıklaması: üzerine gelince / dokununca görünür
export const TERMS = {
  fk: 'F/K: hisse fiyatının son 12 aylık hisse başı kâra oranı. Yüksekse piyasa hızlı büyüme bekliyor.',
  fs: 'F/S: piyasa değerinin son 12 aylık gelire oranı. Kârı düşük ya da dalgalı şirketleri kıyaslamak için.',
  fcfy: 'Serbest nakit verimi: faaliyet nakdinden yatırım harcaması düşülünce kalan paranın piyasa değerine oranı.',
  marj: 'Net marj: her 100 dolarlık satıştan kalan net kâr.',
  ttm: 'Son 12 ay: son dört çeyreğin toplamı.',
  f13: '13F: 100 milyon dolar üstü portföy yöneten kurumların her çeyrek SEC\'e verdiği pozisyon listesi. Çeyrek sonundan 45 gün sonra gelir, açığa satışlar görünmez.',
  form4: 'Form 4: yöneticilerin kendi şirket hisselerinde yaptığı alım satım. Alımlar daha anlamlıdır; satışların çoğu vergi ya da önceden planlıdır.',
  plan: '10b5-1 planı: aylar önce kurulan otomatik satış programı; o günkü bir görüşü yansıtmaz.',
  k8: '8-K: önemli olayların (bilanço, satın alma, yönetici değişikliği) 4 iş günü içinde SEC\'e bildirimi. KAP açıklamasının ABD karşılığı.',
};
export const q = (id) => `<span class="qm" tabindex="0" title="${esc(TERMS[id])}" data-tip="${esc(TERMS[id])}">?</span>`;

// Çubuk grafik: [{label, v, v2?}]
export function bars(list, { h = 170, names = ['', ''] } = {}) {
  const L = list.filter((x) => x.v != null || x.v2 != null);
  if (!L.length) return '<p class="small muted">Veri yok.</p>';
  const vals = L.flatMap((x) => [x.v, x.v2]).filter((v) => v != null);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals), span = max - min || 1;
  const W = 640, pad = 18, bw = (W - 8) / L.length, two = L.some((x) => x.v2 != null);
  const y = (v) => pad + ((max - v) / span) * (h - pad * 2);
  const bar = (v, x, w, c) => (v == null ? '' : `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${w}" height="${Math.max(1, Math.abs(y(v) - y(0)))}" rx="2" fill="${v < 0 ? 'var(--down)' : c}"><title>${esc(usd(v))}</title></rect>`);
  const g = L.map((x, i) => {
    const x0 = 4 + i * bw, w = two ? bw * 0.34 : bw * 0.6;
    return bar(x.v, x0 + (two ? bw * 0.14 : bw * 0.2), w, '#B8C6E8') + (two ? bar(x.v2, x0 + bw * 0.52, w, 'var(--accent)') : '')
      + `<text x="${x0 + bw / 2}" y="${h + 12}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(x.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${h + 18}" role="img" style="width:100%;height:auto;display:block"><line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>${g}</svg>
    ${two ? `<div class="legend-row"><span><i style="background:#B8C6E8"></i>${esc(names[0])}</span><span><i style="background:var(--accent)"></i>${esc(names[1])}</span></div>` : ''}`;
}
export const qLabel = (end) => { const d = new Date(end + 'T12:00:00'); return `${Math.floor(d.getMonth() / 3) + 1}Ç${String(d.getFullYear()).slice(2)}`; };
export const ago = (d) => { const k = Math.round((Date.now() - Date.parse(d)) / 864e5); return k <= 0 ? 'bugün' : k === 1 ? 'dün' : k < 30 ? `${k} gün önce` : k < 365 ? `${Math.round(k / 30)} ay önce` : `${Math.round(k / 365)} yıl önce`; };
export const CHG = { new: ['Yeni aldı', 'b-good'], add: ['Artırdı', 'b-good'], cut: ['Azalttı', 'b-bad'], out: ['Tamamen sattı', 'b-bad'], same: ['Değiştirmedi', 'b-flat'] };
export const chgBadge = (k) => `<span class="badge ${CHG[k][1]}">${CHG[k][0]}</span>`;
// Takip listesi (bu tarayıcıda)
const WK = 'pp-us-watch';
export const watched = () => { try { return JSON.parse(localStorage.getItem(WK) || '[]'); } catch { return []; } };
export function toggleWatch(t) { const w = watched(); const i = w.indexOf(t); if (i >= 0) w.splice(i, 1); else w.push(t); try { localStorage.setItem(WK, JSON.stringify(w)); } catch {} return i < 0; }
export const star = (t) => `<button class="star ${watched().includes(t) ? 'on' : ''}" data-star="${esc(t)}" aria-label="Takip">★</button>`;
