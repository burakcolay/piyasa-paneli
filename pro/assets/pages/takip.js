import { shell, fail, esc, map, num, pct, tl, tone, loadFunds, loadLive, loadCrypto, store, watchBtn, evalAlerts, alertTitle, addAlert, removeAlert, ALERT_RULES, MACRO_KEYS, COINS, toast, refreshAlertDot, setLivePill, ICON, periodLabel, actStats } from '../core.js';

const app = shell('takip', { title: 'Takip ve alarmlar' });

async function main() {
  const [F, L] = await Promise.all([loadFunds(), loadLive()]);
  setLivePill(L);
  let C = null;
  const render = () => {
    const W = store().watch;
    const stocks = (W.stock || []).map((t) => F.stocks.find((s) => s.t === t)).filter(Boolean);
    const funds = (W.fund || []).map((c) => F.funds.find((f) => f.code === c)).filter(Boolean);
    const coins = (W.coin || []).map((c) => (C || []).find((x) => x.code === c) || { code: c });
    const res = evalAlerts({ funds: F, live: L, crypto: C });
    refreshAlertDot({ funds: F, live: L, crypto: C });
    const empty = (what) => `<div class="empty-state"><b>Takip listende ${what} yok</b><p>Üstteki arama kutusundan bul, satırdaki yıldıza bas.</p></div>`;

    app.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Takip ve alarmlar</h1><p>Takip ettiğin hisse, fon ve coinler tek yerde. Bugün ekranı bu listeye göre şekillenir.</p></div></div>
      <div class="grid">
        <section class="panel glass c7">
          <div class="panel-h"><h2>Hisseler</h2><span class="small muted">${periodLabel(F.period)} fon hareketi</span></div>
          ${stocks.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Hisse</th><th class="n">Fon</th><th class="n">Tahmini akış</th><th class="n">Artıran / azaltan (aktif)</th></tr></thead><tbody>
            ${map(stocks, (s) => `<tr><td>${watchBtn('stock', s.t)}</td><td><a class="row-link" href="hisse.html?s=${s.t}"><span class="tk">${s.t}</span><span class="nm">${esc(s.name)}</span></a></td><td class="n">${s.n_funds}</td><td class="n ${tone(s.flow_active)}">${tl(s.flow_active, true)}</td><td class="n"><span class="up">${actStats(s).up}</span> <span class="muted">/</span> <span class="down">${actStats(s).down}</span></td></tr>`)}
          </tbody></table></div>` : empty('hisse')}
        </section>
        <section class="panel glass c5">
          <div class="panel-h"><h2>Fonlar</h2></div>
          ${funds.length ? `<div class="rows">${map(funds, (f) => `<div class="row">${watchBtn('fund', f.code)}<a class="main-c" href="fon.html?f=${f.code}" style="color:inherit;text-decoration:none"><b>${f.code}</b><small>${esc(f.company)} · ${tl(f.size)}</small></a><div class="end"><b class="${tone(f.r1m)}">${pct(f.r1m)}</b><small class="muted">1 ay</small></div></div>`)}</div>` : empty('fon')}
          <div class="panel-h" style="margin-top:6px"><h2>Coinler</h2></div>
          ${coins.length ? `<div class="rows">${map(coins, (c) => `<div class="row">${watchBtn('coin', c.code)}<a class="main-c" href="kripto.html#${c.code}" style="color:inherit;text-decoration:none"><b>${c.code}</b><small>${c.price ? `$${num(c.price, c.price < 1000 ? 2 : 0)} · fonlama %${num(c.funding, 4)}` : 'Kripto sayfasında canlı veri'}</small></a><div class="end">${c.chg != null ? `<b class="${tone(c.chg)}">${pct(c.chg, 2)}</b><small class="muted">24 saat</small>` : ''}</div></div>`)}</div>` : empty('coin')}
        </section>
      </div>

      <section class="panel glass">
        <div class="panel-h"><h2>Alarmlar</h2>${'Notification' in window && Notification.permission !== 'granted' ? '<button class="btn" id="notif">Tarayıcı bildirimlerini aç</button>' : '<span class="small muted">Sayfa açıkken tetiklenen alarm bildirim olarak gelir</span>'}</div>
        <div class="rows">${res.length ? map(res, ({ a, hit, text }) => { const t = alertTitle(a); return `<div class="row"><span class="chip ${hit ? 'warn' : ''}" style="min-width:92px;justify-content:center">${hit === true ? 'Tetiklendi' : hit === false ? 'Sakin' : 'Veri bekleniyor'}</span><div class="main-c"><b>${esc(t.what)}</b><small style="white-space:normal">${esc(t.rule)}${a.value != null ? ` (${num(a.value, 2)})` : ''} · ${esc(text)}</small></div><button class="watch" data-del="${a.id}" title="Alarmı sil" aria-label="Alarmı sil">${ICON.trash}</button></div>`; }) : '<p class="small muted">Henüz alarm yok.</p>'}</div>
        <form id="add" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding-top:6px;border-top:1px solid var(--hair)">
          <b class="small" style="margin-right:4px">Yeni alarm</b>
          <select class="sel" name="kind" aria-label="Alarm türü"><option value="stock">Hisse</option><option value="fund">Fon</option><option value="macro">Fiyat seviyesi</option><option value="coin">Coin</option></select>
          <select class="sel" name="code" aria-label="Neyi izleyelim"></select>
          <select class="sel" name="rule" aria-label="Koşul"></select>
          <input class="inp" name="value" type="number" step="any" placeholder="Eşik" style="width:100px" hidden aria-label="Eşik değeri">
          <button class="btn primary" type="submit">${ICON.plus}Alarm ekle</button>
        </form>
      </section>
    </div>`;

    document.getElementById('notif')?.addEventListener('click', async () => { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Bildirimler açıldı' : 'Bildirim izni verilmedi'); render(); });
    const form = document.getElementById('add');
    const fill = () => {
      const k = form.kind.value;
      const codes = k === 'stock' ? F.stocks.filter((s) => s.n_funds > 0).map((s) => [s.t, s.t]).sort() : k === 'fund' ? F.funds.map((f) => [f.code, `${f.code} · ${f.company}`]) : k === 'macro' ? Object.entries(MACRO_KEYS) : COINS.map((c) => [c.code, c.code]);
      form.code.innerHTML = map(codes, ([v, l]) => `<option value="${v}">${esc(l)}</option>`);
      form.rule.innerHTML = map(ALERT_RULES[k], (r) => `<option value="${r.id}">${esc(r.label)}</option>`);
      form.value.hidden = k !== 'macro';
    };
    form.kind.addEventListener('change', fill); fill();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const a = { kind: form.kind.value, code: form.code.value, rule: form.rule.value };
      if (a.kind === 'macro') { const v = parseFloat(form.value.value); if (!isFinite(v)) { toast('Eşik değeri gir'); form.value.focus(); return; } a.value = v; }
      addAlert(a); toast('Alarm eklendi'); render();
    });
  };
  render();
  app.addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]'); if (d) { removeAlert(d.dataset.del); toast('Alarm silindi'); render(); }
    if (e.target.closest('[data-watch]')) setTimeout(render, 0);
  });
  loadCrypto().then((c) => { if (c) { C = c; render(); } });
}

main().catch(fail);
