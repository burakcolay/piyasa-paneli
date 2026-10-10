"""Analizleri hesaplar; sitenin JSON'unu ve haftalık Markdown raporunu üretir."""
from __future__ import annotations

import json
import math
from datetime import date

import numpy as np
import pandas as pd

from . import charts, db, events, stats as st
from .config import BENCHMARK, MACRO, REPORT_DIR, SITE_OUT

CROSS = ["NDX", "SPX", "US10Y", "DXY", "GOLD", "OIL", "BTC", "TLT", "VIX"]
PAIRS = [("BTC", "NDX", "Bitcoin ↔ Nasdaq 100"), ("GOLD", "DXY", "Altın ↔ Dolar"), ("US10Y", "NDX", "10Y faiz ↔ Nasdaq 100"), ("TLT", "NDX", "Uzun tahvil ↔ Nasdaq 100")]
LABELS = {code: name for _, (code, name, _) in MACRO.items()} | {"NDX": "Nasdaq 100", "SPX": "S&P 500", "US10Y": "10Y faiz", "DXY": "Dolar", "VIX": "VIX", "TLT": "Uzun tahvil", "OIL": "Petrol"}


def _clean(o):
    """JSON için NaN/inf -> None, numpy -> python."""
    if isinstance(o, dict):
        return {str(k): _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if not math.isfinite(o) else round(float(o), 4)
    if isinstance(o, np.integer):
        return int(o)
    return o


def tr(v: float, d: int = 1) -> str:
    return f"{v:.{d}f}".replace(".", ",").replace("-", "−")


def compute() -> dict:
    con = db.connect()
    p = pd.read_sql("SELECT code, date, close, volume FROM prices", con)
    close, vol = st.wide(p), st.wide(p, "volume")
    r = st.returns(close)
    assets = pd.read_sql("SELECT * FROM assets", con).set_index("code")
    last = close.index[-1].strftime("%Y-%m-%d")

    cross = [c for c in CROSS if c in r.columns]
    c63, c252 = st.corr_matrix(r, cross, 63), st.corr_matrix(r, cross, 252)
    pairs = []
    for a, b, label in PAIRS:
        if a in r.columns and b in r.columns:
            rc = st.rolling_corr(r, a, b, 63).dropna()
            pairs.append({"a": a, "b": b, "label": label, "now": rc.iloc[-1], "year_ago": rc.iloc[-253] if len(rc) > 253 else None,
                          "min": rc.min(), "max": rc.max(),
                          "series": [[d.strftime("%Y-%m-%d"), v] for d, v in rc.iloc[::5].items()]})

    volt = st.volatility(r)
    b = st.beta(r)
    risk = volt.join(b.rename("beta")).join(assets[["name", "sector", "cls"]])
    dd = st.drawdown(close)
    dd_series = {c: [[d.strftime("%Y-%m-%d"), v] for d, v in dd[c].dropna().iloc[::5].items()] for c in ["NDX", "BTC", "GOLD"] if c in dd}

    E = pd.read_sql("SELECT code, date FROM filings WHERE items LIKE '%2.02%'", con)
    T = pd.read_sql("SELECT * FROM insider_trades", con)
    out = {
        "updated": last,
        "regime": st.regime(r, close),
        "period_returns": db.query("period_returns", con).to_dict("records"),
        "sectors": db.query("sector_returns", con).to_dict("records"),
        "trend": db.query("trend_status", con)["trend"].value_counts().to_dict(),
        "drawdowns": db.query("drawdowns", con).to_dict("records"),
        "corr": {"codes": cross, "labels": [LABELS.get(c, c) for c in cross], "m63": c63.values.tolist(), "m252": c252.values.tolist()},
        "pairs": pairs,
        "risk": risk.reset_index(names="code").to_dict("records"),
        "dd_series": dd_series,
        "anomalies": st.anomalies(r, vol).merge(assets[["name"]], left_on="code", right_index=True, how="left").to_dict("records"),
        "insider_sectors": db.query("insider_by_sector", con).to_dict("records"),
        "fund_consensus": db.query("fund_consensus", con).head(15).to_dict("records"),
        "earnings_study": events.earnings_study(r, E),
        "insider_study": events.insider_study(r, T),
    }
    con.close()
    out["narrative"] = narrative(out)
    return _clean(out)


def narrative(R: dict) -> list[str]:
    """Kural tabanlı Türkçe yorum: rakamı tekrar etmez, ne anlama geldiğini söyler."""
    s = []
    g = R["regime"]
    s.append(f"Nasdaq 100 {g['trend']} trendinde (200 günlük ortalamanın {'üstünde' if g['dist_ma200'] > 0 else 'altında'}) "
             f"ve oynaklık uzun dönem normaline göre {g['vol_level']}. "
             + ("Bu, sakin bir yükseliş ortamı: geri çekilmeler genellikle sınırlı kalır." if g["trend"] == "yükseliş" and g["vol_level"] != "yüksek"
                else "Yüksek oynaklıkla gelen yükseliş kırılgandır; haber akışına duyarlılık artar." if g["trend"] == "yükseliş"
                else "Düşüş trendinde oynaklığın yüksek olması, satışın panik tarafına geçtiğini gösterebilir." if g["vol_level"] == "yüksek"
                else "Sakin bir düşüş: satış baskısı düzenli ama paniğe dönmüş değil."))
    if R["sectors"]:
        top, bot = R["sectors"][0], R["sectors"][-1]
        s.append(f"Son bir ayda en güçlü sektör {top['sector']}, en zayıfı {bot['sector']}. "
                 f"Para {'savunmacı' if top['sector'] in ('Sağlık', 'Gıda ve içecek', 'Enerji ve kamu hizmeti') else 'büyüme ve döngüsel'} tarafa kayıyor.")
    for pr in R["pairs"]:
        if pr["year_ago"] is None:
            continue
        d = pr["now"] - pr["year_ago"]
        if abs(d) > 0.25:
            s.append(f"{pr['label']} ilişkisi bir yıl öncesine göre belirgin {'güçlendi' if d > 0 else 'zayıfladı'}. "
                     + ("İki varlık artık daha çok birlikte hareket ediyor; birini diğerine karşı çeşitlendirme aracı olarak kullanmak eskisi kadar işe yaramaz." if d > 0
                        else "İki varlık birbirinden ayrışıyor; biri diğerinin hareketini eskisi kadar açıklamıyor."))
    es = R["earnings_study"]
    if es.get("n", 0) >= 20 and es.get("react_ratio"):
        sp = es["drift_spread"]
        k = es["react_ratio"]
        oyn = (f"yaklaşık {tr(k)} kat fazla oynuyor" if k > 1.15 else "daha az oynuyor" if k < 0.9 else "sıradan günlere benzer oynuyor")
        s.append(f"Bilanço açıklamalarından sonraki iki günde hisseler, sıradan iki günlük dönemlere göre {oyn} ({es['n']} bilanço). "
                 + (f"İlk tepkisi olumlu olanlar sonraki iki ayda da olumsuzlardan daha iyi gitti ve fark istatistiksel olarak anlamlı (p={tr(sp['p'], 3)}): piyasa bilançoyu tek seferde fiyatlamıyor."
                    if sp["p"] < 0.05 and sp["diff"] > 0 else
                    f"İlk tepkinin yönü sonraki iki ayı açıklamıyor (p={tr(sp['p'], 2)}): büyük şirketlerde bilanço haberi hızla fiyatlanıyor, sürüklenme görülmüyor."))
    ins = R["insider_study"].get("alim", {})
    al = ins.get("car40", {})
    if al.get("n", 0) >= 3 and al.get("mean") is not None:
        per = ins.get("period") or ["", ""]
        s.append(f"Yöneticilerin piyasadan alım yaptığı {al['n']} olayda ({ins.get('companies')} şirket) hisse sonraki iki ayda piyasaya göre ortalama {tr(al['mean'])} puan "
                 f"{'fazla' if al['mean'] > 0 else 'az'} getiri sağladı" + (f" ve fark istatistiksel olarak anlamlı. Ancak olaylar {per[0][:7]} – {per[1][:7]} arasındaki kısa bir döneme yığılmış; aynı piyasa ortamını paylaştıkları için bağımsız sayılmazlar, sonuç daha uzun bir dönemde doğrulanmadan sinyal sayılmamalı."
                    if al["p"] < 0.05 else "; ancak örnek küçük ve fark istatistiksel olarak anlamlı değil, tek başına sinyal sayılmamalı."))
    if R["anomalies"]:
        names = ", ".join(sorted({a["code"] for a in R["anomalies"]})[:6])
        s.append(f"Son iki haftada getirisi ya da hacmi kendi normalinin çok dışına çıkan varlıklar: {names}. Bu günlerin arkasında genellikle bilanço, haber ya da endeks değişikliği olur.")
    return s


def write_site(R: dict):
    SITE_OUT.mkdir(parents=True, exist_ok=True)
    (SITE_OUT / "summary.json").write_text(json.dumps(R, ensure_ascii=False, separators=(",", ":")))


def write_weekly(R: dict, quality: dict) -> str:
    y, w, _ = date.fromisoformat(R["updated"]).isocalendar()
    wk = f"{y}-W{w:02d}"
    d = REPORT_DIR / wk
    d.mkdir(parents=True, exist_ok=True)
    c = R["corr"]
    charts.corr_heatmap(pd.DataFrame(c["m63"], index=c["codes"], columns=c["codes"]), LABELS, d / "korelasyon.png", "Varlıklar arası ilişki, son 3 ay")
    charts.sector_bars(pd.DataFrame(R["sectors"]), d / "sektorler.png")
    charts.lines({p["label"]: pd.Series({pd.Timestamp(x): v for x, v in p["series"]}) for p in R["pairs"][:3]}, d / "iliskiler.png",
                 "İlişkiler zamanla nasıl değişiyor (63 günlük korelasyon)", "Korelasyon")
    charts.lines({LABELS.get(k, k): pd.Series({pd.Timestamp(x): v for x, v in s}) for k, s in R["dd_series"].items()}, d / "dusus.png",
                 "Zirveden uzaklık", "%", zero=False)
    risk = pd.DataFrame(R["risk"]).set_index("code")
    charts.risk_scatter(risk[risk["cls"] == "hisse"].dropna(subset=["beta", "vol_1y"]), d / "risk.png")
    es = R["earnings_study"]
    if es.get("avg_path"):
        charts.event_paths(es["path_days"], es["avg_path"], d / "bilanco.png")

    def tbl(rows, cols, heads):
        h = "| " + " | ".join(heads) + " |\n|" + "|".join("---" for _ in heads) + "|\n"
        return h + "".join("| " + " | ".join(str(f(r)) for f in cols) + " |\n" for r in rows)

    sec = tbl(R["sectors"], [lambda r: r["sector"], lambda r: tr(r["r_1w"]), lambda r: tr(r["r_1m"]), lambda r: tr(r["r_3m"]), lambda r: r["leader"], lambda r: r["laggard"]],
              ["Sektör", "1 hafta %", "1 ay %", "3 ay %", "Öncü", "Geride kalan"])
    pr = sorted([x for x in R["period_returns"] if x["cls"] == "hisse" and x["r_1w"] is not None], key=lambda x: x["r_1w"])
    movers = tbl(pr[-5:][::-1] + pr[:5], [lambda r: r["code"], lambda r: r["name"], lambda r: tr(r["r_1w"]), lambda r: tr(r["r_1m"])], ["Kod", "Şirket", "1 hafta %", "1 ay %"])
    an = tbl(R["anomalies"][:12], [lambda r: r["date"], lambda r: r["code"], lambda r: tr(r["ret"]), lambda r: tr(r["z_ret"]) if r["z_ret"] is not None else "—",
                                   lambda r: tr(r["z_vol"]) if r["z_vol"] is not None else "—"], ["Tarih", "Kod", "Getiri", "Getiri z", "Hacim z"]) if R["anomalies"] else "_Olağandışı gün yok._\n"
    ok = sum(1 for q in quality.values() if q.get("rows", 0) > 200)
    fixed = sum(q.get("spikes_fixed", 0) for q in quality.values())
    bucket = es.get("drift_by_bucket", {})
    md = f"""# Haftalık piyasa raporu · {wk}

_Otomatik üretildi: {R['updated']} kapanış verisiyle. Kaynak kod: [`analytics/`](../../analytics). Yatırım tavsiyesi değildir._

## Özet
{chr(10).join('- ' + x for x in R['narrative'])}

## Sektörler
![Sektörler](sektorler.png)

{sec}
## Haftanın en çok yükselen ve düşen hisseleri
{movers}
## Varlıklar arası ilişki
![Korelasyon](korelasyon.png)

![İlişkilerin zaman içindeki değişimi](iliskiler.png)

## Risk
![Risk haritası](risk.png)

![Zirveden uzaklık](dusus.png)

## Olağandışı günler (son 10 işlem günü)
Getirisi ya da hacmi, önceki 63 günün ortalamasından en az 3 standart sapma uzak olanlar.

{an}
## Araştırma: Bilanço sonrası fiyat davranışı
{f'''![Bilanço sonrası](bilanco.png)

{es['n']} bilanço açıklaması ({es['companies']} şirket, {es['period'][0]} – {es['period'][1]}). Anormal getiri piyasa modeliyle hesaplandı (her olay için önceki 220 günde hissenin Nasdaq 100'e duyarlılığı).

| İlk tepki grubu | Olay | Sonraki 2 ay ort. anormal getiri % | t | p |
|---|---|---|---|---|
''' + ''.join(f"| {k} | {v['n']} | {tr(v['mean'], 2)} | {tr(v['t'], 2)} | {tr(v['p'], 3)} |{chr(10)}" for k, v in bucket.items()) + f'''
Olumlu ve olumsuz grup farkı: {tr(es['drift_spread']['diff'], 2)} puan (Welch t-testi p={tr(es['drift_spread']['p'], 3)}). Tepki ile sonraki getiri arasındaki sıra korelasyonu: {tr(es['spearman']['rho'], 3)} (p={tr(es['spearman']['p'], 3)}).
''' if es.get('avg_path') else '_Yeterli veri yok._'}
## Veri kalitesi
- {ok} varlıkta 200 günden uzun temiz fiyat geçmişi var.
- Temizleme sırasında {fixed} tek günlük hatalı fiyat düzeltildi.
"""
    (d / "README.md").write_text(md)
    idx = sorted([p.name for p in REPORT_DIR.iterdir() if p.is_dir()], reverse=True)
    (REPORT_DIR / "README.md").write_text("# Haftalık raporlar\n\nHer cumartesi GitHub Actions tarafından otomatik üretilir.\n\n" + "".join(f"- [{x}]({x}/README.md)\n" for x in idx))
    return wk
