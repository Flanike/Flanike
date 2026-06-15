# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Problema Original
> "crie um formulário a partir da planilha d1" → MVP
> "transforme a planilha base em banco de dados para alimentar esse formulário" → Iteração 2
> "Implementar PWA offline; adicionar indicador visual; depósitos eliminados não é necessária" → Iteração 3

## Escolhas do Usuário
- App mobile-first (PWA) para uso particular do agente em campo
- CRUD + export CSV/PDF
- 20 visitas fixas por formulário
- Cores claras, PT-BR
- Banco populado da planilha base
- PWA offline + indicador de imóveis visitados

## Persona
**Agente de Endemias (ACE)** em Santa Cruz/RN — em campo, no celular, possivelmente sem internet.

## Arquitetura
- **Frontend:** React 19, mobile-first, **PWA instalável** com Service Worker, autosave em localStorage
- **Backend:** FastAPI + Motor (MongoDB async)
- **Coleções:** `d1_forms`, `imoveis` (988), `quarteiroes` (33), `localidade` (1)
- **Importação:** `backend/scripts/import_xlsx.py` (idempotente, parseia 33 abas QT + RG2CAB)

## Endpoints
### Formulários
- `GET/POST /api/forms` · `GET/PUT/DELETE /api/forms/{id}`

### Catálogo
- `GET /api/localidade` · `GET /api/quarteiroes`
- `GET /api/imoveis?quarteirao=N&lado=N&q=texto`
- `GET /api/imoveis/count`
- `GET /api/imoveis/visited` — keys de imóveis já visitados em formulários salvos

## Status (Janeiro/2026)
### ✅ Iteração 1 — MVP
- Dashboard, editor com 20 visitas (modal), totais, export CSV/PDF

### ✅ Iteração 2 — Banco da Planilha
- Script de importação → 988 imóveis, 33 quarteirões
- Página /catalogo, ImovelPicker no modal de visita
- Auto-preencher Município/Localidade/Zona

### ✅ Iteração 3 — PWA + Visitados + Limpeza
- **PWA instalável**: manifest.json, service worker, ícones (192/512), apple-touch-icon
- **Service Worker estratégias**: catalog = cache-first, forms GET = network-first, app shell = stale-while-revalidate
- **Indicador online/offline**: badge no Dashboard e no FormEditor
- **Autosave em localStorage**: rascunho restaurado após reload/queda de rede
- **Indicador "Visitado"** no catálogo e no ImovelPicker (badge verde + bg destacado)
- **Stats por quarteirão**: Total / Visitados / Pendentes + filtros
- **Removida seção "Depósitos Eliminados"** (A1-E) — também removida do CSV/PDF

## Testes
- **Backend: 19/19 pytest** (100%)
- **Frontend e2e**: 100% — PWA, offline badge, autosave, restauração de rascunho, indicador visitado, filtros, remoção da seção

## Backlog
### P1
- Sync queue: salvar formulários offline e sincronizar quando voltar a internet
- Service worker: pré-cache de imóveis do quarteirão atual
- IIP automático (Imóveis com Foco × 100 / Imóveis Trabalhados)

### P2
- Login multi-agente
- Importar D1 de ciclos anteriores
- Sincronização com SISPNCD

## Próximos Passos
1. Validar instalação PWA em celular Android/iOS real
2. Implementar sync queue para mutações offline (POST/PUT/DELETE)
3. Adicionar IIP no resumo da atividade
