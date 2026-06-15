import os
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auto-form-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def test_list_forms_initial():
    r = requests.get(f"{API}/forms")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_full_crud_lifecycle():
    # CREATE with partial payload mimicking cleanPayload from frontend
    payload = {
        "municipio": "TEST_241120 - SANTA CRUZ",
        "localidade": "TEST_246 - Conjunto",
        "atividade": "2",
        "folha": "1/1",
        "data_atividade": "2026-01-15",
        "depositos_eliminados": {"a1": 0, "a2": 0, "b": 0, "c": 0, "d1": 0, "d2": 0, "e": 0},
        "depositos_tratados": {"tipo": "", "quantidade": None, "qtde_dep_trat": None},
        "visits": [{"depositos_eliminados": None, "larvicida_quantidade": None, "qtde_dep_tratados": None} for _ in range(5)],
    }
    r = requests.post(f"{API}/forms", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    fid = data["id"]
    assert len(data["visits"]) == 20, f"Expected 20 visits, got {len(data['visits'])}"
    assert "created_at" in data and "updated_at" in data
    # Validate ISO datetime
    datetime.fromisoformat(data["created_at"])
    datetime.fromisoformat(data["updated_at"])
    assert data["municipio"] == payload["municipio"]

    # GET by id
    r2 = requests.get(f"{API}/forms/{fid}")
    assert r2.status_code == 200
    g = r2.json()
    assert g["municipio"] == payload["municipio"]
    assert g["atividade"] == "2"
    assert "_id" not in g  # no ObjectId leak

    # GET non-existent
    r3 = requests.get(f"{API}/forms/nonexistent-id-xyz")
    assert r3.status_code == 404

    # PUT update with filled visits
    g["municipio"] = "TEST_UPDATED MUNICIPIO"
    g["visits"][0]["logradouro"] = "Rua Teste 1"
    g["visits"][0]["numero"] = "123"
    g["visits"][0]["tipo_imovel"] = "R"
    g["visits"][5]["logradouro"] = "Rua Teste 2"
    g["visits"][5]["tipo_imovel"] = "C"
    g["depositos_eliminados"]["a1"] = 3
    g["depositos_eliminados"]["b"] = 5
    r4 = requests.put(f"{API}/forms/{fid}", json=g)
    assert r4.status_code == 200, r4.text
    upd = r4.json()
    assert upd["municipio"] == "TEST_UPDATED MUNICIPIO"
    assert upd["depositos_eliminados"]["a1"] == 3
    # updated_at must be >= created_at
    assert datetime.fromisoformat(upd["updated_at"]) >= datetime.fromisoformat(upd["created_at"])

    # GET verifies persistence
    r5 = requests.get(f"{API}/forms/{fid}")
    assert r5.status_code == 200
    f5 = r5.json()
    assert f5["visits"][0]["logradouro"] == "Rua Teste 1"
    assert f5["visits"][5]["tipo_imovel"] == "C"

    # LIST returns D1FormSummary with total_visitas counting only filled visits (visit 0 and 5)
    r6 = requests.get(f"{API}/forms")
    assert r6.status_code == 200
    summaries = r6.json()
    summary = next((s for s in summaries if s["id"] == fid), None)
    assert summary is not None
    assert summary["total_visitas"] == 2, f"Expected 2 filled visits, got {summary['total_visitas']}"
    assert summary["municipio"] == "TEST_UPDATED MUNICIPIO"

    # PUT non-existent
    r7 = requests.put(f"{API}/forms/nonexistent-xyz", json=g)
    assert r7.status_code == 404

    # DELETE
    r8 = requests.delete(f"{API}/forms/{fid}")
    assert r8.status_code == 200

    # GET after delete -> 404
    r9 = requests.get(f"{API}/forms/{fid}")
    assert r9.status_code == 404

    # DELETE non-existent
    r10 = requests.delete(f"{API}/forms/nonexistent-xyz")
    assert r10.status_code == 404


def test_create_empty_payload_pads_to_20_visits():
    r = requests.post(f"{API}/forms", json={})
    assert r.status_code == 200
    data = r.json()
    assert len(data["visits"]) == 20
    fid = data["id"]
    # cleanup
    requests.delete(f"{API}/forms/{fid}")


def test_create_accepts_null_numerics_in_visit():
    # Simulates cleanPayload: empty strings converted to null
    payload = {
        "visits": [{"depositos_eliminados": None, "larvicida_quantidade": None, "qtde_dep_tratados": None}],
    }
    r = requests.post(f"{API}/forms", json=payload)
    assert r.status_code == 200, r.text
    fid = r.json()["id"]
    requests.delete(f"{API}/forms/{fid}")
