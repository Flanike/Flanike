import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, DoorClosed, MapPin, Search, Filter, FileText } from "lucide-react";
import { statsApi } from "@/lib/api";

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
};

const Fechadas = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qtFilter, setQtFilter] = useState("all");

  useEffect(() => {
    statsApi
      .fechadas()
      .then(setData)
      .catch(() => setData({ items: [], total: 0, by_quarteirao: [], by_logradouro: [], by_week: [] }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    let arr = data.items;
    if (qtFilter !== "all") arr = arr.filter((i) => String(i.quarteirao) === String(qtFilter));
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(
        (i) =>
          (i.logradouro || "").toLowerCase().includes(s) ||
          String(i.numero || "").toLowerCase().includes(s) ||
          (i.folha || "").toLowerCase().includes(s)
      );
    }
    return arr;
  }, [data, search, qtFilter]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = [
      "data",
      "folha",
      "municipio",
      "localidade",
      "quarteirao",
      "lado",
      "logradouro",
      "numero",
      "tipo_imovel",
      "visita_n",
    ];
    const escape = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = filtered.map((i) =>
      header.map((h) => escape(i[h] === undefined ? i[h === "data" ? "data_atividade" : h] : i[h])).join(",")
    );
    // ajusta a coluna "data" para data_atividade
    const csv =
      header.join(",") +
      "\n" +
      filtered
        .map((i) =>
          [
            escape(i.data_atividade),
            escape(i.folha),
            escape(i.municipio),
            escape(i.localidade),
            escape(i.quarteirao),
            escape(i.lado),
            escape(i.logradouro),
            escape(i.numero),
            escape(i.tipo_imovel),
            escape(i.visita_n),
          ].join(",")
        )
        .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casas-fechadas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 font-display">Casas Fechadas</h1>
            <p className="text-xs text-slate-500">Imóveis com pendência F — para retorno</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!filtered.length}
            className="w-10 h-10 rounded-full hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700"
            data-testid="export-csv-btn"
            title="Exportar CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-5">
        {/* Hero */}
        <section className="bg-gradient-to-br from-rose-700 via-rose-800 to-red-900 rounded-2xl border border-rose-800 p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <DoorClosed className="w-7 h-7 text-rose-100" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-rose-200/90 uppercase tracking-widest font-semibold">Total acumulado</p>
              <p className="text-3xl font-semibold text-white font-display leading-tight tabular-nums" data-testid="fechadas-total">
                {loading ? "…" : data?.total || 0}
              </p>
              <p className="text-xs text-rose-100/85 mt-1">
                {data?.by_quarteirao?.length || 0} quarteir{data?.by_quarteirao?.length === 1 ? "ão" : "ões"} com fechadas
              </p>
            </div>
          </div>
        </section>

        {/* By QT chips */}
        {data?.by_quarteirao?.length > 0 && (
          <section data-testid="by-qt-section">
            <p className="section-title mb-2">Por quarteirão</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setQtFilter("all")}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                  qtFilter === "all"
                    ? "bg-blue-800 border-blue-800 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                data-testid="qt-filter-all"
              >
                Todos · {data.total}
              </button>
              {data.by_quarteirao.map((q) => (
                <button
                  key={q.quarteirao}
                  onClick={() => setQtFilter(q.quarteirao)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                    String(qtFilter) === String(q.quarteirao)
                      ? "bg-blue-800 border-blue-800 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  data-testid={`qt-filter-${q.quarteirao}`}
                >
                  QT {q.quarteirao} · {q.count}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Top streets */}
        {data?.by_logradouro?.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm" data-testid="top-streets">
            <p className="section-title mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Logradouros com mais fechadas
            </p>
            <div className="space-y-1.5">
              {data.by_logradouro.slice(0, 6).map((l) => (
                <div key={l.logradouro} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate min-w-0 flex-1 pr-2">{l.logradouro}</span>
                  <span className="text-rose-700 font-semibold tabular-nums shrink-0">{l.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <section>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar logradouro, nº ou folha…"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:border-blue-800 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
            />
          </div>
        </section>

        {/* List */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="section-title flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              {filtered.length} imóve{filtered.length === 1 ? "l" : "is"}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
              <DoorClosed className="w-9 h-9 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">Nenhuma casa fechada encontrada</p>
              <p className="text-xs text-slate-500 mt-1">
                {search || qtFilter !== "all" ? "Tente ajustar os filtros." : "Marque pendência F nas visitas para que apareçam aqui."}
              </p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="fechadas-list">
              {filtered.map((i, idx) => (
                <button
                  key={`${i.form_id}-${i.visit_index}-${idx}`}
                  onClick={() => navigate(`/form/${i.form_id}`)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-rose-300 active:bg-rose-50/60 p-3 flex items-start gap-3 transition-colors"
                  data-testid={`fechada-item-${idx}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <DoorClosed className="w-4 h-4 text-rose-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="code-pill">QT {i.quarteirao || "—"}</span>
                      {i.lado && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          Lado {i.lado}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        <FileText className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                        {i.folha || "—"}
                      </span>
                      <span className="text-[10px] text-slate-500">{formatDate(i.data_atividade)}</span>
                    </div>
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {i.logradouro || "—"}, {i.numero || "s/n"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {i.tipo_imovel ? `Tipo ${i.tipo_imovel}` : ""}
                      {i.visita_n ? ` · Visita ${i.visita_n}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Fechadas;
