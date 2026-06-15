import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, TrendingUp, MapPin, CheckCircle2, Clock } from "lucide-react";
import { catalogApi, formsApi } from "@/lib/api";
import { imovelKey } from "@/constants/d1";

const Resumo = () => {
  const navigate = useNavigate();
  const [quarteiroes, setQuarteiroes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      catalogApi.quarteiroes(),
      catalogApi.imoveis(),
      catalogApi.visited().catch(() => ({ keys: [] })),
      formsApi.list().catch(() => []),
    ])
      .then(([qs, ims, v, fs]) => {
        setQuarteiroes(qs);
        setImoveis(ims);
        setVisitedSet(new Set(v.keys || []));
        setForms(fs);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const byQt = {};
    imoveis.forEach((im) => {
      const k = im.quarteirao;
      if (!byQt[k]) byQt[k] = { total: 0, visitados: 0, lados: new Set() };
      byQt[k].total += 1;
      byQt[k].lados.add(im.lado);
      if (visitedSet.has(imovelKey(im))) byQt[k].visitados += 1;
    });

    const rows = quarteiroes
      .map((q) => {
        const data = byQt[q.quarteirao] || { total: q.soma_imoveis || 0, visitados: 0 };
        const pct = data.total > 0 ? (data.visitados / data.total) * 100 : 0;
        return {
          quarteirao: q.quarteirao,
          total: data.total,
          visitados: data.visitados,
          pendentes: data.total - data.visitados,
          pct,
          habitantes: q.habitantes,
          status:
            pct >= 100 ? "concluido" : pct > 0 ? "andamento" : "nao_iniciado",
        };
      })
      .sort((a, b) => Number(a.quarteirao) - Number(b.quarteirao));

    const totalImoveis = imoveis.length;
    const totalVisitados = imoveis.filter((im) => visitedSet.has(imovelKey(im))).length;
    const totalPendentes = totalImoveis - totalVisitados;
    const concluidos = rows.filter((r) => r.status === "concluido").length;
    const andamento = rows.filter((r) => r.status === "andamento").length;
    const naoIniciados = rows.filter((r) => r.status === "nao_iniciado").length;
    const pctGeral = totalImoveis > 0 ? (totalVisitados / totalImoveis) * 100 : 0;

    return {
      rows,
      totalImoveis,
      totalVisitados,
      totalPendentes,
      concluidos,
      andamento,
      naoIniciados,
      pctGeral,
      totalForms: forms.length,
    };
  }, [imoveis, quarteiroes, visitedSet, forms]);

  if (loading)
    return <div className="app-shell p-10 text-center text-slate-500">Calculando…</div>;

  return (
    <div className="app-shell pb-10">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">PNCD · Ciclo</p>
          <h1 className="text-base font-semibold text-slate-900 truncate font-display">Resumo do Ciclo</h1>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Big progress hero */}
        <section className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl text-white p-6 shadow-lg" data-testid="hero-stats">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest font-medium">Progresso geral</p>
              <p className="text-5xl font-semibold font-display mt-1">{stats.pctGeral.toFixed(1)}%</p>
              <p className="text-xs text-blue-100 mt-1">
                {stats.totalVisitados} de {stats.totalImoveis} imóveis · {stats.totalForms} formulários
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-300" />
          </div>
          <div className="mt-4 h-3 bg-blue-950/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(100, stats.pctGeral)}%` }}
              data-testid="overall-bar"
            />
          </div>
        </section>

        {/* Quarteirão counts */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-green-200 p-3" data-testid="stat-concluidos">
            <CheckCircle2 className="w-4 h-4 text-green-600 mb-1" />
            <p className="text-2xl font-semibold text-green-800 font-display leading-none">{stats.concluidos}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Concluídos</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3" data-testid="stat-andamento">
            <Clock className="w-4 h-4 text-amber-600 mb-1" />
            <p className="text-2xl font-semibold text-amber-800 font-display leading-none">{stats.andamento}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Em andamento</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3" data-testid="stat-naoiniciados">
            <MapPin className="w-4 h-4 text-slate-400 mb-1" />
            <p className="text-2xl font-semibold text-slate-700 font-display leading-none">{stats.naoIniciados}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">A iniciar</p>
          </div>
        </section>

        {/* Per QT list */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-800" />
            <h2 className="text-base font-semibold text-slate-900 font-display">Progresso por Quarteirão</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.rows.map((r) => {
              const color =
                r.status === "concluido"
                  ? "bg-green-500"
                  : r.status === "andamento"
                  ? "bg-amber-500"
                  : "bg-slate-300";
              return (
                <div
                  key={r.quarteirao}
                  className="px-5 py-3"
                  data-testid={`qt-row-${r.quarteirao}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="code-pill">QT {r.quarteirao}</span>
                      <span className="text-sm text-slate-700">
                        {r.visitados}/{r.total}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        r.status === "concluido"
                          ? "text-green-700"
                          : r.status === "andamento"
                          ? "text-amber-700"
                          : "text-slate-500"
                      }`}
                    >
                      {r.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, r.pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Resumo;
