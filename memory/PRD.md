# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Iterações
1. MVP CRUD + Export
2. Banco da planilha (988 imóveis) + Catálogo + Picker
3. PWA + Visitados + Limpeza Depósitos
4. Sync queue + Pré-cache QT + Resumo + Imprimir D1
5. Pré-cache total (988 imóveis offline) + ajustes dropdowns
6. Resumo Semanal + Editar Cadastro (CRUD imóveis)
7. **Quick Actions Dashboard + Filtro por Lado (Fev/2026)**

## Persona
**Agente de Endemias (ACE)** em Santa Cruz/RN — em campo, no celular, sem internet, gerencia formulários, catálogo de imóveis e acompanha estatísticas.

## Arquitetura
- **Frontend:** React 19 + Tailwind, PWA instalável, offline-first 100%
- **Backend:** FastAPI + Motor (MongoDB async)
- **Coleções:** d1_forms · imoveis (988+) · quarteiroes (33) · localidade (1)

## Páginas
- `/` Dashboard — formulários + 2 cards (Ciclo / Semanal) + indicador bootstrap
- `/catalogo` Cadastro — CRUD completo de imóveis + filtros Todos/Visitados/Pendentes
- `/form/new` e `/form/:id` Editor
- `/resumo` Resumo do Ciclo (por QT)
- **`/semanal` Resumo Semanal** (estilo aba RESUMO original — ISO 8601)
- `/print/:id` Impressão D1

## Endpoints
- Formulários: `GET/POST /api/forms`, `GET/PUT/DELETE /api/forms/{id}`
- **Stats: `GET /api/forms/stats/weekly`** — agregação ISO 8601 (formulários por semana)
- Catálogo:
  - `GET /api/localidade`, `/api/quarteiroes`, `/api/imoveis`, `/api/imoveis/count`, `/api/imoveis/visited`
  - **`POST /api/imoveis`, `PUT /api/imoveis/{id}`, `DELETE /api/imoveis/{id}`** — CRUD do cadastro
  - Refresh automático dos totais agregados em `quarteiroes` após cada mutação (e remoção de QT órfãos)

## Status (Janeiro/2026)
### ✅ Iteração 7 — Quick Actions + Filtro Lado (Fev/2026)
- **Dashboard quick actions** (`Dashboard.jsx`):
  - "Duplicar último" — clona cabeçalho + lista de imóveis das 20 visitas do último formulário (sem dados de visita: zera visita_n, foco, tratado, larvicida)
  - "Limpar formulário" — descarta rascunho local e navega para `/form/new?fresh=1`
- **FormEditor — botão Limpar no header** (ícone borracha): reseta todos os campos para vazio com confirmação
- **Filtro por Lado** (`Catalogo.jsx` e `ImovelPicker.jsx`):
  - Botões "Todos" + 1-10 conforme lados disponíveis no quarteirão selecionado
  - Reseta automaticamente ao trocar de quarteirão
- **Testado** via testing_agent (iteration_8.json): ~95% — todas as features OK

### ✅ Iteração 6 — Resumo Semanal + Editar Cadastro
- **`/semanal`**: hero "Acumulado" + gráfico de barras por semana + tabela detalhada estilo aba RESUMO (QT Conc, Inform, Trab, Pend, Recup, Focos)
- **CRUD do Cadastro**:
  - Botão "+ Novo" no catálogo abre modal
  - Botão Editar (ícone Pencil) em cada imóvel abre modal preenchido
  - Botão Excluir no modal de edição (com confirmação)
  - Backend recalcula automaticamente os totais agregados em `quarteiroes`
  - QTs criados pelo usuário são removidos quando seus últimos imóveis são deletados
- **Robustez**: sort de imóveis lida com lados numéricos (1,2,3) e não-numéricos (P/I/U)

### Resultados de teste
- **33/33 backend pytest** (100%)
- **Frontend e2e 100%** — CRUD imóveis + página semanal + regressão geral
- 1 issue cosmético pré-existente (hydration warning em `<option>`)

## Backlog
### P1
- IIP automático (Imóveis com Foco × 100 / Imóveis Trabalhados)
- Histórico de edições do cadastro (audit log)

### P2
- Multi-agente (auth)
- Importação de D1 de ciclos anteriores
- Exportação consolidada do ciclo em 1 PDF
- Sincronização com SISPNCD oficial
- Gráfico de evolução por quarteirão
