# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Problema Original e Iterações
1. "crie um formulário a partir da planilha d1" → MVP
2. "transforme a planilha base em banco de dados" → Banco populado
3. "PWA offline + indicador visual + remover depósitos eliminados" → PWA + visitados
4. **"Sync queue + pré-cache QT + resumo + salvar PDF/Imprimir usando D1 como modelo"** → atual

## Persona
**Agente de Endemias (ACE)** em Santa Cruz/RN — em campo, no celular, sem internet, precisa imprimir/enviar o D1 oficial ao fim do dia.

## Arquitetura
- **Frontend:** React 19 + React Router + Tailwind, PWA instalável
- **Backend:** FastAPI + Motor (MongoDB async) — 988 imóveis · 33 quarteirões · 1 localidade
- **Offline-first:**
  - Service Worker (catalog cache-first + forms network-first + app shell SWR)
  - localStorage para rascunho do formulário aberto
  - **Sync queue** (`pncd_sync_queue` + `pncd_local_forms`) para mutações POST/PUT/DELETE quando offline
  - Drain automático ao detectar evento `online`
  - **Pré-cache** de `/api/imoveis?quarteirao=X` ao usar QT em uma visita

## Páginas
- `/` Dashboard — lista de formulários (mistura local + servidor), badges offline/sync, cards Cadastro + Ciclo
- `/catalogo` Cadastro — explorar 988 imóveis, filtros Todos/Visitados/Pendentes
- `/form/new` e `/form/:id` Editor — autosave em localStorage, pré-cache de QT, header com Imprimir/PDF/CSV
- **`/resumo` Resumo do Ciclo** — progresso geral + barra por quarteirão + cards Concluídos/Em Andamento/A Iniciar
- **`/print/:id` Impressão D1** — réplica fiel do layout oficial (A4 paisagem, `@media print`)

## Endpoints
- Formulários: `GET/POST /api/forms`, `GET/PUT/DELETE /api/forms/{id}`
- Catálogo: `/api/localidade`, `/api/quarteiroes`, `/api/imoveis`, `/api/imoveis/count`, `/api/imoveis/visited`

## Status (Janeiro/2026) — Iteração 4
### ✅ Implementado e validado pelo testing agent
- **Sync queue offline → online**
  - Mutações enfileiradas localmente quando offline
  - Drain automático ao voltar online (validado: form criado offline aparece no servidor após reconexão)
  - Badges: "Offline", "Sincronizando…", "N na fila", "Aguardando envio" por formulário
- **Pré-cache do quarteirão ativo no Service Worker**
  - `catalogApi.prefetchQuarteirao(qt)` dispara fetch que o SW armazena (cache-first)
- **Página /resumo do ciclo**
  - Hero com progresso geral em %, barra animada
  - 3 cards: Concluídos / Em Andamento / A Iniciar
  - Lista das 33 quarteirões com barra individual e %
- **Imprimir / Salvar PDF / Salvar CSV** em dropdowns
  - Dashboard e FormEditor: 3 opções acessíveis
  - "Imprimir D1" abre `/print/:id` que dispara `window.print()` (no navegador o usuário pode "Salvar como PDF" via dialog nativo)
- **Layout D1 oficial replicado** em `/print/:id`
  - Cabeçalho PNCD, identificação, tabela de 20 visitas com totais, totais por tipo, resumo, assinaturas
  - CSS `@media print` esconde controles, `@page A4 landscape`

### Resultados de teste
- **Backend: 19/19 pytest pass (100%)**
- **Frontend e2e: ~95%** — todas as 10 funcionalidades verificadas
- Validado: offline→online drain (form criado offline confirmado no servidor)

## Backlog
### P1
- IIP automático (Imóveis com Foco × 100 / Imóveis Trabalhados)
- Pre-fetch agressivo: ao abrir o app, baixar TODOS os 988 imóveis para uso offline
- Indicador de progresso no card "Cadastro" do Dashboard

### P2
- Multi-agente (login)
- Importação de D1 de ciclos anteriores
- Gráficos de evolução semanal
- Sincronização com SISPNCD oficial
