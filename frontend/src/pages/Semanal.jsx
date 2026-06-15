import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { statsApi } from "@/lib/api";

const Semanal = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ weeks: [], total: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi
      .weekly()
      .then(setData)
      .catch(() => setData({ weeks: [], total: {} }))
      .finally(() => setLoading(false));
  }, []);

  const maxInformados = useMemo(
    () => Math.max(1, ...data.weeks.map((w) => w.informados || 0)),
    [data.weeks]
  );

  const formatRange = (start, end) => {
    if (!start) return "—";
    const fmt = (s) => {
      const [y, m, d] = s.split("-");
      return `${d}/${m}`;
    };
    return `${fmt(start)} – ${fmt(end)}`;
  };

  if (loading)
    return <div className="app-shell p-10 text-center text-slate-500">Calculando…</div>;

  const noData = data.weeks.length === 0;

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
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">PNCD · Semanal</p>
          <h1 className="text-base font-semibold text-slate-900 truncate font-display">Resumo Semanal</h1>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Total acumulado */}
        <section className="bg-gradient-to-br from-indigo-700 to-blue-900 rounded-2xl text-white p-6 shadow-lg" data-testid="weekly-hero">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest font-medium">Acumulado</p>
              <p className="text-3xl font-semibold font-display mt-1">{data.total.informados || 0}</p>
              <p className="text-xs text-blue-100 mt-1">imóveis informados em {data.weeks.length} semana(s)</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-300" />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Trab.</p>
              <p className="text-lg font-semibold font-display">{data.total.trabalhados || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Pend.</p>
              <p className="text-lg font-semibold font-display">{data.total.pendentes || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Recup.</p>
              <p className="text-lg font-semibold font-display">{data.total.recuperados || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Focos</p>
              <p className="text-lg font-semibold font-display">{data.total.focos || 0}</p>
            </div>
          </div>
        </section>

        {noData ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Sem dados ainda</p>
            <p className="text-sm text-slate-500 mt-1">Preencha formulários com data e visitas para ver o resumo semanal.</p>
          </div>
        ) : (
          <>
            {/* Gráfico de barras */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="weekly-chart">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-800" />
                <h2 className="text-base font-semibold text-slate-900 font-display">Imóveis informados por semana</h2>
              </div>
              <div className="p-5 space-y-3">
                {data.weeks.map((w) => {
                  const pct = (w.informados / maxInformados) * 100;
                  return (
                    <div key={w.week} data-testid={`week-bar-${w.week}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-700 font-medium">{w.week}</span>
                        <span className="text-xs text-slate-500">
                          {formatRange(w.start, w.end)} · <span className="font-semibold text-slate-900">{w.informados}</span>
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tabela detalhada (estilo RESUMO da planilha) */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-base font-semibold text-slate-900 font-display">Detalhamento por semana</h2>
                <p className="text-xs text-slate-500 mt-0.5">Estilo da aba RESUMO</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 uppercase tracking-wider">Semana</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">QT Conc.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">Inform.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">Trab.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">Pend.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">Recup.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700 uppercase tracking-wider">Focos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeks.map((w) => (
                      <tr key={w.week} className="border-b border-slate-50" data-testid={`week-row-${w.week}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {w.week}
                          <div className="text-[10px] text-slate-500 font-normal">{formatRange(w.start, w.end)}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.quarteiroes_count}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{w.informados}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.trabalhados}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.pendentes}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.recuperados}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.focos}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-semibold text-blue-900" data-testid="week-total">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right tabular-nums">—</td>
                      <td className="px-3 py-2 text-right tabular-nums">{data.total.informados || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{data.total.trabalhados || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{data.total.pendentes || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{data.total.recuperados || 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{data.total.focos || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Semanal;
