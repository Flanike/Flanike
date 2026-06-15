"""Tests for GET /api/imoveis/visited — visited imoveis keys aggregation."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auto-form-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _cleanup_test_forms():
    """Delete any TEST_-prefixed forms that may linger."""
    r = requests.get(f"{API}/forms")
    if r.status_code == 200:
        for f in r.json():
            if (f.get("municipio") or "").startswith("TEST_VIS_"):
                requests.delete(f"{API}/forms/{f['id']}")


def test_visited_endpoint_shape_no_data():
    """Endpoint must return {keys: [...], count: N} structure."""
    _cleanup_test_forms()
    r = requests.get(f"{API}/imoveis/visited")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "keys" in data
    assert "count" in data
    assert isinstance(data["keys"], list)
    assert isinstance(data["count"], int)
    assert data["count"] == len(data["keys"])


def test_visited_includes_new_form_visits():
    """Creating a form with 2 visits should add 2 keys; deleting removes them."""
    _cleanup_test_forms()
    baseline = requests.get(f"{API}/imoveis/visited").json()
    baseline_keys = set(baseline["keys"])

    payload = {
        "municipio": "TEST_VIS_MUN",
        "visits": [
            {"quarteirao": "1", "logradouro": "Rua X", "numero": "10"},
            {"quarteirao": "5", "logradouro": "Av Y", "numero": "200"},
        ],
    }
    r = requests.post(f"{API}/forms", json=payload)
    assert r.status_code == 200, r.text
    fid = r.json()["id"]

    r2 = requests.get(f"{API}/imoveis/visited")
    assert r2.status_code == 200
    data = r2.json()
    keys = set(data["keys"])
    expected_new = {"1|rua x|10", "5|av y|200"}
    # The two new keys must be present
    assert expected_new.issubset(keys), f"Expected {expected_new} ⊆ {keys - baseline_keys}"
    # count consistency
    assert data["count"] == len(data["keys"])

    # DELETE form → keys disappear (unless another form references same key)
    r3 = requests.delete(f"{API}/forms/{fid}")
    assert r3.status_code == 200
    after = requests.get(f"{API}/imoveis/visited").json()
    after_keys = set(after["keys"])
    for k in expected_new:
        if k not in baseline_keys:
            assert k not in after_keys, f"Key {k} should be removed after form deletion"


def test_visited_ignores_empty_visits():
    """Visits without logradouro and without numero must not produce keys."""
    _cleanup_test_forms()
    baseline = requests.get(f"{API}/imoveis/visited").json()
    baseline_count = baseline["count"]

    payload = {
        "municipio": "TEST_VIS_EMPTY",
        "visits": [
            {"quarteirao": "9", "logradouro": "", "numero": ""},
            {"quarteirao": "9", "tipo_imovel": "R"},  # no log/num
        ],
    }
    r = requests.post(f"{API}/forms", json=payload)
    assert r.status_code == 200
    fid = r.json()["id"]

    after = requests.get(f"{API}/imoveis/visited").json()
    # No new keys added
    assert after["count"] == baseline_count
    requests.delete(f"{API}/forms/{fid}")


def test_visited_lowercases_logradouro_and_numero():
    """Keys must be lowercased on logradouro and numero."""
    _cleanup_test_forms()
    payload = {
        "municipio": "TEST_VIS_CASE",
        "visits": [{"quarteirao": "2", "logradouro": "RUA UPPER", "numero": "ABC-12"}],
    }
    r = requests.post(f"{API}/forms", json=payload)
    fid = r.json()["id"]
    try:
        data = requests.get(f"{API}/imoveis/visited").json()
        assert "2|rua upper|abc-12" in data["keys"]
    finally:
        requests.delete(f"{API}/forms/{fid}")


def test_visited_only_numero_no_logradouro():
    """Visit with only numero (no logradouro) should still produce a key."""
    _cleanup_test_forms()
    payload = {
        "municipio": "TEST_VIS_NUMONLY",
        "visits": [{"quarteirao": "3", "logradouro": "", "numero": "777"}],
    }
    r = requests.post(f"{API}/forms", json=payload)
    fid = r.json()["id"]
    try:
        data = requests.get(f"{API}/imoveis/visited").json()
        assert "3||777" in data["keys"]
    finally:
        requests.delete(f"{API}/forms/{fid}")
