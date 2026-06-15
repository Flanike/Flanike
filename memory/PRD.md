# PRD — Formulário PNCD D1 (Resumo Diário do Serviço Antivetorial)

## Problema Original
> "crie um formulário a partir da planilha d1"

A planilha enviada (`RESUMO 3º CICLO.xlsx`, aba **D1**) é o formulário oficial **PNCD – Resumo Diário do Serviço Antivetorial** do Programa Nacional de Controle da Dengue (Brasil). Cada folha registra um dia de trabalho do agente de endemias com até 20 visitas a imóveis e um resumo de depósitos eliminados/tratados.

## Escolhas do Usuário
- Aplicação: **app web mobile-first** para uso particular (no celular do agente)
- Funcionalidades: **Preencher, salvar, listar, editar e exportar**
- Linhas de visitas: **quantidade fixa (20)**
- Visual: **cores claras** (tema light "Soft Utility / Swiss")
- Idioma: PT-BR

## Persona
**Agente de Endemias (ACE)** — preenche o D1 em campo, pelo celular, ao longo do dia. Precisa de UI simples, com toques grandes, contraste forte e dados salvos rapidamente.

## Arquitetura
- **Frontend:** React 19 + React Router + Tailwind, mobile-first (`max-w-[640px]`), fontes Work Sans + IBM Plex Sans
- **Backend:** FastAPI + Motor (MongoDB async)
- **Banco:** MongoDB local (coleção `d1_forms`)
- **Export:** CSV nativo + PDF via `jspdf` + `jspdf-autotable` (layout em paisagem, A4)

## Modelo de Dados
- `D1Form`: cabeçalho (município, localidade, categoria, zona, tipo, folha, data, atividade, quarteirões), 20 × `Visit`, `depositos_eliminados` (A1–E), `depositos_tratados`, casas fechadas/recuperadas/informados, assinaturas
- `Visit`: quarteirão, sequência, lado, logradouro, número, complemento, tipo de imóvel (R/C/TB/PE/O), hora, tipo de visita, pendência, depósitos eliminados, foco, tratado, larvicida, quantidade, qtde dep. tratados
- IDs: UUID; datetimes em ISO 8601 (UTC)

## Endpoints
- `GET /api/forms` → lista resumida (`D1FormSummary`)
- `POST /api/forms` → cria (garante 20 visitas)
- `GET /api/forms/{id}` → detalhe
- `PUT /api/forms/{id}` → atualiza
- `DELETE /api/forms/{id}`

## O que foi entregue (15/Jan/2026)
- Dashboard com histórico, contador de formulários, ações Editar/Exportar/Excluir
- Editor com seções: Identificação, Visitas (20 cards), Totais auto-calculados por tipo, Depósitos Eliminados (A1–E), Depósitos Tratados, Resumo (fechadas/recuperadas/informados), Assinaturas
- Modal de visita full-screen com 18 campos
- Exportação CSV e PDF (mantendo cabeçalho oficial PNCD)
- Totais e indicadores visuais (foco/tratado, borda verde nos cards preenchidos)
- Backend CRUD completo + testes (100% pass)

## Backlog
### P1 (próximos)
- Cálculo automático dos totais "Casas Fechadas/Recuperadas/Informados" a partir das pendências das visitas
- PWA: instalação no celular (manifest + service worker offline)
- Salvar rascunho local (IndexedDB) para campo sem internet

### P2 (futuro)
- Múltiplos agentes com login (auth)
- Importação de planilhas D1 antigas
- Estatísticas semanais/mensais (resumo do ciclo)
- Sincronização com o sistema SISPNCD oficial

## Próximas Ações Sugeridas
1. Validar o fluxo no celular real do usuário
2. Adicionar PWA para uso offline
3. Considerar autocálculo de Casas Fechadas baseado em pendências
