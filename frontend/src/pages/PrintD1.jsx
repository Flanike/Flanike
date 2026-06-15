import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { formsApi } from "@/lib/api";
import { visitIsFilled } from "@/constants/d1";

// Layout fiel ao D1 oficial (planilha mestre):
// 32 colunas A..AF, 31 linhas. Reproduz merged cells via colspan/rowspan.
const PAPER_SIZES = {
  a4: { label: "A4 paisagem", css: "A4 landscape" },
  a3: { label: "A3 paisagem", css: "A3 landscape" },
  letter: { label: "Carta paisagem", css: "Letter landscape" },
  legal: { label: "Ofício paisagem", css: "Legal landscape" },
};

const PrintD1 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState("a4");

  useEffect(() => {
    formsApi.get(id).then(setForm).catch(() => setForm(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (form) {
      const orig = document.title;
      document.title = `D1_${form.data_atividade || "form"}_${form.folha || ""}`;
      return () => { document.title = orig; };
    }
  }, [form]);

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando…</div>;
  if (!form) return <div className="p-10 text-center text-red-600">Formulário não encontrado.</div>;

  // Garante 20 visitas
  const visits = [...(form.visits || [])];
  while (visits.length < 20) visits.push({});
  const v20 = visits.slice(0, 20);

  // Totais por tipo
  const tot = { R: 0, C: 0, TB: 0, PE: 0, O: 0 };
  v20.forEach((vi) => {
    if (vi.tipo_imovel && tot[vi.tipo_imovel] !== undefined) tot[vi.tipo_imovel] += 1;
  });
  const totalImoveis = v20.filter(visitIsFilled).length;
  const totalFocos = v20.filter((vi) => vi.imovel_com_foco).length;
  const totalTratados = v20.filter((vi) => vi.imovel_tratado).length;
  const totalDepElim = v20.reduce((a, vi) => a + (Number(vi.depositos_eliminados) || 0), 0);
  const totalDepTrat = v20.reduce((a, vi) => a + (Number(vi.qtde_dep_tratados) || 0), 0);

  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    } catch { return iso; }
  };

  // ============ Cells helpers ============
  const Th = ({ children, colSpan, rowSpan, className = "" }) => (
    <th colSpan={colSpan} rowSpan={rowSpan} className={`d1-h ${className}`}>{children}</th>
  );
  const Td = ({ children, colSpan, rowSpan, className = "", style }) => (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`d1-c ${className}`} style={style}>{children}</td>
  );

  return (
    <div className="print-d1-wrap">
      {/* Controles (não imprimem) */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="print-back">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Visualização para impressão</p>
          <h1 className="text-base font-semibold text-slate-900 font-display truncate">Modelo D1 oficial</h1>
        </div>
        <select
          value={paper}
          onChange={(e) => setPaper(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="paper-size-select"
          title="Tamanho do papel"
        >
          {Object.entries(PAPER_SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={() => window.print()}
          className="bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 flex items-center gap-2 shrink-0"
          data-testid="print-btn"
        >
          <Printer className="w-4 h-4" />
          Imprimir / PDF
        </button>
      </div>

      {/* CSS dinâmico para tamanho de papel */}
      <style>{`
        @media print {
          @page { size: ${PAPER_SIZES[paper].css}; margin: 5mm; }
        }
      `}</style>

      <div className="print-page d1-page">
        {/* Título oficial */}
        <div className="d1-title-block">
          <div className="d1-title">PROGRAMA NACIONAL DE CONTROLE DA DENGUE – PNCD</div>
          <div className="d1-subtitle">RESUMO DIÁRIO DO SERVIÇO ANTIVETORIAL</div>
        </div>

        {/* ====== Cabeçalho de identificação (linhas 4-5) ====== */}
        <table className="d1-table">
          <colgroup>
            <col style={{ width: "5%" }} /><col style={{ width: "5%" }} /><col style={{ width: "5%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "5%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "3%" }} /><col style={{ width: "3%" }} /><col style={{ width: "3%" }} />
            <col style={{ width: "3%" }} /><col style={{ width: "3%" }} /><col style={{ width: "3%" }} />
            <col style={{ width: "3%" }} /><col style={{ width: "3%" }} />
          </colgroup>
          <tbody>
            <tr>
              <Th colSpan={6}>Município</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={7}>Código e Nome da Localidade</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={6}>Categ. da Localidade</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={2}>Zona</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={3}>Tipo</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={2}>Folha</Th>
            </tr>
            <tr>
              <Td colSpan={6}>{form.municipio || ""}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={7}>{form.localidade || ""}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={6}>{form.categoria || ""}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={2}>{form.zona || ""}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={3}>{form.tipo || ""}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={2}>{form.folha || ""}</Td>
            </tr>
            <tr><td colSpan={32} className="d1-gap"></td></tr>
            <tr>
              <Th colSpan={6}>Data da Atividade</Th>
              <Th colSpan={1}></Th>
              <Th colSpan={15}>Atividade</Th>
              <Th colSpan={6} rowSpan={2}>Nº de Imóveis Trabalhados por Tipo</Th>
              <Th colSpan={4} rowSpan={2}>Nº de Imóveis</Th>
            </tr>
            <tr>
              <Td colSpan={6}>{formatDate(form.data_atividade)}</Td>
              <Td colSpan={1}></Td>
              <Td colSpan={15} className="d1-atividade">
                1 – Levantamento de Índice | 2 – L.I + Tratamento | 3 – Ponto Estratégico | 4 – Tratamento{" "}
                <br />5 – D. F. – Delimitação de Foco | 6 – PVE – Pesquisa Vetorial Espacial
              </Td>
            </tr>
          </tbody>
        </table>

        {/* ====== Tabela principal (linha 9 = cabeçalho; linhas 10-29 = 20 visitas; linha 30 = TOTAL) ====== */}
        <table className="d1-table d1-visits">
          <thead>
            <tr>
              <Th>Nº Quart.</Th>
              <Th>Seq.</Th>
              <Th>Lado</Th>
              <Th colSpan={6}>Nome do Logradouro</Th>
              <Th>Número</Th>
              <Th>Sequência</Th>
              <Th>Complemento</Th>
              <Th>Tipo do Imóvel</Th>
              <Th>Hora Entrada</Th>
              <Th>Tipo da Visita</Th>
              <Th>Pendência</Th>
              <Th>Nº Depósitos Eliminados</Th>
              <Th>Imóvel c/ foco</Th>
              <Th>Imóvel Trat.</Th>
              <Th>Tipo</Th>
              <Th>Quant. (g)</Th>
              <Th>Qtde. Dep. Trat.</Th>
              <Th>Residência</Th>
              <Th>Comércio</Th>
              <Th>Terreno Baldio</Th>
              <Th>P.E</Th>
              <Th>Outros</Th>
              <Th>Total</Th>
              <Th>Tratamento Focal</Th>
              <Th>Casas Fechadas</Th>
              <Th>Recuperadas</Th>
              <Th>Informados</Th>
            </tr>
          </thead>
          <tbody>
            {v20.map((vi, idx) => {
              const filled = visitIsFilled(vi);
              // Coluna lateral direita: ocorre apenas em algumas linhas como cabeçalhos/dados especiais
              const renderRight = () => {
                // idx 0 = row 10 = first row of data
                // idx 0 -> totais por tipo + tratamento focal + casas fechadas + recup + informados
                if (idx === 0) {
                  return (
                    <>
                      <Td className="num">{tot.R || ""}</Td>
                      <Td className="num">{tot.C || ""}</Td>
                      <Td className="num">{tot.TB || ""}</Td>
                      <Td className="num">{tot.PE || ""}</Td>
                      <Td className="num">{tot.O || ""}</Td>
                      <Td className="num strong">{totalImoveis || ""}</Td>
                      <Td className="num">{totalTratados || ""}</Td>
                      <Td className="num">{form.casas_fechadas || ""}</Td>
                      <Td className="num">{form.recuperadas || ""}</Td>
                      <Td className="num">{form.informados || ""}</Td>
                    </>
                  );
                }
                // idx 3 = row 13: header "Depósitos" (X13:AE13 = cols 24..31 → 8 cols)
                if (idx === 3) {
                  return <Td colSpan={10} className="strong center">Depósitos</Td>;
                }
                // idx 4 = row 14: "Eliminados" (X14:Y15 rowSpan=2, 2 cols), "Tratados" (Z14:AE14, 6 cols)
                if (idx === 4) {
                  return (
                    <>
                      <Td colSpan={2} rowSpan={2} className="strong center">Eliminados</Td>
                      <Td colSpan={8} className="strong center">Tratados</Td>
                    </>
                  );
                }
                // idx 5 = row 15: blank under Eliminados (rowspan), Tipo / Quant.(g) / Quant.dep.trat
                if (idx === 5) {
                  return (
                    <>
                      <Td colSpan={1} className="strong center">Tipo</Td>
                      <Td colSpan={2} className="strong center">Quant. (g)</Td>
                      <Td colSpan={5} className="strong center">Quant. dep. trat.</Td>
                    </>
                  );
                }
                // idx 6 = row 16: dados dos depósitos (somatórios)
                if (idx === 6) {
                  return (
                    <>
                      <Td colSpan={2} className="num">{totalDepElim || ""}</Td>
                      <Td colSpan={1} className="center">{form.depositos_tratados?.tipo || ""}</Td>
                      <Td colSpan={2} className="num">{form.depositos_tratados?.quantidade ?? ""}</Td>
                      <Td colSpan={5} className="num">{totalDepTrat || ""}</Td>
                    </>
                  );
                }
                // idx 7 = row 17: vazio
                if (idx === 7) return <Td colSpan={10}></Td>;
                // idx 8 = row 18: "Nº e Sequência dos Quarteirões Trabalhados"
                if (idx === 8) return <Td colSpan={10} className="strong center">Nº e Sequência dos Quarteirões Trabalhados</Td>;
                if (idx === 9 || idx === 10) {
                  // dado dos quarteirões trabalhados
                  return <Td colSpan={10} className="center">{idx === 9 ? (form.quarteiroes_trabalhados || "") : ""}</Td>;
                }
                // idx 11 = row 21: "Nº e Sequência dos Quarteirões Concluídos"
                if (idx === 11) return <Td colSpan={10} className="strong center">Nº e Sequência dos Quarteirões Concluídos</Td>;
                if (idx === 12 || idx === 13) {
                  return <Td colSpan={10} className="center">{idx === 12 ? (form.quarteiroes_concluidos || "") : ""}</Td>;
                }
                // idx 14 = row 24: reservado (sem classificação na impressão)
                if (idx === 14) return <Td colSpan={10}></Td>;
                // idx 15..19: linhas vazias (a classificação A1-E foi movida para uso interno do app)
                if (idx >= 15 && idx <= 19) {
                  return <Td colSpan={10}></Td>;
                }
                return null;
              };

              return (
                <tr key={idx} className={filled ? "filled" : "empty"}>
                  <Td className="center">{vi.quarteirao || ""}</Td>
                  <Td className="center">{vi.sequencia || ""}</Td>
                  <Td className="center">{vi.lado || ""}</Td>
                  <Td colSpan={6} className="logradouro">{vi.logradouro || ""}</Td>
                  <Td className="center">{vi.numero || ""}</Td>
                  <Td className="center">{vi.seq_numero || ""}</Td>
                  <Td className="center">{vi.complemento || ""}</Td>
                  <Td className="center">{vi.tipo_imovel || ""}</Td>
                  <Td className="center">{vi.hora_entrada || ""}</Td>
                  <Td className="center">{vi.tipo_visita || ""}</Td>
                  <Td className="center">{vi.pendencia || ""}</Td>
                  <Td className="num">{vi.depositos_eliminados ?? ""}</Td>
                  <Td className="check">{vi.imovel_com_foco ? "✓" : ""}</Td>
                  <Td className="check">{vi.imovel_tratado ? "✓" : ""}</Td>
                  <Td className="center">{vi.larvicida_tipo || ""}</Td>
                  <Td className="num">{vi.larvicida_quantidade ?? ""}</Td>
                  <Td className="num">{vi.qtde_dep_tratados ?? ""}</Td>
                  {renderRight()}
                </tr>
              );
            })}
            {/* TOTAL row (linha 30) */}
            <tr className="totals">
              <Td colSpan={16} className="right strong">TOTAL</Td>
              <Td className="num strong">{totalDepElim || 0}</Td>
              <Td className="check strong">{totalFocos || 0}</Td>
              <Td className="check strong">{totalTratados || 0}</Td>
              <Td className="center">{form.depositos_tratados?.tipo || ""}</Td>
              <Td className="num strong">{form.depositos_tratados?.quantidade ?? ""}</Td>
              <Td className="num strong">{totalDepTrat || 0}</Td>
              <Td colSpan={10}></Td>
            </tr>
            {/* Assinaturas (linha 31) */}
            <tr className="signatures">
              <Td colSpan={5} className="strong">Assinatura do Agente</Td>
              <Td colSpan={5} className="sig">{form.assinatura_agente || ""}</Td>
              <Td colSpan={6} className="strong">Assinatura do Supervisor</Td>
              <Td colSpan={6} className="sig">{form.assinatura_supervisor || ""}</Td>
              <Td colSpan={10}></Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintD1;
