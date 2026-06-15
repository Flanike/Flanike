"""Iteration 7 retest:
- list_imoveis robust against non-numeric `lado` values
- _refresh_quarteirao_totals deletes orphan QT docs when soma=0
- Idempotency: deleting an imovel from baseline QT keeps doc alive
- Regression on prior endpoints
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://auto-form-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _scrub_qt(qt: str):
    r = requests.get(f"{API}/imoveis", params={"quarteirao": qt})
    if r.status_code == 200:
        for im in r.json():
            log = im.get("logradouro", "") or ""
            if log.startswith("TEST_") or im.get("numero", "").startswith("TEST_"):
                requests.delete(f"{API}/imoveis/{im['id']}")


# --------- BUG #1 RETEST: non-numeric lado ----------
def test_list_imoveis_with_non_numeric_lado_returns_200():
    _scrub_qt("99")
    payload = {
        "quarteirao": "99", "lado": "P",
        "logradouro": "TEST_NON_NUMERIC_LADO",
        "numero": "1", "tipo_imovel": "R", "hab": 1,
    }
    c = requests.post(f"{API}/imoveis", json=payload)
    assert c.status_code == 200, c.text
    iid = c.json()["id"]

    try:
        # No filter — must not crash
        r = requests.get(f"{API}/imoveis")
        assert r.status_code == 200, f"GET /imoveis crashed with non-numeric lado: {r.status_code} {r.text[:200]}"
        ids = [x["id"] for x in r.json()]
        assert iid in ids

        # With filter
        r2 = requests.get(f"{API}/imoveis", params={"quarteirao": "99"})
        assert r2.status_code == 200, r2.text
    finally:
        requests.delete(f"{API}/imoveis/{iid}")


def test_list_imoveis_sort_numeric_before_non_numeric():
    _scrub_qt("99")
    # Create lado='2','P','1','A' in same QT
    ids = []
    for lado in ["2", "P", "1", "A"]:
        r = requests.post(f"{API}/imoveis", json={
            "quarteirao": "99", "lado": lado,
            "logradouro": f"TEST_SORT_{lado}",
            "numero": "1", "tipo_imovel": "R", "hab": 0,
        })
        assert r.status_code == 200
        ids.append(r.json()["id"])

    try:
        r = requests.get(f"{API}/imoveis", params={"quarteirao": "99"})
        assert r.status_code == 200
        lados = [im["lado"] for im in r.json()]
        # numeric first ordered by value, then non-numeric alphabetical
        assert lados == ["1", "2", "A", "P"], f"sort order wrong: {lados}"
    finally:
        for iid in ids:
            requests.delete(f"{API}/imoveis/{iid}")


# --------- BUG #2 RETEST: orphan QT deletion ----------
def test_deleting_all_imoveis_of_new_qt_removes_qt_doc():
    _scrub_qt("99")
    # Ensure no QT 99 in quarteiroes initially
    before = requests.get(f"{API}/quarteiroes").json()
    assert not any(q["quarteirao"] == "99" for q in before), "QT 99 should not pre-exist for this test"

    a = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_QT99_A",
        "numero": "1", "tipo_imovel": "R", "hab": 3,
    }).json()
    b = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_QT99_B",
        "numero": "2", "tipo_imovel": "C",
    }).json()

    # QT 99 must appear
    qts = requests.get(f"{API}/quarteiroes").json()
    qt99 = next((q for q in qts if q["quarteirao"] == "99"), None)
    assert qt99 is not None
    assert qt99["soma_imoveis"] == 2

    # Delete both
    requests.delete(f"{API}/imoveis/{a['id']}")
    requests.delete(f"{API}/imoveis/{b['id']}")

    # QT 99 must be GONE
    qts2 = requests.get(f"{API}/quarteiroes").json()
    qt99_after = next((q for q in qts2 if q["quarteirao"] == "99"), None)
    assert qt99_after is None, f"QT 99 should be removed, but doc still present: {qt99_after}"


def test_baseline_qt_idempotency_create_delete_keeps_doc():
    """Create + delete 1 imovel in baseline QT 1 — doc must continue to exist with prior totals."""
    qts_before = requests.get(f"{API}/quarteiroes").json()
    qt1_before = next((q for q in qts_before if q["quarteirao"] == "1"), None)
    assert qt1_before is not None, "Baseline QT 1 should exist"
    soma_before = qt1_before["soma_imoveis"]

    c = requests.post(f"{API}/imoveis", json={
        "quarteirao": "1", "lado": "1", "logradouro": "TEST_IDEMP_QT1",
        "numero": "999", "tipo_imovel": "R", "hab": 1,
    }).json()
    qts_mid = requests.get(f"{API}/quarteiroes").json()
    qt1_mid = next((q for q in qts_mid if q["quarteirao"] == "1"), None)
    assert qt1_mid["soma_imoveis"] == soma_before + 1

    d = requests.delete(f"{API}/imoveis/{c['id']}")
    assert d.status_code == 200

    qts_after = requests.get(f"{API}/quarteiroes").json()
    qt1_after = next((q for q in qts_after if q["quarteirao"] == "1"), None)
    assert qt1_after is not None, "Baseline QT 1 must remain"
    assert qt1_after["soma_imoveis"] == soma_before


# --------- Regression ----------
def test_regression_endpoints_still_200():
    for path in ["/forms", "/imoveis", "/imoveis/visited", "/quarteiroes", "/localidade", "/forms/stats/weekly"]:
        r = requests.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_no_orphan_quarteiroes_after_test_run():
    """At end, QT 99 (or any TEST_-prefixed) should NOT remain in /quarteiroes."""
    qts = requests.get(f"{API}/quarteiroes").json()
    assert not any(q["quarteirao"] == "99" for q in qts), "QT 99 leaked into quarteiroes"
