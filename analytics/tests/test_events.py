import numpy as np
import pandas as pd

from mi import events as ev


def market(n=600, seed=3):
    rng = np.random.default_rng(seed)
    d = pd.bdate_range("2022-01-03", periods=n)
    m = rng.normal(0.0005, 0.01, n)
    x = 1.5 * m + rng.normal(0, 0.005, n)
    return pd.DataFrame({"NDX": m, "X": x}, index=d)


def test_abnormal_return_isolates_event_shock():
    r = market()
    day = r.index[400]
    r.loc[day, "X"] += 0.08                                  # olay günü %8 sürpriz
    ar = ev.abnormal_path(r, "X", day.strftime("%Y-%m-%d"))
    assert ar is not None and 7 < ar.loc[0] < 9              # model beklenen kısmı çıkarır
    assert abs(ar.drop(index=0).mean()) < 0.5                 # diğer günler gürültü


def test_event_too_close_to_edges_is_skipped():
    r = market()
    assert ev.abnormal_path(r, "X", r.index[10].strftime("%Y-%m-%d")) is None
    assert ev.abnormal_path(r, "X", r.index[-5].strftime("%Y-%m-%d")) is None


def test_car_sums_window():
    ar = pd.Series([1.0, 2.0, 3.0], index=[0, 1, 2])
    assert ev.car(ar, 0, 1) == 3.0
