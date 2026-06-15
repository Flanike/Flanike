import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Trash2, Download, Edit3, ClipboardList, Database } from "lucide-react";
import { formsApi, catalogApi } from "@/lib/api";
import { ATIVIDADES } from "@/constants/d1";
import { exportCSV, exportPDF } from "@/lib/export";

const Dashboard = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [catalogStats, setCatalogStats] = useState({ imoveis: 0, quarteiroes: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const data = await formsApi.list();
      setForms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    catalogApi
      .quarteiroes()
      .then((qs) => {
        const total = qs.reduce((acc, q) => acc + (q.soma_imoveis || 0), 0);
        setCatalogStats({ imoveis: total, quarteiroes: qs.length });
      })
      .catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este formulário? Esta ação não pode ser desfeita.")) return;
    await formsApi.remove(id);
    setMenuOpenId(null);
    load();
  };

  const handleExport = async (id, type) => {
    setMenuOpenId(null);
    const form = await formsApi.get(id);
    if (type === "csv") exportCSV(form);
    else if (type === "pdf") await exportPDF(form);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return iso;
    }
  };

  const atividadeShort = (val) =>
    ATIVIDADES.find((a) => a.value === val)?.label.split("–")[1]?.trim() || "Sem atividade";

  return (
    <div className="app-shell pb-28">
      {/* Header */}
      <header className="px-5 pt-8 pb-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="section-title">PNCD</p>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight font-display">
              Resumo Diário D1
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Serviço Antivetorial — Controle da Dengue
        </p>
      </header>

      {/* Stats */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Formulários</p>
          <p className="text-3xl font-semibold text-slate-900 font-display" data-testid="forms-count">
            {loading ? "…" : forms.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">salvos</p>
        </div>
        <button
          onClick={() => navigate("/catalogo")}
          className="bg-blue-800 hover:bg-blue-900 active:bg-blue-950 rounded-xl border border-blue-900 p-4 shadow-sm text-left transition-colors"
          data-testid="open-catalogo"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs text-blue-100 uppercase tracking-wider font-medium">Cadastro</p>
            <Database className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-2xl font-semibold text-white font-display mt-2">{catalogStats.imoveis || "…"}</p>
          <p className="text-xs text-blue-200 mt-1">imóveis · {catalogStats.quarteiroes} QT</p>
        </button>
      </div>

      {/* List */}
      <div className="px-5 mt-6">
        <p className="section-title mb-3">Histórico</p>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Carregando…</div>
        ) : forms.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center" data-testid="empty-state">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Nenhum formulário ainda</p>
            <p className="text-sm text-slate-500 mt-1">
              Toque no botão "+" para começar o seu primeiro D1.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                data-testid={`form-card-${f.id}`}
              >
                <button
                  onClick={() => navigate(`/form/${f.id}`)}
                  className="w-full text-left p-4 active:bg-slate-50 transition-colors"
                  data-testid={`open-form-${f.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="code-pill">FOLHA {f.folha || "—"}</span>
                        <span className="text-xs text-slate-500">{formatDate(f.data_atividade)}</span>
                      </div>
                      <p className="font-semibold text-slate-900 truncate">
                        {f.localidade || "Localidade não informada"}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {f.municipio || "—"} · {atividadeShort(f.atividade)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-semibold text-blue-800 font-display leading-none">
                        {f.total_visitas}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                        /20 visitas
                      </p>
                    </div>
                  </div>
                </button>
                <div className="border-t border-slate-100 flex divide-x divide-slate-100">
                  <button
                    onClick={() => navigate(`/form/${f.id}`)}
                    className="flex-1 py-2.5 text-sm text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 active:bg-slate-100"
                    data-testid={`edit-btn-${f.id}`}
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <div className="relative flex-1">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === f.id ? null : f.id)}
                      className="w-full py-2.5 text-sm text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 active:bg-slate-100"
                      data-testid={`export-menu-${f.id}`}
                    >
                      <Download className="w-4 h-4" /> Exportar
                    </button>
                    {menuOpenId === f.id && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                        <button
                          onClick={() => handleExport(f.id, "csv")}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          data-testid={`export-csv-${f.id}`}
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport(f.id, "pdf")}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          data-testid={`export-pdf-${f.id}`}
                        >
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="flex-1 py-2.5 text-sm text-red-600 flex items-center justify-center gap-1.5 hover:bg-red-50 active:bg-red-100"
                    data-testid={`delete-btn-${f.id}`}
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/form/new")}
        className="fixed bottom-6 right-6 left-6 sm:left-auto max-w-[608px] mx-auto sm:mx-0 sm:w-auto bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium rounded-xl px-6 py-4 shadow-[0_8px_32px_rgba(30,64,175,0.3)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] z-40"
        data-testid="new-form-btn"
      >
        <Plus className="w-5 h-5" />
        Novo Formulário
      </button>
    </div>
  );
};

export default Dashboard;
