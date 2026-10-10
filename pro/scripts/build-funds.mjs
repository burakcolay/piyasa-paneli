// Fon ham verisini (pro/data/funds-raw/*.json) birleştirip pro/data/funds.json üretir.
// Çalıştır: node pro/scripts/build-funds.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rawDir = path.join(root, 'data/funds-raw');

// Endeks fonları: ağırlık değişimi yöneticinin kararı değil, endeksin değişimi.
const INDEX = {
  AKU: 'BIST 30 endeks', TIE: 'BIST 30 endeks', YEF: 'BIST 30 endeks', GAE: 'BIST 30 endeks',
  ADP: 'Banka endeks', TAU: 'Banka endeks', TTE: 'Teknoloji endeks',
};

const funds = fs.readdirSync(rawDir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8')))
  .sort((a, b) => b.size - a.size);

const stocks = {};
for (const F of funds) {
  F.type = INDEX[F.code] ? 'endeks' : 'aktif';
  F.type_label = INDEX[F.code] || 'Aktif yönetilen';
  for (const h of F.holdings) {
    const s = (stocks[h.t] ||= { t: h.t, name: h.name, holders: [] });
    const val = (h.w / 100) * F.size;              // fondaki TL değeri
    const flow = (h.d / 100) * F.size;             // ağırlık değişimi × fon büyüklüğü
    s.holders.push({ f: F.code, w: h.w, d: h.d, status: h.status, val: Math.round(val), flow: Math.round(flow), type: F.type });
  }
}

const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);
const list = Object.values(stocks).map((s) => {
  const act = s.holders.filter((h) => h.type === 'aktif');
  const held = s.holders.filter((h) => h.w > 0);
  return {
    t: s.t, name: s.name,
    n_funds: held.length,
    n_up: s.holders.filter((h) => h.d > 0).length,
    n_down: s.holders.filter((h) => h.d < 0).length,
    n_new: s.holders.filter((h) => h.status === 'new').length,
    n_out: s.holders.filter((h) => h.status === 'out').length,
    val: Math.round(sum(s.holders, 'val')),
    flow: Math.round(sum(s.holders, 'flow')),
    flow_active: Math.round(sum(act, 'flow')),
    holders: s.holders.sort((a, b) => b.val - a.val),
  };
}).sort((a, b) => b.val - a.val);

// Portföy şirketi bazında
const companies = {};
for (const F of funds) {
  const c = (companies[F.company] ||= { name: F.company, funds: [], size: 0, size_prev: 0, investors: 0 });
  c.funds.push(F.code); c.size += F.size; c.size_prev += F.size_prev; c.investors += F.investor_count || 0;
}

const out = {
  period: funds[0]?.period,
  generated: new Date().toISOString().slice(0, 10),
  source: 'Fon portföy dağılım raporları (KAP), fonoloji.com üzerinden derlendi. Demo, kişisel kullanım.',
  method: 'Tahmini akış = aylık ağırlık değişimi (puan) × fonun ay sonu büyüklüğü. Fiyat değişiminin etkisini de içerir; kesin alım-satım değildir.',
  totals: {
    funds: funds.length,
    size: sum(funds, 'size'),
    size_prev: sum(funds, 'size_prev'),
    investors: funds.reduce((s, f) => s + (f.investor_count || 0), 0),
    stocks: list.filter((s) => s.n_funds > 0).length,
  },
  funds: funds.map((F) => ({
    code: F.code, name: F.name, company: F.company, type: F.type, type_label: F.type_label,
    size: F.size, size_prev: F.size_prev, investors: F.investor_count, r1m: F.return_1m, r1y: F.return_1y,
    equity: F.equity_weight, other: F.other || [],
    holdings: F.holdings.map((h) => ({ t: h.t, w: h.w, d: h.d, status: h.status })),
  })),
  stocks: list,
  companies: Object.values(companies).sort((a, b) => b.size - a.size),
};

fs.writeFileSync(path.join(root, 'data/funds.json'), JSON.stringify(out));
console.log(`funds.json: ${funds.length} fon, ${out.totals.stocks} hisse, ${(fs.statSync(path.join(root, 'data/funds.json')).size / 1024).toFixed(0)} KB`);
const top = [...list].sort((a, b) => b.flow_active - a.flow_active);
console.log('EN ÇOK ARTAN (aktif):', top.slice(0, 12).map((s) => `${s.t} ${(s.flow_active / 1e6).toFixed(0)}M ${s.n_up}/${s.n_down} new${s.n_new}`).join(' | '));
console.log('EN ÇOK AZALAN (aktif):', top.slice(-12).reverse().map((s) => `${s.t} ${(s.flow_active / 1e6).toFixed(0)}M ${s.n_up}/${s.n_down} out${s.n_out}`).join(' | '));
console.log('EN BÜYÜK:', list.slice(0, 10).map((s) => `${s.t} ${(s.val / 1e9).toFixed(2)}B ${s.n_funds}f`).join(' | '));
console.log('YENİ GİRİŞ:', list.filter((s) => s.n_new).sort((a, b) => b.n_new - a.n_new).slice(0, 10).map((s) => `${s.t}:${s.n_new}`).join(' '));
console.log('ÇIKIŞ:', list.filter((s) => s.n_out).sort((a, b) => b.n_out - a.n_out).slice(0, 10).map((s) => `${s.t}:${s.n_out}`).join(' '));
console.log('TOTALS', out.totals);
