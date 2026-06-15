from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="PNCD D1 - Resumo Diário")
api_router = APIRouter(prefix="/api")


# ===== Models =====
class Visit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    quarteirao: str = ""
    sequencia: str = ""
    lado: str = ""
    logradouro: str = ""
    numero: str = ""
    seq_numero: str = ""
    complemento: str = ""
    tipo_imovel: str = ""  # R / C / TB / PE / O
    hora_entrada: str = ""
    tipo_visita: str = ""  # N / R / Rec
    pendencia: str = ""    # F / R / Rec
    depositos_eliminados: Optional[int] = None
    imovel_com_foco: bool = False
    imovel_tratado: bool = False
    larvicida_tipo: str = ""
    larvicida_quantidade: Optional[float] = None
    qtde_dep_tratados: Optional[int] = None


class DepositCounts(BaseModel):
    model_config = ConfigDict(extra="ignore")
    a1: int = 0
    a2: int = 0
    b: int = 0
    c: int = 0
    d1: int = 0
    d2: int = 0
    e: int = 0


class DepositTreated(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tipo: str = ""
    quantidade: Optional[float] = None
    qtde_dep_trat: Optional[int] = None


class D1FormBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    municipio: str = ""
    localidade: str = ""
    categoria: str = ""
    zona: str = ""
    tipo: str = ""
    folha: str = ""
    data_atividade: str = ""  # YYYY-MM-DD
    atividade: str = ""  # 1..6
    quarteiroes_trabalhados: str = ""
    quarteiroes_concluidos: str = ""
    visits: List[Visit] = Field(default_factory=lambda: [Visit() for _ in range(20)])
    depositos_eliminados: DepositCounts = Field(default_factory=DepositCounts)
    depositos_tratados: DepositTreated = Field(default_factory=DepositTreated)
    casas_fechadas: int = 0
    recuperadas: int = 0
    informados: int = 0
    assinatura_agente: str = ""
    assinatura_supervisor: str = ""


class D1Form(D1FormBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class D1FormSummary(BaseModel):
    id: str
    municipio: str
    localidade: str
    data_atividade: str
    atividade: str
    folha: str
    total_visitas: int
    focos: int = 0
    created_at: datetime
    updated_at: datetime


class Imovel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quarteirao: str = ""
    lado: str = ""
    logradouro: str = ""
    numero: str = ""
    seq: str = ""
    tipo_imovel: str = ""
    hab: int = 0
    cao: int = 0
    gato: int = 0


class ImovelInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    quarteirao: str = ""
    lado: str = ""
    logradouro: str = ""
    numero: str = ""
    seq: str = ""
    tipo_imovel: str = ""
    hab: int = 0
    cao: int = 0
    gato: int = 0


class Quarteirao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quarteirao: str
    residencia: int = 0
    comercio: int = 0
    outros: int = 0
    terreno_baldio: int = 0
    soma_predios: int = 0
    soma_imoveis: int = 0
    habitantes: int = 0
    cao: int = 0
    gato: int = 0


class Localidade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    uf: str = ""
    municipio_codigo: str = ""
    municipio_nome: str = ""
    localidade_codigo: str = ""
    localidade_nome: str = ""
    zona: str = ""


def serialize_form(form: D1Form) -> dict:
    doc = form.model_dump()
    doc['created_at'] = doc['created_at'].isoformat() if isinstance(doc['created_at'], datetime) else doc['created_at']
    doc['updated_at'] = doc['updated_at'].isoformat() if isinstance(doc['updated_at'], datetime) else doc['updated_at']
    return doc


def deserialize_form(doc: dict) -> dict:
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if isinstance(doc.get('updated_at'), str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    return doc


def count_visits(visits: List[dict]) -> int:
    """Count visits with any meaningful data filled."""
    count = 0
    for v in visits:
        # Consider a visit "filled" if it has logradouro or numero or tipo_imovel
        if v.get('logradouro') or v.get('numero') or v.get('tipo_imovel'):
            count += 1
    return count


def count_focos(visits: List[dict]) -> int:
    return sum(1 for v in visits if v.get('imovel_com_foco'))


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "PNCD D1 API"}


@api_router.get("/forms", response_model=List[D1FormSummary])
async def list_forms():
    forms = await db.d1_forms.find({}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    summaries = []
    for f in forms:
        f = deserialize_form(f)
        summaries.append(D1FormSummary(
            id=f['id'],
            municipio=f.get('municipio', ''),
            localidade=f.get('localidade', ''),
            data_atividade=f.get('data_atividade', ''),
            atividade=f.get('atividade', ''),
            folha=f.get('folha', ''),
            total_visitas=count_visits(f.get('visits', [])),
            focos=count_focos(f.get('visits', [])),
            created_at=f['created_at'],
            updated_at=f['updated_at'],
        ))
    return summaries


@api_router.post("/forms", response_model=D1Form)
async def create_form(payload: D1FormBase):
    # Ensure 20 fixed rows
    visits = payload.visits or []
    while len(visits) < 20:
        visits.append(Visit())
    visits = visits[:20]
    payload_dict = payload.model_dump()
    payload_dict['visits'] = [v.model_dump() if isinstance(v, BaseModel) else v for v in visits]
    form = D1Form(**payload_dict)
    await db.d1_forms.insert_one(serialize_form(form))
    return form


@api_router.get("/forms/{form_id}", response_model=D1Form)
async def get_form(form_id: str):
    doc = await db.d1_forms.find_one({"id": form_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")
    doc = deserialize_form(doc)
    return D1Form(**doc)


@api_router.put("/forms/{form_id}", response_model=D1Form)
async def update_form(form_id: str, payload: D1FormBase):
    existing = await db.d1_forms.find_one({"id": form_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")
    existing = deserialize_form(existing)

    visits = payload.visits or []
    while len(visits) < 20:
        visits.append(Visit())
    visits = visits[:20]

    update_data = payload.model_dump()
    update_data['visits'] = [v.model_dump() if isinstance(v, BaseModel) else v for v in visits]
    update_data['id'] = form_id
    update_data['created_at'] = existing['created_at']
    update_data['updated_at'] = datetime.now(timezone.utc)

    form = D1Form(**update_data)
    await db.d1_forms.replace_one({"id": form_id}, serialize_form(form))
    return form


@api_router.delete("/forms/{form_id}")
async def delete_form(form_id: str):
    result = await db.d1_forms.delete_one({"id": form_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")
    return {"ok": True}


# ===== Catálogo (da planilha base) =====

@api_router.get("/localidade", response_model=Optional[Localidade])
async def get_localidade():
    doc = await db.localidade.find_one({}, {"_id": 0})
    if not doc:
        return None
    return Localidade(**doc)


@api_router.get("/quarteiroes", response_model=List[Quarteirao])
async def list_quarteiroes():
    docs = await db.quarteiroes.find({}, {"_id": 0}).to_list(1000)
    # ordena numericamente
    docs.sort(key=lambda d: int(d.get("quarteirao", "0") or 0))
    return [Quarteirao(**d) for d in docs]


@api_router.get("/imoveis/visited")
async def list_visited_keys():
    """Retorna conjunto de chaves quarteirao|logradouro|numero que já foram visitadas
    em algum formulário salvo. Útil para marcar imóveis no catálogo."""
    forms = await db.d1_forms.find({}, {"_id": 0, "visits": 1}).to_list(5000)
    keys = set()
    for f in forms:
        for v in (f.get("visits") or []):
            qt = (v.get("quarteirao") or "").strip()
            log = (v.get("logradouro") or "").strip().lower()
            num = str(v.get("numero") or "").strip().lower()
            if log or num:
                keys.add(f"{qt}|{log}|{num}")
    return {"keys": sorted(keys), "count": len(keys)}


@api_router.get("/imoveis/count")
async def count_imoveis(quarteirao: Optional[str] = None):
    query: dict = {}
    if quarteirao:
        query["quarteirao"] = str(quarteirao)
    total = await db.imoveis.count_documents(query)
    return {"total": total}


@api_router.get("/imoveis", response_model=List[Imovel])
async def list_imoveis(quarteirao: Optional[str] = None, lado: Optional[str] = None, q: Optional[str] = None):
    """Lista imóveis cadastrados (da planilha base).

    - quarteirao: filtra por nº de quarteirão (ex: "1")
    - lado: filtra por lado dentro do quarteirão
    - q: busca textual em logradouro/numero
    """
    query: dict = {}
    if quarteirao:
        query["quarteirao"] = str(quarteirao)
    if lado:
        query["lado"] = str(lado)
    if q:
        query["$or"] = [
            {"logradouro": {"$regex": q, "$options": "i"}},
            {"numero": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.imoveis.find(query, {"_id": 0}).to_list(5000)
    # ordena por lado (numérico se possível) e logradouro
    def _lado_key(d):
        v = str(d.get("lado", "") or "")
        if v.isdigit():
            return (0, int(v), "")
        return (1, 0, v)
    docs.sort(key=lambda d: (_lado_key(d), d.get("logradouro", ""), d.get("numero", "")))
    return [Imovel(**d) for d in docs]


@api_router.post("/imoveis", response_model=Imovel)
async def create_imovel(payload: ImovelInput):
    imovel = Imovel(**payload.model_dump())
    await db.imoveis.insert_one(imovel.model_dump())
    # Atualiza contagem agregada do quarteirão correspondente, se existir
    await _refresh_quarteirao_totals(imovel.quarteirao)
    return imovel


@api_router.put("/imoveis/{imovel_id}", response_model=Imovel)
async def update_imovel(imovel_id: str, payload: ImovelInput):
    existing = await db.imoveis.find_one({"id": imovel_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    old_qt = existing.get("quarteirao", "")
    data = payload.model_dump()
    data["id"] = imovel_id
    await db.imoveis.replace_one({"id": imovel_id}, data)
    await _refresh_quarteirao_totals(old_qt)
    if data.get("quarteirao") and data.get("quarteirao") != old_qt:
        await _refresh_quarteirao_totals(data["quarteirao"])
    return Imovel(**data)


@api_router.delete("/imoveis/{imovel_id}")
async def delete_imovel(imovel_id: str):
    doc = await db.imoveis.find_one({"id": imovel_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    await db.imoveis.delete_one({"id": imovel_id})
    await _refresh_quarteirao_totals(doc.get("quarteirao", ""))
    return {"ok": True}


async def _refresh_quarteirao_totals(quarteirao: str):
    """Recalcula somatórios da coleção 'quarteiroes' para um QT específico."""
    if not quarteirao:
        return
    imoveis = await db.imoveis.find({"quarteirao": str(quarteirao)}, {"_id": 0}).to_list(5000)
    totals = {
        "residencia": sum(1 for i in imoveis if i.get("tipo_imovel") == "R"),
        "comercio": sum(1 for i in imoveis if i.get("tipo_imovel") == "C"),
        "outros": sum(1 for i in imoveis if i.get("tipo_imovel") == "O"),
        "terreno_baldio": sum(1 for i in imoveis if i.get("tipo_imovel") == "TB"),
        "soma_imoveis": len(imoveis),
        "soma_predios": sum(1 for i in imoveis if i.get("tipo_imovel") in {"R", "C", "O"}),
        "habitantes": sum(int(i.get("hab") or 0) for i in imoveis),
        "cao": sum(int(i.get("cao") or 0) for i in imoveis),
        "gato": sum(int(i.get("gato") or 0) for i in imoveis),
    }
    existing = await db.quarteiroes.find_one({"quarteirao": str(quarteirao)}, {"_id": 0})
    if totals["soma_imoveis"] == 0:
        # nenhum imóvel restante — remove doc do agregado
        if existing:
            await db.quarteiroes.delete_one({"quarteirao": str(quarteirao)})
        return
    if existing:
        await db.quarteiroes.update_one(
            {"quarteirao": str(quarteirao)},
            {"$set": totals},
        )
    else:
        await db.quarteiroes.insert_one(
            {"id": str(uuid.uuid4()), "quarteirao": str(quarteirao), **totals}
        )


# ===== Estatística semanal =====

@api_router.get("/forms/stats/weekly")
async def stats_weekly():
    """Resumo semanal dos formulários (similar à aba RESUMO da planilha).

    Regra de Quarteirão Concluído: um QT só é considerado concluído quando TODOS
    os imóveis cadastrados naquele quarteirão foram visitados em algum
    formulário. O QT é atribuído à semana em que o último imóvel pendente
    daquele quarteirão foi visitado.
    """
    forms = await db.d1_forms.find({}, {"_id": 0}).to_list(5000)
    imoveis_cad = await db.imoveis.find({}, {"_id": 0, "quarteirao": 1, "logradouro": 1, "numero": 1}).to_list(5000)

    weeks: dict = {}

    def week_key(date_str: str):
        if not date_str:
            return None
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None
        iso_year, iso_week, _ = d.isocalendar()
        return f"{iso_year}-W{iso_week:02d}", d

    # Mapa: quarteirão -> set de chaves de imóveis cadastrados (lower-cased)
    cad_by_qt: dict[str, set[str]] = {}
    for im in imoveis_cad:
        qt = str(im.get("quarteirao") or "").strip()
        log = str(im.get("logradouro") or "").strip().lower()
        num = str(im.get("numero") or "").strip().lower()
        if not qt:
            continue
        cad_by_qt.setdefault(qt, set()).add(f"{log}|{num}")

    # Mapa: (qt, imóvel_key) -> (data, week_key) da PRIMEIRA visita registrada
    first_visit: dict[tuple, tuple] = {}

    for f in forms:
        wk = week_key(f.get("data_atividade", ""))
        if not wk:
            continue
        key, ref_date = wk
        if key not in weeks:
            # calcula data início (segunda-feira) e fim (domingo) da semana ISO
            from datetime import timedelta
            iso_year, iso_week, _ = ref_date.isocalendar()
            jan4 = datetime(iso_year, 1, 4).date()
            week1_start = jan4 - timedelta(days=jan4.isocalendar()[2] - 1)
            start = week1_start + timedelta(weeks=iso_week - 1)
            end = start + timedelta(days=6)
            weeks[key] = {
                "week": key,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "formularios": 0,
                "informados": 0,
                "trabalhados": 0,
                "pendentes": 0,
                "recuperados": 0,
                "focos": 0,
                "tratados": 0,
                "quarteiroes": set(),
            }

        w = weeks[key]
        w["formularios"] += 1
        for v in (f.get("visits") or []):
            filled = bool((v.get("logradouro") or "").strip() or (v.get("numero") or "") or (v.get("tipo_imovel") or "").strip())
            if not filled:
                continue
            w["informados"] += 1
            # Trabalhados = visita com tipo_visita preenchido
            if (v.get("tipo_visita") or "").strip():
                w["trabalhados"] += 1
            # Pendentes = pendencia "F" (Fechada)
            if (v.get("pendencia") or "").strip() == "F":
                w["pendentes"] += 1
            # Recuperados = tipo_visita "R"
            if (v.get("tipo_visita") or "").strip() == "R":
                w["recuperados"] += 1
            if v.get("imovel_com_foco"):
                w["focos"] += 1
            if v.get("imovel_tratado"):
                w["tratados"] += 1
            qt = (v.get("quarteirao") or "").strip()
            if qt:
                w["quarteiroes"].add(qt)
                # Rastreia primeira visita de cada imóvel (qt, log, num)
                log = str(v.get("logradouro") or "").strip().lower()
                num = str(v.get("numero") or "").strip().lower()
                im_key = (qt, f"{log}|{num}")
                prev = first_visit.get(im_key)
                if prev is None or ref_date < prev[0]:
                    first_visit[im_key] = (ref_date, key)

    # ===== Cálculo de Quarteirões Concluídos por semana =====
    # Um QT é concluído quando TODOS os imóveis cadastrados naquele QT foram
    # visitados. A semana de conclusão = semana da visita mais tardia entre as
    # primeiras visitas de seus imóveis.
    concluded_by_week: dict[str, list[str]] = {}
    for qt, cad_keys in cad_by_qt.items():
        if not cad_keys:
            continue
        latest_week_key = None
        latest_date = None
        all_visited = True
        for ik in cad_keys:
            fv = first_visit.get((qt, ik))
            if fv is None:
                all_visited = False
                break
            d, wk = fv
            if latest_date is None or d > latest_date:
                latest_date = d
                latest_week_key = wk
        if all_visited and latest_week_key:
            concluded_by_week.setdefault(latest_week_key, []).append(qt)

    result = []
    for k in sorted(weeks.keys()):
        w = weeks[k]
        w["quarteiroes_count"] = len(w["quarteiroes"])
        w["quarteiroes"] = sorted(w["quarteiroes"], key=lambda x: int(x) if x.isdigit() else 0)
        concluded = concluded_by_week.get(k, [])
        w["quarteiroes_concluidos"] = sorted(concluded, key=lambda x: int(x) if x.isdigit() else 0)
        w["quarteiroes_concluidos_count"] = len(concluded)
        result.append(w)

    # Totais agregados
    total = {
        "formularios": sum(w["formularios"] for w in result),
        "informados": sum(w["informados"] for w in result),
        "trabalhados": sum(w["trabalhados"] for w in result),
        "pendentes": sum(w["pendentes"] for w in result),
        "recuperados": sum(w["recuperados"] for w in result),
        "focos": sum(w["focos"] for w in result),
        "tratados": sum(w["tratados"] for w in result),
        "quarteiroes_concluidos": sum(w["quarteiroes_concluidos_count"] for w in result),
    }
    return {"weeks": result, "total": total}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
