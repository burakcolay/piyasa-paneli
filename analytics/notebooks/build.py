"""Defterleri koddan üretir (tekrarlanabilir). CI'da: python notebooks/build.py && jupyter nbconvert --execute ..."""
from pathlib import Path

import nbformat as nbf

HERE = Path(__file__).parent
SETUP = """import sys, sqlite3
from pathlib import Path
sys.path.insert(0, str(Path.cwd().parent))
import numpy as np, pandas as pd, matplotlib.pyplot as plt
from scipy import stats
from mi import db, stats as st, events as ev, charts
%matplotlib inline
pd.set_option('display.float_format', lambda v: f'{v:,.2f}')
con = db.connect()
prices = pd.read_sql('SELECT * FROM prices', con)
close, volume = st.wide(prices), st.wide(prices, 'volume')
r = st.returns(close)
assets = pd.read_sql('SELECT * FROM assets', con).set_index('code')
print(f'{close.shape[1]} varlık, {close.index[0]:%Y-%m-%d} – {close.index[-1]:%Y-%m-%d}, {len(prices):,} fiyat satırı')"""


def nb(cells):
    n = nbf.v4.new_notebook()
    n.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
    n.cells = [nbf.v4.new_markdown_cell(c[3:]) if c.startswith("md:") else nbf.v4.new_code_cell(c) for c in cells]
    return n


