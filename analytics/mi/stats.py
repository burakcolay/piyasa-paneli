"""Risk ve ilişki istatistikleri: oynaklık, beta, düşüş, korelasyon, olağandışı günler.

Fonksiyonlar saf (DataFrame alır, DataFrame/dict döner); testleri bu yüzden kolay.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import BENCHMARK, TRADING_DAYS

# Getiri yerine fark kullanılan seriler (faiz seviyesi: yüzde puan değişimi anlamlı)
LEVEL_SERIES = {"US10Y", "VIX"}


def wide(prices: pd.DataFrame, col: str = "close") -> pd.DataFrame:
    """Uzun tabloyu (code, date, ...) tarih x varlık geniş tabloya çevirir."""
    w = prices.pivot(index="date", columns="code", values=col).sort_index()
    w.index = pd.to_datetime(w.index)
    return w


def returns(close: pd.DataFrame) -> pd.DataFrame:
    """Günlük getiri; faiz ve VIX için seviye farkı."""
    r = close.pct_change(fill_method=None)
    for c in LEVEL_SERIES & set(close.columns):
        r[c] = close[c].diff()
    return r


def volatility(r: pd.DataFrame) -> pd.DataFrame:
    """Yıllıklandırılmış oynaklık (%): 1 ay, 3 ay, 1 yıl ve bugünkü 1 aylık oynaklığın kendi geçmişindeki yüzdelik dilimi."""
    ann = np.sqrt(TRADING_DAYS) * 100
    v21 = r.rolling(21).std() * ann
    out = pd.DataFrame({
        "vol_1m": v21.iloc[-1],
        "vol_3m": r.iloc[-63:].std() * ann,
        "vol_1y": r.iloc[-252:].std() * ann,
        "vol_pctile": v21.rank(pct=True).iloc[-1] * 100,   # 100 = son 5 yılın en oynak dönemi
    })
    return out.drop(index=[c for c in LEVEL_SERIES if c in out.index])


def beta(r: pd.DataFrame, bench: str = BENCHMARK, window: int = 252) -> pd.Series:
    """Son `window` günde her varlığın referans endekse duyarlılığı: cov(r_i, r_m) / var(r_m)."""
    x = r.iloc[-window:]
    m = x[bench]
    b = x.apply(lambda s: s.cov(m) / m.var() if s.notna().sum() > window * 0.8 else np.nan)
    return b.drop(index=[c for c in LEVEL_SERIES if c in b.index])


def drawdown(close: pd.DataFrame) -> pd.DataFrame:
    """Her gün için zirveden uzaklık (%)."""
    return (close / close.cummax() - 1) * 100


def corr_matrix(r: pd.DataFrame, codes: list[str], window: int) -> pd.DataFrame:
    """Son `window` günün korelasyon matrisi."""
    return r[codes].iloc[-window:].corr()


def rolling_corr(r: pd.DataFrame, a: str, b: str, window: int = 63) -> pd.Series:
    """İki varlık arasındaki ilişkinin zaman içindeki değişimi."""
    return r[a].rolling(window).corr(r[b])


def anomalies(r: pd.DataFrame, volume: pd.DataFrame, lookback: int = 63, z: float = 3.0, days: int = 10) -> pd.DataFrame:
    """Son `days` günde getirisi ya da hacmi kendi normalinden `z` standart sapma uzak olan günler.

    Normal, o günden önceki `lookback` güne göre hesaplanır (o gün dahil edilmez, aksi halde aykırı değer kendi ölçüsünü şişirir).
    """
    mu = r.rolling(lookback).mean().shift(1)
    sd = r.rolling(lookback).std().shift(1)
    zr = (r - mu) / sd
    lv = np.log(volume.replace(0, np.nan))
    zv = (lv - lv.rolling(lookback).mean().shift(1)) / lv.rolling(lookback).std().shift(1)
    rows = []
    for d in r.index[-days:]:
        for c in r.columns:
            a, b = zr.at[d, c], zv.at[d, c] if c in zv.columns else np.nan
            if (pd.notna(a) and abs(a) >= z) or (pd.notna(b) and b >= z):
                rows.append({"date": d.strftime("%Y-%m-%d"), "code": c, "ret": r.at[d, c] * (1 if c in LEVEL_SERIES else 100),
                             "z_ret": a, "z_vol": b})
    return pd.DataFrame(rows, columns=["date", "code", "ret", "z_ret", "z_vol"])


def regime(r: pd.DataFrame, close: pd.DataFrame, bench: str = BENCHMARK) -> dict:
    """Piyasa rejimi: endeksin 1 aylık oynaklığı uzun dönem ortancasına göre ve trend (200 günlük ortalamaya göre)."""
    v = r[bench].rolling(21).std() * np.sqrt(TRADING_DAYS) * 100
    ma200 = close[bench].rolling(200).mean()
    cur, med = v.iloc[-1], v.median()
    trend = "yükseliş" if close[bench].iloc[-1] > ma200.iloc[-1] else "düşüş"
    level = "yüksek" if cur > med * 1.3 else "düşük" if cur < med * 0.8 else "normal"
    return {"vol_now": float(cur), "vol_median": float(med), "vol_level": level, "trend": trend,
            "dist_ma200": float((close[bench].iloc[-1] / ma200.iloc[-1] - 1) * 100)}
