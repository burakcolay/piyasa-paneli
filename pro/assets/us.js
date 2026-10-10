// ABD hisseleri için ortak parçalar: terimler, küçük grafikler, etiketler.
import { esc, map, num, usd, registerTerms } from './core.js';

registerTerms({
  fk: { name: 'F/K (fiyat/kazanç)', def: 'Hisse fiyatının son 12 aylık hisse başına kâra oranı. 30 F/K, şirketin bugünkü kârıyla kendi değerini 30 yılda kazanacağı anlamına gelir. Yüksek F/K, piyasanın hızlı büyüme beklediğini gösterir.' },
  fs: { name: 'F/S (fiyat/satış)', def: 'Piyasa değerinin son 12 aylık gelire oranı. Kârı henüz düşük ya da dalgalı şirketleri kıyaslamak için kullanılır.' },
  fcfy: { name: 'Serbest nakit verimi', def: 'Faaliyetlerden gelen nakitten yatırım harcaması düşüldükten sonra kalan paranın piyasa değerine oranı. %4 verim, şirketi bugünkü fiyattan alan birinin her 100 dolarına yılda 4 dolar serbest nakit düştüğünü gösterir.' },
  marj: { name: 'Net kâr marjı', def: 'Her 100 dolarlık satıştan kaç dolar net kâr kaldığı.' },
  brut: { name: 'Brüt marj', def: 'Satıştan doğrudan üretim maliyeti düşüldükten sonra kalan payı. Fiyatlama gücünün iyi bir göstergesi.' },
  ttm: { name: 'Son 12 ay', def: 'Son dört çeyreğin toplamı. Yıl sonunu beklemeden en güncel yıllık resmi verir.' },
  f13: { name: '13F bildirimi', def: '100 milyon dolardan büyük ABD hisse portföyü yöneten kurumların her çeyrek SEC\'e verdiği pozisyon listesi. Çeyrek bitiminden en geç 45 gün sonra yayımlanır, yani gecikmeli bir fotoğraftır. Açığa satış ve ABD dışı varlıklar görünmez.' },
  form4: { name: 'İçeriden işlem (Form 4)', def: 'Yöneticilerin ve %10\'dan fazla paya sahip ortakların kendi şirket hisselerinde yaptığı alım satım. İki iş günü içinde bildirilir. Satışlar çoğu zaman vergi ya da önceden planlanmış programlardan gelir; alımlar daha anlamlıdır, çünkü yöneticinin kendi parasını koyduğunu gösterir.' },
  plan: { name: '10b5-1 planı', def: 'Yöneticinin aylar önce kurduğu otomatik satış programı. Bu plana bağlı satışlar o günkü bir görüşü yansıtmaz.' },
  k8: { name: '8-K', def: 'Şirketin önemli bir olayı (bilanço, satın alma, yönetici değişikliği, yeni borç) dört iş günü içinde SEC\'e bildirdiği form. KAP açıklamasının ABD karşılığı.' },
});

export const FORM_TONE = { '8-K': 'acc', '10-K': 'good', '10-Q': 'good', '20-F': 'good', '6-K': '' };
export const pctv = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `%${num(v, d)}`);

// Basit çubuk grafik: [{label, v, v2?}] → SVG. v2 varsa ikinci (koyu) çubuk.
export function bars(list, { h = 170, names = ['', ''], fmt = usd } = {}) {
  const L = list.filter((x) => x.v != null || x.v2 != null);
  if (!L.length) return '<p class="small muted">Veri yok.</p>';
  const vals = L.flatMap((x) => [x.v, x.v2]).filter((v) => v != null);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals), span = max - min || 1;
  const W = 640, pad = 18, bw = (W - 8) / L.length, two = L.some((x) => x.v2 != null);
  const y = (v) => pad + ((max - v) / span) * (h - pad * 2);
  const bar = (v, x, w, c) => v == null ? '' : `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${w}" height="${Math.max(1, Math.abs(y(v) - y(0)))}" rx="2" fill="${v < 0 ? 'var(--down)' : c}"><title>${esc(fmt(v))}</title></rect>`;
  const g = L.map((x, i) => {
    const x0 = 4 + i * bw, w = two ? bw * 0.34 : bw * 0.6;
    return bar(x.v, x0 + (two ? bw * 0.14 : bw * 0.2), w, '#B9C7D6') + (two ? bar(x.v2, x0 + bw * 0.52, w, 'var(--accent)') : '')
      + `<text x="${x0 + bw / 2}" y="${h + 12}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${esc(x.label)}</text>`;
  }).join('');
  const last = L.at(-1);
  return `<svg viewBox="0 0 ${W} ${h + 18}" class="bars-svg" role="img" style="width:100%;height:auto;display:block">
    <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>${g}
    <text x="${W - 4}" y="${Math.max(11, y(Math.max(last.v ?? 0, last.v2 ?? 0)) - 5)}" text-anchor="end" font-size="11" font-weight="600" fill="var(--ink-2)">${esc(fmt(last.v2 ?? last.v))}</text>
  </svg>${two ? `<div class="legend"><span><i style="background:#B9C7D6"></i>${esc(names[0])}</span><span><i style="background:var(--accent)"></i>${esc(names[1])}</span></div>` : ''}`;
}

// Çeyrek etiketi: dönem sonu tarihinden "3Ç25"
export const qLabel = (end) => { const d = new Date(end + 'T12:00:00'); const m = d.getMonth(); const q = Math.floor(((m + 12 - 0) % 12) / 3) + 1; return `${q}Ç${String(d.getFullYear()).slice(2)}`; };
export const yLabel = (r) => String(r.fy || r.end.slice(0, 4));
export const ago = (d) => { const n = Math.round((Date.now() - Date.parse(d)) / 864e5); return n <= 0 ? 'bugün' : n === 1 ? 'dün' : n < 30 ? `${n} gün önce` : n < 365 ? `${Math.round(n / 30)} ay önce` : `${Math.round(n / 365)} yıl önce`; };
export const CHG = { new: ['Yeni aldı', 'good'], add: ['Artırdı', 'good'], cut: ['Azalttı', 'bad'], out: ['Tamamen sattı', 'bad'], same: ['Değiştirmedi', ''] };
export const chip = (k) => `<span class="chip ${CHG[k][1]}">${CHG[k][0]}</span>`;
export const sparkRow = (xs) => map(xs, (x) => x);
