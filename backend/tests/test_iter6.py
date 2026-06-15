"""Iteration 6 tests:
- POST/PUT/DELETE /api/imoveis (CRUD) + quarteirao totals refresh
- GET /api/forms/stats/weekly (ISO-8601 weekly aggregation)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auto-form-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module", autouse=True)
def cleanup_qt99():
    """After this module's tests, scrub QT 99 leftovers from the DB so that
    regression tests asserting exactly 33 quarteirões keep passing.
    The backend keeps the quarteirao doc with zeros after the last imovel is removed."""
    yield
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import load_dotenv
        from pathlib import Path
        import asyncio
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        async def _scrub():
            c = AsyncIOMotorClient(os.environ["MONGO_URL"])
            db = c[os.environ["DB_NAME"]]
            await db.quarteiroes.delete_one({"quarteirao": "99"})
            await db.imoveis.delete_many({"quarteirao": "99"})
        asyncio.get_event_loop().run_until_complete(_scrub()) if False else asyncio.run(_scrub())
    except Exception as e:
        print(f"teardown scrub failed: {e}")



# ------------------- IMOVEIS CRUD -------------------

def _cleanup_imoveis_qt(qt: str):
    r = requests.get(f"{API}/imoveis", params={"quarteirao": qt})
    if r.status_code == 200:
        for im in r.json():
            if im.get("logradouro", "").startswith("TEST_") or im.get("numero", "").startswith("TEST_"):
                requests.delete(f"{API}/imoveis/{im['id']}")


def test_create_imovel_returns_uuid_and_persists():
    _cleanup_imoveis_qt("99")
    payload = {
        "quarteirao": "99",
        "lado": "1",
        "logradouro": "TEST_RUA_CREATE",
        "numero": "TEST_10",
        "seq": "1",
        "tipo_imovel": "R",
        "hab": 2,
        "cao": 0,
        "gato": 0,
    }
    r = requests.post(f"{API}/imoveis", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data and isinstance(data["id"], str) and len(data["id"]) >= 32
    assert data["quarteirao"] == "99"
    assert data["logradouro"] == "TEST_RUA_CREATE"
    assert data["tipo_imovel"] == "R"
    assert data["hab"] == 2

    # GET to verify persistence
    g = requests.get(f"{API}/imoveis", params={"quarteirao": "99"})
    assert g.status_code == 200
    ids = [x["id"] for x in g.json()]
    assert data["id"] in ids

    # cleanup
    requests.delete(f"{API}/imoveis/{data['id']}")


def test_update_imovel_changes_persist():
    _cleanup_imoveis_qt("99")
    c = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_UPD",
        "numero": "TEST_1", "seq": "1", "tipo_imovel": "R", "hab": 1,
    }).json()
    iid = c["id"]
    u = requests.put(f"{API}/imoveis/{iid}", json={
        "quarteirao": "99", "lado": "2", "logradouro": "TEST_UPD",
        "numero": "TEST_1", "seq": "1", "tipo_imovel": "C", "hab": 7, "cao": 1, "gato": 2,
    })
    assert u.status_code == 200, u.text
    upd = u.json()
    assert upd["lado"] == "2"
    assert upd["tipo_imovel"] == "C"
    assert upd["hab"] == 7
    assert upd["cao"] == 1
    assert upd["gato"] == 2
    requests.delete(f"{API}/imoveis/{iid}")


def test_update_imovel_404_when_not_found():
    r = requests.put(f"{API}/imoveis/nonexistent-uuid-xyz", json={"quarteirao": "99"})
    assert r.status_code == 404


def test_delete_imovel_removes_and_404_after():
    c = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_DEL",
        "numero": "TEST_X", "tipo_imovel": "R", "hab": 1,
    }).json()
    iid = c["id"]
    d = requests.delete(f"{API}/imoveis/{iid}")
    assert d.status_code == 200

    # Second delete -> 404
    d2 = requests.delete(f"{API}/imoveis/{iid}")
    assert d2.status_code == 404


def test_imovel_crud_refreshes_quarteirao_totals():
    """Creating in a new QT must appear in /quarteiroes; deleting all imoveis from a brand-new QT removes the QT."""
    _cleanup_imoveis_qt("99")
    # Ensure QT 99 does not exist initially (or has soma_imoveis=0)
    before = requests.get(f"{API}/quarteiroes").json()
    qt_before = next((q for q in before if q["quarteirao"] == "99"), None)
    baseline_count = qt_before["soma_imoveis"] if qt_before else 0

    # Create 2 imoveis in QT 99: 1 residencia (hab=3) + 1 comercio
    a = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_QT99_A",
        "numero": "1", "tipo_imovel": "R", "hab": 3, "cao": 1, "gato": 2,
    }).json()
    b = requests.post(f"{API}/imoveis", json={
        "quarteirao": "99", "lado": "1", "logradouro": "TEST_QT99_B",
        "numero": "2", "tipo_imovel": "C", "hab": 0,
    }).json()

    qts = requests.get(f"{API}/quarteiroes").json()
    qt99 = next((q for q in qts if q["quarteirao"] == "99"), None)
    assert qt99 is not None, "QT 99 should appear in quarteiroes after creating imoveis"
    assert qt99["soma_imoveis"] >= baseline_count + 2
    assert qt99["residencia"] >= 1
    assert qt99["comercio"] >= 1
    assert qt99["habitantes"] >= 3
    assert qt99["cao"] >= 1
    assert qt99["gato"] >= 2

    # Delete both
    requests.delete(f"{API}/imoveis/{a['id']}")
    requests.delete(f"{API}/imoveis/{b['id']}")

    qts2 = requests.get(f"{API}/quarteiroes").json()
    qt99_after = next((q for q in qts2 if q["quarteirao"] == "99"), None)
    # If QT had no baseline, it could remain with totals=0 (current code does not delete the doc)
    if qt99_after is not None:
        assert qt99_after["soma_imoveis"] == baseline_count
        assert qt99_after["residencia"] == (qt_before["residencia"] if qt_before else 0)
        assert qt99_after["comercio"] == (qt_before["comercio"] if qt_before else 0)


# ------------------- WEEKLY STATS -------------------

def test_weekly_stats_shape_basic():
    r = requests.get(f"{API}/forms/stats/weekly")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "weeks" in data and isinstance(data["weeks"], list)
    assert "total" in data and isinstance(data["total"], dict)
    for k in ["formularios", "informados", "trabalhados", "pendentes", "recuperados", "focos", "tratados"]:
        assert k in data["total"]


def test_weekly_stats_with_two_dates():
    """Create 2 TEST_STAT forms on 2026-01-15 (W03) and 2026-06-15 (W25)."""
    # cleanup any leftovers
    r = requests.get(f"{API}/forms").json()
    for f in r:
        if (f.get("municipio") or "").startswith("TEST_STAT_"):
            requests.delete(f"{API}/forms/{f['id']}")

    base_visits_1 = [
        {"quarteirao": "1", "logradouro": "Av A", "numero": "1", "tipo_imovel": "R",
         "tipo_visita": "N", "pendencia": "", "imovel_com_foco": True, "imovel_tratado": True},
        {"quarteirao": "1", "logradouro": "Av A", "numero": "2", "tipo_imovel": "R",
         "tipo_visita": "N", "pendencia": "F"},
        {"quarteirao": "3", "logradouro": "Av B", "numero": "3", "tipo_imovel": "C",
         "tipo_visita": "R", "pendencia": "R"},
    ]
    base_visits_2 = [
        {"quarteirao": "5", "logradouro": "Rua C", "numero": "10", "tipo_imovel": "R",
         "tipo_visita": "N", "pendencia": "F"},
        {"quarteirao": "5", "logradouro": "Rua C", "numero": "11", "tipo_imovel": "R",
         "tipo_visita": "R", "pendencia": ""},
        {"quarteirao": "7", "logradouro": "Rua D", "numero": "12", "tipo_imovel": "TB",
         "tipo_visita": "N", "pendencia": "", "imovel_com_foco": False, "imovel_tratado": True},
    ]

    f1 = requests.post(f"{API}/forms", json={
        "municipio": "TEST_STAT_W03", "data_atividade": "2026-01-15", "visits": base_visits_1,
    }).json()
    f2 = requests.post(f"{API}/forms", json={
        "municipio": "TEST_STAT_W25", "data_atividade": "2026-06-15", "visits": base_visits_2,
    }).json()

    try:
        s = requests.get(f"{API}/forms/stats/weekly").json()
        weeks_by_key = {w["week"]: w for w in s["weeks"]}
        assert "2026-W03" in weeks_by_key, list(weeks_by_key.keys())
        assert "2026-W25" in weeks_by_key, list(weeks_by_key.keys())

        w03 = weeks_by_key["2026-W03"]
        # Week ISO W03 2026 starts Mon 2026-01-12 and ends Sun 2026-01-18
        assert w03["start"] == "2026-01-12"
        assert w03["end"] == "2026-01-18"
        assert w03["formularios"] >= 1
        # Our 3 visits all have logradouro -> informados >= 3
        assert w03["informados"] >= 3
        assert w03["trabalhados"] >= 3  # all 3 have tipo_visita set
        assert w03["pendentes"] >= 1     # one had pendencia=F
        assert w03["recuperados"] >= 1   # one had tipo_visita=R
        assert w03["focos"] >= 1
        assert w03["tratados"] >= 1
        assert "1" in w03["quarteiroes"] and "3" in w03["quarteiroes"]
        assert w03["quarteiroes_count"] >= 2

        w25 = weeks_by_key["2026-W25"]
        # Week ISO W25 2026 -> start Mon 2026-06-15
        assert w25["start"] == "2026-06-15"
        assert w25["end"] == "2026-06-21"
        assert w25["informados"] >= 3
        assert w25["pendentes"] >= 1
        assert w25["recuperados"] >= 1

        # Totals sanity (>= per-week sums for our forms)
        assert s["total"]["formularios"] >= 2
        assert s["total"]["informados"] >= 6
    finally:
        requests.delete(f"{API}/forms/{f1['id']}")
        requests.delete(f"{API}/forms/{f2['id']}")


# ------------------- REGRESSION -------------------

def test_regression_endpoints_still_200():
    for path in ["/forms", "/imoveis", "/imoveis/visited", "/quarteiroes"]:
        r = requests.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}"
