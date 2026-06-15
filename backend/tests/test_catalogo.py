"""Tests for the Catálogo endpoints (Localidade, Quarteirões, Imóveis)
populated from the RESUMO 3º CICLO.xlsx spreadsheet."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auto-form-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def test_localidade_returns_santa_cruz():
    r = requests.get(f"{API}/localidade")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data is not None
    assert data["municipio_nome"] == "SANTA CRUZ"
    assert data["localidade_nome"] == "CONJUNTO ALUÍZIO BEZERRA/BAIRRO"
    assert data["uf"] == "RN"
    assert data["zona"] == "14"
    assert "id" in data


def test_quarteiroes_returns_33_in_numeric_order():
    r = requests.get(f"{API}/quarteiroes")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 33, f"Expected 33 quarteirões, got {len(data)}"
    # numeric ordering
    nums = [int(q["quarteirao"]) for q in data]
    assert nums == sorted(nums)
    assert nums[0] == 1 and nums[-1] == 33

    # required fields
    qt1 = data[0]
    for field in ["quarteirao", "residencia", "comercio", "outros", "terreno_baldio",
                  "soma_imoveis", "habitantes", "cao", "gato"]:
        assert field in qt1, f"missing field {field} in {qt1}"
    # QT1 has 45 imóveis total
    assert qt1["soma_imoveis"] == 45


def test_imoveis_no_filter_returns_988():
    r = requests.get(f"{API}/imoveis")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 988, f"Expected 988 imóveis, got {len(data)}"
    # field shape
    im = data[0]
    for field in ["id", "quarteirao", "lado", "logradouro", "numero", "seq", "tipo_imovel", "hab", "cao", "gato"]:
        assert field in im
    # id is UUID-like string
    assert isinstance(im["id"], str) and len(im["id"]) >= 32
    # numeric fields are int
    assert isinstance(im["hab"], int)
    assert isinstance(im["cao"], int)
    assert isinstance(im["gato"], int)


def test_imoveis_filter_by_quarteirao_1_returns_45():
    r = requests.get(f"{API}/imoveis", params={"quarteirao": "1"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 45, f"Expected 45 imóveis for QT1, got {len(data)}"
    assert all(i["quarteirao"] == "1" for i in data)


def test_imoveis_filter_by_quarteirao_and_lado():
    r = requests.get(f"{API}/imoveis", params={"quarteirao": "1", "lado": "1"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert all(i["quarteirao"] == "1" and i["lado"] == "1" for i in data)


def test_imoveis_text_search_maria_case_insensitive():
    r = requests.get(f"{API}/imoveis", params={"q": "MARIA"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert all("maria" in i["logradouro"].lower() or "maria" in str(i.get("numero", "")).lower() for i in data)

    # case-insensitive: lowercase yields same count
    r2 = requests.get(f"{API}/imoveis", params={"q": "maria"})
    assert r2.status_code == 200
    assert len(r2.json()) == len(data)


def test_imoveis_filter_unknown_quarteirao_returns_empty():
    r = requests.get(f"{API}/imoveis", params={"quarteirao": "99"})
    assert r.status_code == 200
    assert r.json() == []


def test_tipo_imovel_values_valid():
    """Allowed types: R, C, TB, O, PE, ''"""
    r = requests.get(f"{API}/imoveis", params={"quarteirao": "1"})
    assert r.status_code == 200
    valid = {"R", "C", "TB", "O", "PE", ""}
    for im in r.json():
        assert im["tipo_imovel"] in valid, f"unexpected tipo {im['tipo_imovel']!r}"


def test_forms_endpoint_still_works_regression():
    """Sanity check: D1 forms endpoints unaffected by catálogo addition."""
    r = requests.get(f"{API}/forms")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_no_mongo_id_leak_in_catalog():
    for path in ["/localidade", "/quarteiroes", "/imoveis?quarteirao=1"]:
        r = requests.get(f"{API}{path}")
        assert r.status_code == 200
        data = r.json()
        if isinstance(data, list):
            for d in data:
                assert "_id" not in d, f"_id leaked in {path}"
        elif isinstance(data, dict):
            assert "_id" not in data, f"_id leaked in {path}"
