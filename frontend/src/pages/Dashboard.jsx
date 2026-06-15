import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Trash2, Download, Edit3, ClipboardList, Database, WifiOff, Target, Printer, CloudOff, DownloadCloud, CheckCircle2, BarChart3, Copy, Eraser, AlertTriangle, CalendarClock, Bug, DoorClosed } from "lucide-react";
import { formsApi, catalogApi, trySync } from "@/lib/api";
import { ATIVIDADES, imovelKey } from "@/constants/d1";
import { exportCSV, exportPDF } from "@/lib/export";
import { useOnline } from "@/hooks/useOnline";
import { subscribeSyncState, getQueue, getLocalForms } from "@/lib/syncQueue";
import { subscribeBootstrap, runBootstrap } from "@/lib/offlineBootstrap";

const Dashboard = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [catalogStats, setCatalogStats] = useState({ imoveis: 0, quarteiroes: 0 });
  const [cycleProgress, setCycleProgress] = useState({ concluidos: 0, total: 0, imoveisVisitados: 0, imoveisTotal: 0 });
  const [cycleDeadline, setCycleDeadline] = useState(() => {
    try { return localStorage.getItem("pncd_cycle_deadline") || ""; } catch { return ""; }
  });
  const [syncState, setSyncState] = useState({
    queueSize: getQueue().length,
    localForms: getLocalForms(),
  });
  const [syncing, setSyncing] = useState(false);
  const [bootstrap, setBootstrap] = useState({ status: "idle", progress: 0, total: 0, message: "" });
  const online = useOnline();

  useEffect(() => {
    const unsub = subscribeBootstrap(setBootstrap);
    return unsub;
  }, []);

  useEffect(() => {
    // Re-leitura imediata + assina mudanças
    setSyncState({ queueSize: getQueue().length, localForms: getLocalForms() });
    const unsub = subscribeSyncState(setSyncState);
    // Reage também a mudanças no localStorage (outras abas/SW)
    const onStorage = (e) => {
      if (e.key === "pncd_sync_queue" || e.key === "pncd_local_forms") {
        setSyncState({ queueSize: getQueue().length, localForms: getLocalForms() });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Refresh quando voltar online (sync rodou)
  useEffect(() => {
    if (online && getQueue().length > 0) {
      setSyncing(true);
      trySync().then(() => {
        setSyncing(false);
        load();
      });
    }
  }, [online]);

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
    Promise.all([catalogApi.quarteiroes(), catalogApi.countImoveis()])
      .then(([qs, { total }]) => {
        setCatalogStats({ imoveis: total, quarteiroes: qs.length });
      })
      .catch(() => {});
    // Calcula progresso do ciclo: QT concluídos = todos imóveis do QT visitados
    Promise.all([
      catalogApi.imoveis(),
      catalogApi.visited().catch(() => ({ keys: [] })),
    ])
      .then(([ims, v]) => {
        const visitedSet = new Set(v.keys || []);
        const byQt = {};
        ims.forEach((im) => {
          const k = String(im.quarteirao || "");
          if (!k) return;
          if (!byQt[k]) byQt[k] = { total: 0, visitados: 0 };
          byQt[k].total += 1;
          if (visitedSet.has(imovelKey(im))) byQt[k].visitados += 1;
        });
        const qts = Object.values(byQt);
        const concluidos = qts.filter((q) => q.total > 0 && q.visitados >= q.total).length;
        const imoveisVisitados = ims.filter((im) => visitedSet.has(imovelKey(im))).length;
        setCycleProgress({
          concluidos,
          total: qts.length,
          imoveisVisitados,
          imoveisTotal: ims.length,
        });
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
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
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
          {!online && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md" data-testid="offline-badge">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
          {syncing && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md" data-testid="sync-pending">
              <CloudOff className="w-3 h-3" /> Sincronizando…
            </span>
          )}
          {!syncing && syncState.queueSize > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md" data-testid="sync-queue">
              <CloudOff className="w-3 h-3" /> {syncState.queueSize} na fila
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Serviço Antivetorial — Controle da Dengue
        </p>
      </header>

      {/* Bootstrap indicator */}
      {bootstrap.status === "running" && (
        <div className="px-5 mt-3" data-testid="bootstrap-running">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-blue-800">
            <DownloadCloud className="w-4 h-4 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Preparando uso offline…</p>
              <p className="text-blue-700/70 truncate">{bootstrap.message}</p>
            </div>
            {bootstrap.total > 0 && (
              <span className="text-[10px] font-semibold tabular-nums">
                {bootstrap.progress}/{bootstrap.total}
              </span>
            )}
          </div>
        </div>
      )}
      {bootstrap.status === "done" && bootstrap.lastRun && (
        <div className="px-5 mt-3" data-testid="bootstrap-done">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-green-800">
            <CheckCircle2 className="w-4 h-4" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Pronto para uso offline</p>
              <p className="text-green-700/70 truncate">Catálogo cacheado no dispositivo</p>
            </div>
            <button
              onClick={() => runBootstrap({ force: true })}
              className="text-[10px] font-semibold underline text-green-700 hover:text-green-900"
              data-testid="bootstrap-refresh"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {/* Cycle Progress Ring */}
      <div className="px-5 mt-5" data-testid="cycle-ring-card">
        {(() => {
          const total = cycleProgress.total || 0;
          const done = cycleProgress.concluidos || 0;
          const pending = Math.max(0, total - done);
          const pct = total > 0 ? (done / total) * 100 : 0;
          const r = 36;
          const C = 2 * Math.PI * r;
          const off = C - (Math.min(100, pct) / 100) * C;

          // Calcula dias restantes até o prazo
          let daysLeft = null;
          if (cycleDeadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dl = new Date(cycleDeadline + "T00:00:00");
            daysLeft = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          const urgent = daysLeft !== null && daysLeft <= 7 && pending > 0;
          const expired = daysLeft !== null && daysLeft < 0;

          const wrapBg = urgent
            ? "from-amber-700 via-amber-800 to-orange-900 border-amber-700 animate-pulse"
            : "from-slate-900 via-blue-950 to-blue-900 border-blue-950";
          const ringStops = urgent
            ? ["#fbbf24", "#f59e0b"]
            : ["#34d399", "#10b981"];
          const subTxt = urgent ? "text-amber-100/90" : "text-emerald-200/90";
          const dividerTxt = urgent ? "text-amber-100/70" : "text-emerald-200/70";
          const pctTxt = urgent ? "text-white" : "text-white";

          return (
            <>
              <button
                onClick={() => navigate("/resumo")}
                className={`w-full bg-gradient-to-br ${wrapBg} hover:brightness-110 active:brightness-95 rounded-2xl border shadow-lg p-5 flex items-center gap-5 transition-all text-left`}
              >
                <div className="relative shrink-0" data-testid="cycle-ring">
                  <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
                    <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                    <circle
                      cx="46" cy="46" r={r} fill="none"
                      stroke="url(#cycleGrad)"
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={C}
                      strokeDashoffset={off}
                      style={{ transition: "stroke-dashoffset 700ms ease" }}
                    />
                    <defs>
                      <linearGradient id="cycleGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={ringStops[0]} />
                        <stop offset="100%" stopColor={ringStops[1]} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-semibold ${pctTxt} font-display tabular-nums`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] ${subTxt} uppercase tracking-widest font-semibold`}>Ciclo atual</p>
                  <p className="text-2xl font-semibold text-white font-display leading-tight">
                    <span className="tabular-nums" data-testid="cycle-done">{done}</span>
                    <span className={`${dividerTxt} mx-1.5`}>/</span>
                    <span className="tabular-nums" data-testid="cycle-total">{total}</span>
                    <span className="text-sm text-white/85 font-normal ml-2">QT concluídos</span>
                  </p>
                  <p className={`text-[11px] ${urgent ? "text-amber-100/90" : "text-blue-200/80"} mt-1`}>
                    {cycleProgress.imoveisVisitados} de {cycleProgress.imoveisTotal} imóveis visitados
                  </p>
                  {urgent && (
                    <p className="text-[11px] text-amber-50 font-semibold mt-1.5 flex items-center gap-1" data-testid="cycle-urgent">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {expired ? `Prazo vencido — ${pending} QT pendente${pending !== 1 ? "s" : ""}` : `${daysLeft}d restante${daysLeft !== 1 ? "s" : ""} · ${pending} QT pendente${pending !== 1 ? "s" : ""}`}
                    </p>
                  )}
                  {!urgent && daysLeft !== null && (
                    <p className="text-[11px] text-blue-200/80 mt-1" data-testid="cycle-deadline-info">
                      Prazo: {daysLeft >= 0 ? `${daysLeft}d restantes` : "vencido"}
                    </p>
                  )}
                </div>
                <Target className={`w-5 h-5 ${urgent ? "text-amber-200" : "text-emerald-300/80"} shrink-0`} />
              </button>
              <div className="mt-2 flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-[11px] text-slate-600">
                  Prazo do ciclo:
                  <input
                    type="date"
                    className="ml-1.5 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-800"
                    value={cycleDeadline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCycleDeadline(val);
                      try {
                        if (val) localStorage.setItem("pncd_cycle_deadline", val);
                        else localStorage.removeItem("pncd_cycle_deadline");
                      } catch {}
                    }}
                    data-testid="cycle-deadline-input"
                  />
                </label>
                {cycleDeadline && (
                  <button
                    onClick={() => {
                      setCycleDeadline("");
                      try { localStorage.removeItem("pncd_cycle_deadline"); } catch {}
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 underline"
                    data-testid="cycle-deadline-clear"
                  >
                    limpar
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Stats */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
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

      <div className="px-5 mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate("/resumo")}
          className="bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 rounded-xl border border-green-800 p-3 shadow-sm text-left transition-colors"
          data-testid="open-resumo"
        >
          <Target className="w-5 h-5 text-emerald-200 mb-1.5" />
          <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">Ciclo</p>
          <p className="text-xs font-semibold text-white font-display leading-tight">Resumo</p>
        </button>
        <button
          onClick={() => navigate("/semanal")}
          className="bg-gradient-to-br from-indigo-600 to-blue-800 hover:from-indigo-700 hover:to-blue-900 rounded-xl border border-blue-900 p-3 shadow-sm text-left transition-colors"
          data-testid="open-semanal"
        >
          <BarChart3 className="w-5 h-5 text-indigo-200 mb-1.5" />
          <p className="text-[10px] text-indigo-100 uppercase tracking-wider font-medium">Semanal</p>
          <p className="text-xs font-semibold text-white font-display leading-tight">Estatísticas</p>
        </button>
        <button
          onClick={() => navigate("/fechadas")}
          className="bg-gradient-to-br from-rose-600 to-red-800 hover:from-rose-700 hover:to-red-900 rounded-xl border border-red-900 p-3 shadow-sm text-left transition-colors"
          data-testid="open-fechadas"
        >
          <DoorClosed className="w-5 h-5 text-rose-200 mb-1.5" />
          <p className="text-[10px] text-rose-100 uppercase tracking-wider font-medium">Pendente</p>
          <p className="text-xs font-semibold text-white font-display leading-tight">Casas Fechadas</p>
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3" data-testid="quick-actions">
        <button
          onClick={async () => {
            if (!forms.length) return;
            // Duplica o último formulário: copia cabeçalho + imóveis das visitas (sem dados de visita)
            try {
              const last = await formsApi.get(forms[0].id);
              const seedVisits = (last.visits || []).map((v) => ({
                quarteirao: v.quarteirao || "",
                lado: v.lado || "",
                logradouro: v.logradouro || "",
                numero: v.numero || "",
                seq: v.seq || "",
                tipo_imovel: v.tipo_imovel || "",
                visita_n: "",
                imovel_com_foco: false,
                imovel_tratado: false,
                larvicida: "",
                larvicida_quantidade: "",
                qtde_dep_tratados: "",
              }));
              const seed = {
                municipio: last.municipio || "",
                localidade: last.localidade || "",
                categoria: last.categoria || "",
                zona: last.zona || "",
                tipo: last.tipo || "",
                folha: last.folha || "",
                atividade: last.atividade || "",
                quarteiroes_trabalhados: last.quarteiroes_trabalhados || "",
                quarteiroes_concluidos: last.quarteiroes_concluidos || "",
                visits: seedVisits,
              };
              localStorage.setItem("pncd_duplicate_seed", JSON.stringify(seed));
              // Limpa eventual rascunho anterior do "new" para o seed vingar
              localStorage.removeItem("pncd_d1_draft_new");
              navigate("/form/new?duplicate=1");
            } catch (e) {
              alert("Não foi possível duplicar o último formulário.");
            }
          }}
          disabled={!forms.length}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-200 p-3 shadow-sm flex items-center gap-2 transition-colors"
          data-testid="duplicate-last-btn"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Copy className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Duplicar último</p>
            <p className="text-[11px] text-slate-500 truncate">Cabeçalho + imóveis</p>
          </div>
        </button>
        <button
          onClick={() => {
            if (!window.confirm("Limpar rascunho atual e iniciar um formulário em branco?")) return;
            try {
              localStorage.removeItem("pncd_d1_draft_new");
              localStorage.removeItem("pncd_duplicate_seed");
            } catch {}
            navigate("/form/new?fresh=1");
          }}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl border border-slate-200 p-3 shadow-sm flex items-center gap-2 transition-colors"
          data-testid="clear-form-btn"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <Eraser className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Limpar formulário</p>
            <p className="text-[11px] text-slate-500 truncate">Começar em branco</p>
          </div>
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
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  f.focos > 0 ? "border-amber-300 ring-1 ring-amber-200/50" : "border-slate-200"
                }`}
                data-testid={`form-card-${f.id}`}
              >
                <button
                  onClick={() => navigate(`/form/${f.id}`)}
                  className="w-full text-left p-4 active:bg-slate-50 transition-colors"
                  data-testid={`open-form-${f.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="code-pill">FOLHA {f.folha || "—"}</span>
                        <span className="text-xs text-slate-500">{formatDate(f.data_atividade)}</span>
                        {f._pending && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {f._pending === "create" ? "Aguardando envio" : "Edição pendente"}
                          </span>
                        )}
                        {f.focos > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded"
                            data-testid={`focos-badge-${f.id}`}
                            title={`${f.focos} imóve${f.focos === 1 ? "l" : "is"} com foco encontrado${f.focos === 1 ? "" : "s"}`}
                          >
                            <Bug className="w-3 h-3" />
                            {f.focos} {f.focos === 1 ? "foco" : "focos"}
                          </span>
                        )}
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
                      <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden min-w-[140px]">
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            navigate(`/print/${f.id}`);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          data-testid={`print-d1-${f.id}`}
                        >
                          <Printer className="w-4 h-4 text-slate-500" />
                          Imprimir D1
                        </button>
                        <button
                          onClick={() => handleExport(f.id, "pdf")}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          data-testid={`export-pdf-${f.id}`}
                        >
                          Salvar PDF
                        </button>
                        <button
                          onClick={() => handleExport(f.id, "csv")}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          data-testid={`export-csv-${f.id}`}
                        >
                          Salvar CSV
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