NOTEBOOKS = {
"01_veri_ve_kesif.ipynb": [
"""md:# 1. Veri ve keşifsel analiz

**Soru:** Elimizdeki fiyat verisi güvenilir mi ve Nasdaq 100 hisselerinin getirileri nasıl bir dağılıma sahip?

Veri hattı: Yahoo Finance (yedek: Stooq) → `mi.clean` ile temizlik → SQLite (`prices`, `assets`, SEC tabloları).""",
SETUP,
"""md:## 1.1 Veritabanı şeması ve satır sayıları""",
"""pd.DataFrame([(t, con.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]) for t in
 ['assets','prices','fundamentals','filings','insider_trades','fund_holdings']], columns=['tablo','satır'])""",
"""md:## 1.2 Veri kalitesi
Temizleme kuralları: tekrar eden günler, sıfır/negatif fiyatlar, ertesi gün geri dönen tek günlük sıçramalar (hatalı fiyat), ortak takvime hizalama.""",
"""import json
from mi.config import SITE_OUT
q = pd.DataFrame(json.loads((SITE_OUT / 'quality.json').read_text())['assets']).T
q[['rows','first','last','spikes_fixed','calendar_filled']].sort_values('rows').head(10)""",
"""md:## 1.3 Getiriler normal dağılıyor mu?
Finans modellerinin çoğu getirilerin normal dağıldığını varsayar. Gerçekte "kalın kuyruk" vardır: aşırı günler normal dağılımın öngördüğünden çok daha sık yaşanır.""",
"""x = r['NDX'].dropna() * 100
fig, ax = plt.subplots(figsize=(7, 3.4))
ax.hist(x, bins=80, density=True, color=charts.ACC, alpha=.6, label='Gerçek')
g = np.linspace(x.min(), x.max(), 300); ax.plot(g, stats.norm.pdf(g, x.mean(), x.std()), color=charts.DOWN, label='Normal dağılım')
ax.set_title('Nasdaq 100 günlük getiri dağılımı'); ax.set_xlabel('%'); ax.legend(frameon=False); plt.show()
k3 = (x.abs() > 3 * x.std()).mean() * 100
print(f'Çarpıklık {stats.skew(x):.2f}, fazla basıklık {stats.kurtosis(x):.2f}')
print(f'3 standart sapmayı aşan gün oranı: %{k3:.2f} (normal dağılımda %0.27 beklenir)')
print('Jarque-Bera normallik testi p =', f'{stats.jarque_bera(x).pvalue:.2e}')""",
"""md:**Yorum:** Fazla basıklık sıfırın belirgin üstündeyse ve Jarque-Bera p değeri çok küçükse normallik reddedilir. Pratik anlamı: oynaklıkla hesaplanan risk ölçüleri (ör. "%95 ihtimalle günlük kayıp şu kadarı geçmez") gerçek riski olduğundan küçük gösterir.""",
"""md:## 1.4 Aylık getiri ısı haritası (SQL ile)""",
"""m = pd.read_sql(\"\"\"
WITH m AS (
  SELECT strftime('%Y', date) AS y, strftime('%m', date) AS mo, close,
         ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', date) ORDER BY date DESC) AS rn
  FROM prices WHERE code = 'NDX')
SELECT y, mo, close FROM m WHERE rn = 1 ORDER BY y, mo\"\"\", con)
m['ret'] = m['close'].pct_change() * 100
hm = m.pivot(index='y', columns='mo', values='ret')
fig, ax = plt.subplots(figsize=(8, 3)); ax.grid(False)
im = ax.imshow(hm.values, cmap='RdYlGn', vmin=-10, vmax=10, aspect='auto')
ax.set_xticks(range(12), ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][:hm.shape[1]]); ax.set_yticks(range(len(hm)), hm.index)
for i in range(hm.shape[0]):
    for j in range(hm.shape[1]):
        v = hm.values[i, j]
        if not np.isnan(v): ax.text(j, i, f'{v:.0f}', ha='center', va='center', fontsize=8)
ax.set_title('Nasdaq 100 aylık getiri (%)'); plt.show()
hm.mean().rename('ortalama').to_frame().T""",
"""md:## 1.5 Sektörler: getiri ve oynaklık""",
"""h = assets[assets.cls == 'hisse']
yr = r[h.index].iloc[-252:]
sec = pd.DataFrame({'getiri_1y': (1 + yr).prod() - 1, 'oynaklık': yr.std() * np.sqrt(252), 'sektör': h['sector']}).groupby('sektör').agg(['mean', 'count'])
sec.columns = ['getiri', 'n', 'oynaklık', '_']; sec = sec.drop(columns='_')
sec[['getiri', 'oynaklık']] *= 100
sec['getiri/oynaklık'] = sec['getiri'] / sec['oynaklık']
sec.sort_values('getiri/oynaklık', ascending=False)""",
"""md:**Yorum:** Getiri/oynaklık oranı, sektörün aldığı her birim risk karşılığında ne kadar getiri verdiğini gösterir (basitleştirilmiş Sharpe oranı). Yüksek getiri tek başına iyi değildir; aynı getiriyi daha az oynaklıkla veren sektör daha verimlidir.""",
],
"02_risk_ve_iliskiler.ipynb": [
"""md:# 2. Risk ve varlıklar arası ilişkiler

**Sorular:**
1. Hangi hisseler endeksten daha riskli (beta, oynaklık)?
2. Varlıklar arasındaki ilişki sabit mi, yoksa piyasa rejimine göre değişiyor mu?
3. Düşüşlerde çeşitlendirme gerçekten işe yarıyor mu?""",
SETUP,
"""md:## 2.1 Beta ve oynaklık""",
"""risk = st.volatility(r).join(st.beta(r).rename('beta')).join(assets)
hs = risk[risk.cls == 'hisse'].dropna(subset=['beta'])
display(hs.sort_values('beta', ascending=False)[['name','sector','beta','vol_1y','vol_pctile']].head(10))
print('Beta ile oynaklık arasındaki korelasyon:', round(hs['beta'].corr(hs['vol_1y']), 2))""",
"""md:**Yorum:** Beta 1'in üstündeki hisse endeks %1 hareket ettiğinde ortalama daha fazla hareket eder. `vol_pctile` 100'e yakınsa hisse şu an son beş yılının en oynak dönemindedir.""",
"""md:## 2.2 Oynaklık rejimleri
Oynaklık kümelenir: sakin dönemler sakin, fırtınalı dönemler fırtınalı devam eder. Bunu otokorelasyonla test edelim.""",
"""x = r['NDX'].dropna()
ac_ret = [x.autocorr(l) for l in range(1, 11)]
ac_abs = [x.abs().autocorr(l) for l in range(1, 11)]
fig, ax = plt.subplots(figsize=(7, 3))
ax.bar(np.arange(1, 11) - .2, ac_ret, .4, label='Getiri', color=charts.MUTED)
ax.bar(np.arange(1, 11) + .2, ac_abs, .4, label='Mutlak getiri (oynaklık)', color=charts.ACC)
ax.axhline(0, color='k', lw=.6); ax.set_xlabel('Gecikme (gün)'); ax.set_title('Otokorelasyon: yön tahmin edilemez, oynaklık edilir'); ax.legend(frameon=False); plt.show()""",
"""md:**Yorum:** Getirinin kendisinin otokorelasyonu sıfıra yakın (yarının yönü bugünden tahmin edilemez), ama mutlak getirininki belirgin pozitif: büyük hareketli günleri büyük hareketli günler izler. Risk yönetiminde oynaklığın son dönem değerinin kullanılmasının nedeni bu.""",
"""md:## 2.3 İlişkiler zamanla değişiyor mu?""",
"""pairs = [('BTC', 'NDX'), ('GOLD', 'DXY'), ('TLT', 'NDX')]
fig, ax = plt.subplots(figsize=(8, 3.4))
for i, (a, b) in enumerate(pairs):
    st.rolling_corr(r, a, b, 63).plot(ax=ax, lw=1.4, color=charts.PALETTE[i], label=f'{a} ↔ {b}')
ax.axhline(0, color='k', lw=.6); ax.set_title('63 günlük kayan korelasyon'); ax.legend(frameon=False); plt.show()""",
"""md:**Hipotez testi:** Bitcoin ile Nasdaq 100 arasındaki korelasyon, son bir yılda önceki yıla göre değişti mi? İki bağımsız korelasyonun farkı için Fisher z dönüşümü kullanılır.""",
"""def fisher_test(r1, n1, r2, n2):
    z = (np.arctanh(r1) - np.arctanh(r2)) / np.sqrt(1 / (n1 - 3) + 1 / (n2 - 3))
    return z, 2 * (1 - stats.norm.cdf(abs(z)))
a, b = r[['BTC', 'NDX']].dropna().iloc[-252:], r[['BTC', 'NDX']].dropna().iloc[-504:-252]
r1, r2 = a.corr().iloc[0, 1], b.corr().iloc[0, 1]
z, p = fisher_test(r1, len(a), r2, len(b))
print(f'Son 1 yıl: {r1:.2f}, önceki yıl: {r2:.2f}, z = {z:.2f}, p = {p:.3f}')
print('Fark istatistiksel olarak anlamlı.' if p < .05 else 'Fark anlamlı değil: ilişki iki yılda benzer.')""",
"""md:## 2.4 Kötü günlerde çeşitlendirme
Korelasyonlar sakin günlerde düşük, panik günlerinde yüksek olabilir; yani çeşitlendirme tam ihtiyaç duyulduğunda çalışmayabilir. Nasdaq 100'ün en kötü %10'luk günlerinde korelasyonu, diğer günlerle karşılaştıralım.""",
"""bad = r['NDX'] <= r['NDX'].quantile(.10)
cols = ['SPX', 'GOLD', 'BTC', 'TLT', 'OIL', 'DXY']
cmp = pd.DataFrame({'kötü günler': r[bad][cols].corrwith(r[bad]['NDX']), 'diğer günler': r[~bad][cols].corrwith(r[~bad]['NDX'])})
cmp['fark'] = cmp['kötü günler'] - cmp['diğer günler']; cmp""",
"""md:## 2.5 En büyük düşüşler (SQL)""",
"""db.query('drawdowns', con).head(15)""",
],
"03_olay_calismalari.ipynb": [
"""md:# 3. Olay çalışmaları: bilançolar ve yönetici alımları

## Araştırma soruları
1. **Bilanço tepkisi:** Bilanço açıklamasından sonraki iki gün, sıradan günlerden daha mı oynak?
2. **Bilanço sonrası sürüklenme (PEAD):** İlk tepkinin yönü sonraki iki ayda devam ediyor mu? Akademik literatürde küçük hisselerde görülür; büyük ve çok takip edilen Nasdaq 100 şirketlerinde de var mı?
3. **Yönetici alımları:** Yöneticiler kendi hisselerini piyasadan aldıktan sonra hisse piyasadan iyi gidiyor mu?

## Yöntem
- Olay tarihleri SEC'ten: bilanço için 8-K madde 2.02, yönetici işlemleri için Form 4.
- **Piyasa modeli:** her olay için olaydan 250 ile 30 gün önce arasında `getiri_hisse = α + β · getiri_endeks` tahmin edilir. Olay penceresindeki **anormal getiri** = gerçekleşen − modelin beklediği.
- **CAR** (kümülatif anormal getiri): pencere boyunca anormal getirilerin toplamı. Tepki = gün 0..1, sürüklenme = gün 2..40.
- Testler: tek örneklem t-testi (ortalama ≠ 0?), Welch t-testi (iki grup farkı), Spearman sıra korelasyonu.""",
SETUP,
"""E = pd.read_sql(\"SELECT code, date FROM filings WHERE items LIKE '%2.02%'\", con)
res = ev.earnings_study(r, E)
print(f\"{res['n']} bilanço, {res['companies']} şirket, {res['period'][0]} – {res['period'][1]}\")""",
"""md:## 3.1 Bilanço günleri ne kadar oynak?""",
"""print(f\"Bilanço sonrası 2 günlük ortalama |anormal getiri|: %{res['abs_react_mean']:.2f}\")
print(f\"Sıradan 2 günlük ortalama |fazla getiri|:         %{res['normal_2d_abs_mean']:.2f}\")
print(f\"Oran: {res['react_ratio']:.2f} kat\")""",
"""md:## 3.2 İlk tepki sürüyor mu?""",
"""charts.event_paths(res['path_days'], res['avg_path'], Path('/tmp/_p.png'))
from IPython.display import Image; display(Image('/tmp/_p.png'))
pd.DataFrame(res['drift_by_bucket']).T[['n', 'mean', 'ci95', 't', 'p', 'hit']]""",
"""d = res['drift_spread']; s = res['spearman']
print(f\"Olumlu − olumsuz grup sürüklenme farkı: {d['diff']:.2f} puan, Welch t = {d['t']:.2f}, p = {d['p']:.3f}\")
print(f\"Tepki ile sonraki getiri arasında Spearman ρ = {s['rho']:.3f}, p = {s['p']:.3f}\")
print('Sonuç:', 'Sürüklenme var: piyasa bilançoyu tek seferde fiyatlamıyor.' if d['p'] < .05 and d['diff'] > 0 else 'Sürüklenme yok: büyük şirketlerde bilgi hızla fiyatlanıyor (verimli piyasa ile uyumlu).')""",
"""md:## 3.3 En sert bilanço tepkileri""",
"""pd.DataFrame(res['biggest'])""",
"""md:## 3.4 Yönetici alımları ve plansız satışlar""",
"""T = pd.read_sql('SELECT * FROM insider_trades', con)
ins = ev.insider_study(r, T)
print({k: f"{d['raw_events']} bildirim → {d['car40'].get('n', 0)} olay, {d['companies']} şirket, dönem {d['period']}" for k, d in ins.items()})
pd.DataFrame({(k, w): d[w] for k, d in ins.items() for w in ('car20', 'car40')}).T""",
"""md:## Sınırlamalar
- **Örneklem:** Yönetici alımları Nasdaq 100'de nadir; sonuçların güven aralığı geniş. Satışların çoğu önceden planlanmış (10b5-1) olduğu için yalnızca plansız satışlar incelendi.
- **Hayatta kalma yanlılığı:** Evren bugünkü Nasdaq 100 listesi; geçmişte endeksten çıkan şirketler dahil değil, bu da geçmiş getirileri olduğundan iyi gösterebilir.
- **Zamanlama:** 8-K'nın gün içi saati bilinmediği için tepki penceresi iki gün (0–1) alındı.
- **Beklenti verisi yok:** Bilanço "sürprizi" analist beklentisiyle değil, fiyat tepkisiyle ölçüldü.""",
],
"04_sql_sorgulari.ipynb": [
"""md:# 4. SQL sorguları

`analytics/sql/` klasöründeki sorgular raporların ve sitenin altyapısı. Kullanılan teknikler: CTE, pencere fonksiyonları (`ROW_NUMBER`, `RANK`, `PERCENT_RANK`, `LAG`, kayan `AVG`/`MAX`), koşullu toplama ile pivot, alt sorgular.""",
SETUP,
"""from IPython.display import Markdown
for f in sorted(db.SQL_DIR.glob('*.sql')):
    sql = f.read_text()
    display(Markdown(f'### {f.stem}\\n```sql\\n{sql}\\n```'))
    display(db.query(f.stem, con).head(8))""",
],
}

if __name__ == "__main__":
    for name, cells in NOTEBOOKS.items():
        nbf.write(nb(cells), HERE / name)
    print("defterler yazıldı:", ", ".join(NOTEBOOKS))
