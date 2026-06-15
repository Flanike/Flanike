# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Problema Original
> "crie um formulário a partir da planilha d1"
> "transforme a planilha base em banco de dados para alimentar esse formulário"

A planilha enviada (`RESUMO 3º CICLO.xlsx`) contém:
- **Aba D1**: o formulário oficial "Resumo Diário do Serviço Antivetorial" do PNCD
- **Abas QT01–QT33**: cadastro de imóveis por quarteirão (Boletim de Reconhecimento Geográfico)
- **RG2CAB**: totais agregados por quarteirão (residências, comércios, etc.)
- **RESUMO**: resumo semanal

## Escolhas do Usuário
- **Tipo:** app web mobile-first para uso particular do agente
- **Funcionalidades:** preencher, salvar, listar, editar, exportar (CSV/PDF)
- **Visitas:** quantidade fixa (20)
- **Visual:** cores claras
- **Idioma:** PT-BR

## Persona
**Agente de Endemias (ACE)** em Santa Cruz/RN — preenche o D1 em campo, no celular, ao longo do dia.

## Arquitetura
- **Frontend:** React 19 + React Router + Tailwind, mobile-first
- **Backend:** FastAPI + Motor (MongoDB async)
- **Banco:** MongoDB local com coleções: `d1_forms`, `imoveis`, `quarteiroes`, `localidade`
- **Importação:** script Python (`backend/scripts/import_xlsx.py`) parseia `.xlsx` via openpyxl

## Modelo de Dados
### Coleções
- `d1_forms` — formulários salvos pelo agente (1 = 1 dia de campo)
- `imoveis` — 988 imóveis com `quarteirao`, `lado`, `logradouro`, `numero`, `seq`, `tipo_imovel`, `hab`, `cao`, `gato`
- `quarteiroes` — 33 quarteirões com totais (residencia, comercio, outros, terreno_baldio, soma_imoveis, habitantes, cao, gato)
- `localidade` — 1 doc: SANTA CRUZ/RN, Conjunto Aluízio Bezerra, Zona 14

## Endpoints
### Formulários
- `GET/POST /api/forms` — listar/criar
- `GET/PUT/DELETE /api/forms/{id}`

### Catálogo (alimentado pela planilha)
- `GET /api/localidade` — info da localidade
- `GET /api/quarteiroes` — lista 33 quarteirões com totais
- `GET /api/imoveis?quarteirao=N&lado=N&q=texto` — filtra imóveis
- `GET /api/imoveis/count` — contagem total

## Status (Janeiro/2026)
### ✅ Implementado e testado (100% backend, ~95% frontend e2e)
- **Iteração 1 — MVP:**
  - Dashboard com lista de formulários e ações Editar/Exportar/Excluir
  - Editor com seções: Identificação, 20 Visitas (cards expansíveis com modal), Totais, Depósitos (A1–E), Resumo, Assinaturas
  - Export CSV e PDF (layout oficial PNCD em A4 paisagem)
- **Iteração 2 — Banco alimentado pela planilha:**
  - Script `import_xlsx.py` importa as 33 abas QT e RG2CAB
  - 988 imóveis + 33 quarteirões + 1 localidade persistidos
  - Página `/catalogo` para explorar o cadastro com filtros e busca
  - Município/Localidade/Zona auto-preenchidos em formulários novos
  - `ImovelPicker` no modal de visita — agente seleciona QT → escolhe imóvel cadastrado → preenche logradouro/número/tipo automaticamente

## Backlog
### P1
- PWA instalável + offline (campo sem internet)
- Autocomplete de logradouros conforme digita
- Marcar imóvel como "visitado hoje" no catálogo
### P2
- Auth multi-agente
- Importar D1 de ciclos anteriores
- Estatísticas: imóveis pendentes, IIP (Índice de Infestação Predial)
- Sincronização com SISPNCD

## Próximas Ações
1. Validar em celular real
2. Adicionar PWA offline
3. Implementar IIP automático (Imóveis com foco / Imóveis trabalhados × 100)
