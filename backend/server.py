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
    created_at: datetime
    updated_at: datetime


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
