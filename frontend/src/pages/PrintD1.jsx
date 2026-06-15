import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { formsApi } from "@/lib/api";
import { ATIVIDADES, TIPOS_IMOVEL, visitIsFilled } from "@/constants/d1";

// Layout do D1 oficial — usa CSS @media print para imprimir
const PrintD1 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formsApi
      .get(id)
      .then(setForm)
      .catch(() => setForm(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Inserir título da página para o save-as-PDF
    if (form) {
      const orig = document.title;
      document.title = `D1_${form.data_atividade || "form"}_${form.folha || ""}`;
      return () => {
        document.title = orig;
      };
    }
  }, [form]);

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando…</div>;
  if (!form) return <div className="p-10 text-center text-red-600">Formulário não encontrado.</div>;

  const ativObj = ATIVIDADES.find((a) => a.value === form.atividade);
  const ativ = ativObj ? ativObj.label : form.atividade || "—";

  const totaisTipo = {};
  TIPOS_IMOVEL.forEach((t) => {
    totaisTipo[t.value] = form.visits.filter((v) => v.tipo_imovel === t.value).length;
  });
  const totalImoveis = form.visits.filter(visitIsFilled).length;
  const totalFocos = form.visits.filter((v) => v.imovel_com_foco).length;
  const totalTratados = form.visits.filter((v) => v.imovel_tratado).length;
  const totalDepEliminados = form.visits.reduce(
    (a, v) => a + (Number(v.depositos_eliminados) || 0),
    0
  );
  const totalDepTratados = form.visits.reduce(
    (a, v) => a + (Number(v.qtde_dep_tratados) || 0),
    0
  );

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="print-d1-wrap">
      {/* Controles (não imprimem) */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
          data-testid="print-back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Visualização para impressão</p>
          <h1 className="text-base font-semibold text-slate-900 font-display">Modelo D1 oficial</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 flex items-center gap-2"
          data-testid="print-btn"
        >
          <Printer className="w-4 h-4" />
          Imprimir / PDF
        </button>
      </div>

      <div className="print-page">
        {/* Cabeçalho oficial */}
        <div className="d1-title">
          <div>PROGRAMA NACIONAL DE CONTROLE DA DENGUE – PNCD</div>
          <div className="d1-subtitle">RESUMO DIÁRIO DO SERVIÇO ANTIVETORIAL</div>
        </div>

        {/* Identificação */}
        <table className="d1-table">
          <tbody>
            <tr>
              <th>Município</th>
              <td colSpan={3}>{form.municipio || "—"}</td>
              <th>Código e Nome da Localidade</th>
              <td colSpan={3}>{form.localidade || "—"}</td>
              <th>Categ.</th>
              <td>{form.categoria || "—"}</td>
              <th>Zona</th>
              <td>{form.zona || "—"}</td>
              <th>Tipo</th>
              <td>{form.tipo || "—"}</td>
              <th>Folha</th>
              <td>{form.folha || "—"}</td>
            </tr>
            <tr>
              <th>Data</th>
              <td>{formatDate(form.data_atividade)}</td>
              <th>Atividade</th>
              <td colSpan={9}>{ativ}</td>
              <th>Quart. Trab.</th>
              <td>{form.quarteiroes_trabalhados || "—"}</td>
              <th>Quart. Conc.</th>
              <td>{form.quarteiroes_concluidos || "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabela de visitas */}
        <table className="d1-table d1-visits">
          <thead>
            <tr>
              <th rowSpan={2}>Nº Quart.</th>
              <th rowSpan={2}>Seq.</th>
              <th rowSpan={2}>Lado</th>
              <th rowSpan={2} className="w-logradouro">Nome do Logradouro</th>
              <th rowSpan={2}>Número</th>
              <th rowSpan={2}>Seq.</th>
              <th rowSpan={2}>Complemento</th>
              <th rowSpan={2}>Tipo Imóvel</th>
              <th rowSpan={2}>Hora Entrada</th>
              <th rowSpan={2}>Tipo Visita</th>
              <th rowSpan={2}>Pend.</th>
              <th rowSpan={2}>Nº Dep. Elim.</th>
              <th rowSpan={2}>Imóvel c/Foco</th>
              <th rowSpan={2}>Imóvel Trat.</th>
              <th colSpan={3}>Tratamento Focal</th>
            </tr>
            <tr>
              <th>Tipo</th>
              <th>Quant. (g)</th>
              <th>Qtd Dep. Trat.</th>
            </tr>
          </thead>
          <tbody>
            {form.visits.map((v, i) => (
              <tr key={i} className={visitIsFilled(v) ? "filled" : "empty"}>
                <td>{v.quarteirao || ""}</td>
                <td>{v.sequencia || ""}</td>
                <td>{v.lado || ""}</td>
                <td className="logradouro">{v.logradouro || ""}</td>
                <td>{v.numero || ""}</td>
                <td>{v.seq_numero || ""}</td>
                <td>{v.complemento || ""}</td>
                <td>{v.tipo_imovel || ""}</td>
                <td>{v.hora_entrada || ""}</td>
                <td>{v.tipo_visita || ""}</td>
                <td>{v.pendencia || ""}</td>
                <td className="num">{v.depositos_eliminados ?? ""}</td>
                <td className="check">{v.imovel_com_foco ? "✓" : ""}</td>
                <td className="check">{v.imovel_tratado ? "✓" : ""}</td>
                <td>{v.larvicida_tipo || ""}</td>
                <td className="num">{v.larvicida_quantidade ?? ""}</td>
                <td className="num">{v.qtde_dep_tratados ?? ""}</td>
              </tr>
            ))}
            <tr className="totals">
              <td colSpan={11} className="lbl">TOTAL</td>
              <td className="num">{totalDepEliminados || 0}</td>
              <td className="check">{totalFocos}</td>
              <td className="check">{totalTratados}</td>
              <td>{form.depositos_tratados?.tipo || ""}</td>
              <td className="num">{form.depositos_tratados?.quantidade ?? ""}</td>
              <td className="num">{totalDepTratados || 0}</td>
            </tr>
          </tbody>
        </table>

        {/* Bloco de totais por tipo de imóvel */}
        <div className="d1-bottom">
          <table className="d1-table d1-sumtipos">
            <thead>
              <tr>
                <th colSpan={6}>Nº de Imóveis Trabalhados por Tipo</th>
                <th>Total</th>
              </tr>
              <tr>
                <th>Residência</th>
                <th>Comércio</th>
                <th>Terreno Baldio</th>
                <th>P.E.</th>
                <th>Outros</th>
                <th>—</th>
                <th>Imóveis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="num">{totaisTipo.R || 0}</td>
                <td className="num">{totaisTipo.C || 0}</td>
                <td className="num">{totaisTipo.TB || 0}</td>
                <td className="num">{totaisTipo.PE || 0}</td>
                <td className="num">{totaisTipo.O || 0}</td>
                <td></td>
                <td className="num strong">{totalImoveis}</td>
              </tr>
            </tbody>
          </table>

          <table className="d1-table d1-resumo">
            <thead>
              <tr>
                <th colSpan={3}>Resumo da Atividade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Casas Fechadas</th>
                <th>Recuperadas</th>
                <th>Informados</th>
              </tr>
              <tr>
                <td className="num">{form.casas_fechadas || 0}</td>
                <td className="num">{form.recuperadas || 0}</td>
                <td className="num">{form.informados || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Assinaturas */}
        <table className="d1-table d1-sign">
          <tbody>
            <tr>
              <th>Assinatura do Agente</th>
              <td>{form.assinatura_agente || ""}</td>
              <th>Assinatura do Supervisor</th>
              <td>{form.assinatura_supervisor || ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintD1;
