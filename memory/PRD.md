# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Problema Original e Iterações
1. **MVP** — "crie um formulário a partir da planilha d1"
2. **Banco** — "transforme a planilha base em banco de dados"
3. **PWA + Visitados** — "PWA offline + indicador visual + remover depósitos eliminados"
4. **Sync + Resumo + Imprimir** — "sync queue + pré-cache QT + resumo + salvar PDF/Imprimir D1"
5. **Pré-cache total + ajustes** — "baixar todos os 988 imóveis na 1ª abertura + remover Recusa/Recuperada"

## Persona
**Agente de Endemias (ACE)** em Santa Cruz/RN — em campo, no celular, sem internet, precisa imprimir/enviar o D1 oficial ao fim do dia.

## Arquitetura
- **Frontend:** React 19 + React Router + Tailwind, PWA instalável
- **Backend:** FastAPI + Motor (MongoDB async) — 988 imóveis · 33 quarteirões · 1 localidade
- **Offline-first 100%:**
  - **Pré-cache agressivo:** baixa todos os 988 imóveis (`/api/imoveis` global + 33 por QT) na 1ª abertura, TTL 7 dias
  - Service Worker (catalog cache-first + forms network-first + app shell SWR)
  - localStorage para rascunho do formulário aberto
  - **Sync queue** (`pncd_sync_queue` + `pncd_local_forms`) para mutações POST/PUT/DELETE
  - Drain automático ao detectar `online`

## Páginas
- `/` Dashboard — lista + badges offline/sync + indicador de bootstrap
- `/catalogo` Cadastro — explorar 988 imóveis com filtros Todos/Visitados/Pendentes
- `/form/new` e `/form/:id` Editor — autosave + pré-cache de QT + Imprimir/PDF/CSV
- `/resumo` Resumo do Ciclo — progresso geral + barra por quarteirão
- `/print/:id` Impressão D1 — réplica fiel do layout oficial (A4 paisagem)

## Domínio
### Tipos de Visita (após iter5)
- N – Normal
- R – Recuperada

### Pendência (após iter5)
- (vazio)
- F – Fechada
- R – Recusa

## Endpoints
- Formulários: `GET/POST /api/forms`, `GET/PUT/DELETE /api/forms/{id}`
- Catálogo: `/api/localidade`, `/api/quarteiroes`, `/api/imoveis`, `/api/imoveis/count`, `/api/imoveis/visited`

## Status (Janeiro/2026)
### ✅ Implementado (5 iterações)

| Iteração | Foco | Resultado de teste |
|----------|------|---------------------|
| 1 | MVP CRUD + Export | 100% |
| 2 | Banco da planilha + Catálogo + Picker | 14/14 backend |
| 3 | PWA + Visitados + Limpeza | 19/19 backend, 100% e2e |
| 4 | Sync queue + Pré-cache QT + Resumo + Imprimir D1 | 19/19, ~95% e2e |
| **5** | **Pré-cache total (988) + ajustes dropdowns** | **19/19 backend, 100% e2e** |

## Backlog
### P1
- IIP automático (Imóveis com Foco × 100 / Imóveis Trabalhados)
- Indicador de progresso no card "Cadastro" do Dashboard

### P2
- Multi-agente (login)
- Importação de D1 de ciclos anteriores
- Gráficos de evolução semanal por quarteirão
- Exportação consolidada do ciclo inteiro em 1 PDF
- Sincronização com SISPNCD oficial
