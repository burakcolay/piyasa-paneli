import numpy as np
import pandas as pd

from mi.clean import clean_one


def frame(closes, dates=None):
    n = len(closes)
    dates = dates or pd.bdate_range("2024-01-01", periods=n).strftime("%Y-%m-%d").tolist()
    return pd.DataFrame({"date": dates, "open": closes, "high": closes, "low": closes, "close": closes, "volume": [1] * n})


def test_duplicate_dates_keep_last():
    df = frame([10, 11, 12], ["2024-01-02", "2024-01-02", "2024-01-03"])
    out, q = clean_one(df)
    assert len(out) == 2 and out["close"].iloc[0] == 11 and q["dupes_or_bad_dates"] == 1


def test_non_positive_close_dropped():
    out, q = clean_one(frame([10, 0, -1, 12]))
    assert q["bad_close"] == 2 and (out["close"] > 0).all()


def test_single_day_spike_is_repaired():
    c = [100.0] * 10
    c[5] = 300.0                       # bir günlük hatalı fiyat
    out, q = clean_one(frame(c))
    assert q["spikes_fixed"] == 1
    assert abs(out["close"].iloc[5] - 100) < 1e-9


def test_real_jump_is_kept():
    c = [100.0] * 5 + [160.0] * 5      # kalıcı sıçrama (ör. satın alma haberi) hatalı sayılmamalı
    out, q = clean_one(frame(c))
    assert q["spikes_fixed"] == 0 and out["close"].iloc[-1] == 160
