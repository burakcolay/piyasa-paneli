"""Olay çalışmaları (event study).

1) Bilanço açıklamaları: Şirketler bilanço sonrası ilk iki günde ne kadar oynuyor ve
   ilk tepkinin yönü sonraki haftalarda sürüyor mu? (bilanço sonrası sürüklenme, "PEAD")
2) Yönetici alımları: Yöneticiler kendi hisselerini piyasadan aldıktan sonra hisse,
   piyasaya göre fazladan getiri sağlıyor mu?

Yöntem: piyasa modeli. Her olay için olaydan önceki dönemde hissenin endekse duyarlılığı (alfa, beta)
tahmin edilir; olay günlerindeki "anormal getiri" = gerçekleşen getiri − modelin beklediği getiri.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from .config import BENCHMARK

EST = (-250, -30)        # tahmin penceresi (işlem günü)
PATH = (-5, 40)          # grafik için olay çevresi


def _event_index(dates: pd.DatetimeIndex, d: str) -> int | None:
    """Olay tarihinin (ya da sonraki ilk işlem gününün) takvimdeki sırası."""
    i = dates.searchsorted(pd.Timestamp(d))
    return int(i) if i < len(dates) else None


def abnormal_path(r: pd.DataFrame, code: str, day: str, bench: str = BENCHMARK) -> pd.Series | None:
    """Tek olayın -5..+40 gün anormal getirileri (yüzde). Yetersiz veri varsa None."""
    if code not in r.columns:
        return None
    dates = r.index
    i = _event_index(dates, day)
    if i is None or i + EST[0] < 0 or i + PATH[1] >= len(dates):
        return None
    est = r.iloc[i + EST[0]: i + EST[1]][[code, bench]].dropna()
    if len(est) < 120:
        return None
    b, a = np.polyfit(est[bench], est[code], 1)
    win = r.iloc[i + PATH[0]: i + PATH[1] + 1]
    ar = (win[code] - (a + b * win[bench])) * 100
    ar.index = range(PATH[0], PATH[1] + 1)
    return ar if ar.notna().all() else None


def car(ar: pd.Series, a: int, b: int) -> float:
    """Kümülatif anormal getiri: a..b günleri toplamı."""
    return float(ar.loc[a:b].sum())


def _ttest(x: np.ndarray) -> dict:
    x = x[~np.isnan(x)]
    if len(x) < 3:
        return {"n": int(len(x)), "mean": None, "t": None, "p": None}
    t, p = stats.ttest_1samp(x, 0.0)
    se = x.std(ddof=1) / np.sqrt(len(x))
    return {"n": int(len(x)), "mean": float(x.mean()), "median": float(np.median(x)), "t": float(t), "p": float(p),
            "ci95": [float(x.mean() - 1.96 * se), float(x.mean() + 1.96 * se)], "hit": float((x > 0).mean() * 100)}


def earnings_study(r: pd.DataFrame, events: pd.DataFrame) -> dict:
    """events: code, date (8-K 2.02 'finansal sonuçlar' bildirimleri)."""
    rows, paths = [], {}
    for e in events.itertuples():
        ar = abnormal_path(r, e.code, e.date)
        if ar is None:
            continue
        rows.append({"code": e.code, "date": e.date, "react": car(ar, 0, 1), "drift": car(ar, 2, 40),
                     "abs_react": abs(car(ar, 0, 1)), "pre": car(ar, -5, -1)})
        paths[(e.code, e.date)] = ar
    df = pd.DataFrame(rows)
    if len(df) < 20:
        return {"n": len(df), "note": "Yeterli olay yok"}
    # H1: bilanço günleri normal günlerden daha mı oynak? Normal gün oynaklığı: tüm hisselerin ortalama |anormal getiri| değil,
    # basitçe aynı hisselerin rastgele iki günlük |getirisi| ile kıyas.
    base = (r.drop(columns=[BENCHMARK], errors="ignore").sub(r[BENCHMARK], axis=0).rolling(2).sum().abs() * 100)
    base_mean = float(np.nanmean(base[df["code"].unique()].values))
    # H2: tepki ile sürüklenme aynı yönde mi? Tepki dilimlerine göre (en kötü üçte bir / en iyi üçte bir)
    df["bucket"] = pd.qcut(df["react"], 3, labels=["olumsuz", "nötr", "olumlu"])
    g = {k: _ttest(v["drift"].to_numpy()) for k, v in df.groupby("bucket", observed=True)}
    up, dn = df[df.bucket == "olumlu"]["drift"], df[df.bucket == "olumsuz"]["drift"]
    t, p = stats.ttest_ind(up, dn, equal_var=False)
    rho, rp = stats.spearmanr(df["react"], df["drift"])
    avg_path = {k: pd.concat([paths[(x.code, x.date)] for x in v.itertuples()], axis=1).mean(axis=1).cumsum().round(3).tolist()
                for k, v in df.groupby("bucket", observed=True)}
    return {
        "n": int(len(df)), "companies": int(df["code"].nunique()),
        "period": [df["date"].min(), df["date"].max()],
        "abs_react_mean": float(df["abs_react"].mean()), "normal_2d_abs_mean": base_mean,
        "react_ratio": float(df["abs_react"].mean() / base_mean) if base_mean else None,
        "drift_by_bucket": g,
        "drift_spread": {"diff": float(up.mean() - dn.mean()), "t": float(t), "p": float(p)},
        "spearman": {"rho": float(rho), "p": float(rp)},
        "path_days": list(range(PATH[0], PATH[1] + 1)), "avg_path": avg_path,
        "biggest": df.reindex(df["abs_react"].sort_values(ascending=False).index).head(10)[["code", "date", "react", "drift"]].round(2).to_dict("records"),
    }


def insider_study(r: pd.DataFrame, trades: pd.DataFrame) -> dict:
    """trades: code, date, buy_usd, sell_usd, plan. Piyasadan alımlar ve plansız satışlar ayrı incelenir."""
    out = {}
    for name, sel in (("alim", trades["buy_usd"] > trades["sell_usd"]),
                      ("plansiz_satis", (trades["sell_usd"] > trades["buy_usd"]) & (trades["plan"] == 0))):
        ev = trades[sel].drop_duplicates(["code", "date"])
        res = []
        for e in ev.itertuples():
            ar = abnormal_path(r, e.code, e.date)
            if ar is not None:
                res.append({"code": e.code, "date": e.date, "car20": car(ar, 1, 20), "car40": car(ar, 1, 40)})
        df = pd.DataFrame(res)
        out[name] = {"car20": _ttest(df["car20"].to_numpy()) if len(df) else {"n": 0},
                     "car40": _ttest(df["car40"].to_numpy()) if len(df) else {"n": 0}}
    return out
