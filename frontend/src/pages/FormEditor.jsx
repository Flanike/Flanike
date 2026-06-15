import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, ChevronRight, CheckCircle2, Circle, Download, WifiOff, Printer } from "lucide-react";
import { formsApi, catalogApi } from "@/lib/api";
import { ATIVIDADES, TIPOS_IMOVEL, LARVICIDAS, emptyForm, visitIsFilled } from "@/constants/d1";
import { exportCSV, exportPDF } from "@/lib/export";
import VisitModal from "@/components/VisitModal";
import { useOnline } from "@/hooks/useOnline";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-slate-400";

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-slate-400 mt-1 block">{hint}</span>}
  </label>
);

const SectionCard = ({ title, subtitle, children }) => (
  <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
      <h2 className="text-base font-semibold text-slate-900 font-display">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </section>
);

const FormEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [visitOpenIdx, setVisitOpenIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const online = useOnline();
  const draftKey = isNew ? "pncd_d1_draft_new" : `pncd_d1_draft_${id}`;

  useEffect(() => {
    // Tenta recuperar rascunho local
    let draft = null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }

    if (isNew) {
      if (draft) {
        setForm({ ...emptyForm(), ...draft });
        setDraftLoaded(true);
        setToast({ type: "info", msg: "Rascunho local restaurado" });
        setTimeout(() => setToast(null), 2500);
        // ainda assim, tenta carregar localidade para preencher campos vazios
      }
      catalogApi
        .localidade()
        .then((loc) => {
          if (!loc) {
            setDraftLoaded(true);
            return;
          }
          setForm((f) => ({
            ...f,
            municipio:
              f.municipio ||
              (loc.municipio_codigo
                ? `${loc.municipio_codigo} - ${loc.municipio_nome}`
                : loc.municipio_nome || ""),
            localidade:
              f.localidade ||
              (loc.localidade_codigo
                ? `${loc.localidade_codigo} - ${loc.localidade_nome}`
                : loc.localidade_nome || ""),
            zona: f.zona || loc.zona || "",
          }));
          setDraftLoaded(true);
        })
        .catch(() => setDraftLoaded(true));
      return;
    }

    (async () => {
      try {
        const data = await formsApi.get(id);
        const visits = [...(data.visits || [])];
        while (visits.length < 20) visits.push({});
        // Se existe rascunho mais novo que o servidor, prioriza-o
        const serverDate = data.updated_at ? new Date(data.updated_at).getTime() : 0;
        const draftDate = draft && draft._draft_at ? draft._draft_at : 0;
        if (draft && draftDate > serverDate) {
          setForm({ ...emptyForm(), ...draft });
          setToast({ type: "info", msg: "Rascunho local restaurado (mais recente)" });
          setTimeout(() => setToast(null), 2500);
        } else {
          setForm({ ...emptyForm(), ...data, visits: visits.slice(0, 20) });
        }
      } catch (e) {
        console.error(e);
        if (draft) {
          setForm({ ...emptyForm(), ...draft });
          setToast({ type: "info", msg: "Sem rede — usando rascunho local" });
          setTimeout(() => setToast(null), 2500);
        } else {
          setToast({ type: "error", msg: "Erro ao carregar formulário" });
        }
      } finally {
        setLoading(false);
        setDraftLoaded(true);
      }
    })();
  }, [id, isNew, draftKey]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setVisit = (idx, newVisit) =>
    setForm((f) => {
      const visits = [...f.visits];
      visits[idx] = newVisit;
      return { ...f, visits };
    });

  // Autosave do rascunho em localStorage (proteção contra perda de dados em campo)
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...form, _draft_at: Date.now() }));
    } catch {
      /* storage cheio — ignora */
    }
  }, [form, draftKey, draftLoaded]);

  // Pré-cache: ao alterar visitas, pré-busca imóveis dos quarteirões usados
  useEffect(() => {
    if (!draftLoaded) return;
    const qts = new Set();
    form.visits.forEach((v) => {
      if (v?.quarteirao) qts.add(String(v.quarteirao));
    });
    qts.forEach((qt) => {
      catalogApi.prefetchQuarteirao(qt);
    });
  }, [form.visits, draftLoaded]);

  const totals = useMemo(() => {
    const t = { R: 0, C: 0, TB: 0, PE: 0, O: 0 };
    form.visits.forEach((v) => {
      if (v.tipo_imovel && t[v.tipo_imovel] !== undefined) t[v.tipo_imovel] += 1;
    });
    const totalImoveis = form.visits.filter(visitIsFilled).length;
    const totalHab = 0; // not collected per visit in this layout
    const focos = form.visits.filter((v) => v.imovel_com_foco).length;
    const tratados = form.visits.filter((v) => v.imovel_tratado).length;
    return { ...t, totalImoveis, totalHab, focos, tratados };
  }, [form.visits]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await formsApi.create(form);
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        if (created?.id?.startsWith("local_")) {
          setToast({ type: "info", msg: "Sem internet — salvo na fila local" });
        } else {
          setToast({ type: "ok", msg: "Formulário criado!" });
        }
        navigate(`/form/${created.id}`, { replace: true });
      } else {
        const updated = await formsApi.update(id, form);
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        if (updated?._pending) {
          setToast({ type: "info", msg: "Sem internet — alteração na fila" });
        } else {
          setToast({ type: "ok", msg: "Alterações salvas" });
        }
      }
    } catch (e) {
      console.error(e);
      setToast({ type: "error", msg: "Erro ao salvar — rascunho mantido localmente" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleExport = async (type) => {
    setExportOpen(false);
    if (type === "csv") exportCSV(form);
    else await exportPDF(form);
  };

  if (loading) {
    return <div className="app-shell p-10 text-center text-slate-500">Carregando…</div>;
  }

  return (
    <div className="app-shell pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">PNCD · D1</p>
          <h1 className="text-base font-semibold text-slate-900 truncate font-display">
            {isNew ? "Novo Formulário" : form.localidade || "Formulário"}
          </h1>
        </div>
        {!online && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md" data-testid="offline-badge">
            <WifiOff className="w-3 h-3" /> Offline
          </span>
        )}
        {!isNew && (
          <div className="relative">
            <button onClick={() => setExportOpen(!exportOpen)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="header-export">
              <Download className="w-5 h-5 text-slate-700" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[140px]">
                <button
                  onClick={() => {
                    setExportOpen(false);
                    navigate(`/print/${id}`);
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                  data-testid="header-print"
                >
                  <Printer className="w-4 h-4 text-slate-500" /> Imprimir D1
                </button>
                <button onClick={() => handleExport("pdf")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50" data-testid="header-export-pdf">Salvar PDF</button>
                <button onClick={() => handleExport("csv")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50" data-testid="header-export-csv">Salvar CSV</button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="p-4 space-y-5">
        {/* Header info */}
        <SectionCard title="Identificação" subtitle="Cabeçalho do boletim">
          <Field label="Município">
            <input className={inputCls} value={form.municipio} onChange={(e) => set("municipio", e.target.value)} placeholder="Ex: 241120 - SANTA CRUZ" data-testid="input-municipio" />
          </Field>
          <Field label="Código e Nome da Localidade">
            <input className={inputCls} value={form.localidade} onChange={(e) => set("localidade", e.target.value)} placeholder="Ex: 246 - Conjunto Aluízio Bezerra" data-testid="input-localidade" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Categoria">
              <input className={inputCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="BR" data-testid="input-categoria" />
            </Field>
            <Field label="Zona">
              <input className={inputCls} value={form.zona} onChange={(e) => set("zona", e.target.value)} placeholder="14" data-testid="input-zona" />
            </Field>
            <Field label="Tipo">
              <input className={inputCls} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="Sede" data-testid="input-tipo" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Folha">
              <input className={inputCls} value={form.folha} onChange={(e) => set("folha", e.target.value)} placeholder="1/1" data-testid="input-folha" />
            </Field>
            <Field label="Data da Atividade">
              <input type="date" className={inputCls} value={form.data_atividade} onChange={(e) => set("data_atividade", e.target.value)} data-testid="input-data" />
            </Field>
          </div>
          <Field label="Atividade">
            <select className={inputCls} value={form.atividade} onChange={(e) => set("atividade", e.target.value)} data-testid="input-atividade">
              <option value="">Selecione...</option>
              {ATIVIDADES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quart. trabalhados" hint="Nº e sequência">
              <input className={inputCls} value={form.quarteiroes_trabalhados} onChange={(e) => set("quarteiroes_trabalhados", e.target.value)} data-testid="input-quart-trab" />
            </Field>
            <Field label="Quart. concluídos">
              <input className={inputCls} value={form.quarteiroes_concluidos} onChange={(e) => set("quarteiroes_concluidos", e.target.value)} data-testid="input-quart-conc" />
            </Field>
          </div>
        </SectionCard>

        {/* Visits */}
        <SectionCard title="Visitas (20 imóveis)" subtitle="Toque em uma linha para preencher">
          <div className="space-y-2">
            {form.visits.map((v, i) => {
              const filled = visitIsFilled(v);
              return (
                <button
                  key={i}
                  onClick={() => setVisitOpenIdx(i)}
                  className={`w-full text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.99] ${
                    filled
                      ? "bg-white border-slate-200 border-l-4 border-l-green-600 shadow-sm"
                      : "bg-white border-dashed border-slate-300 hover:bg-slate-50"
                  }`}
                  data-testid={`visit-card-${i}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${filled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {filled ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Visita {i + 1}</p>
                    {filled ? (
                      <p className="text-sm text-slate-800 truncate font-medium">
                        {v.logradouro || "—"}{v.numero ? `, ${v.numero}` : ""}
                        {v.tipo_imovel ? ` · ${v.tipo_imovel}` : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">Vazio — toque para preencher</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Totals */}
        <SectionCard title="Totais — Nº de Imóveis Trabalhados por Tipo" subtitle="Calculado automaticamente das 20 visitas">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TIPOS_IMOVEL.map((t) => (
              <div key={t.value} className="bg-slate-50 border border-slate-200 rounded-lg p-3" data-testid={`total-${t.value}`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t.label.split("–")[1]?.trim() || t.label}</p>
                <p className="text-2xl font-semibold text-slate-900 font-display">{totals[t.value] || 0}</p>
              </div>
            ))}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 col-span-2 sm:col-span-3">
              <p className="text-[10px] text-blue-700 uppercase tracking-widest font-medium">Total de imóveis</p>
              <p className="text-3xl font-semibold text-blue-900 font-display">{totals.totalImoveis}</p>
              <p className="text-xs text-blue-700/70 mt-1">{totals.focos} com foco · {totals.tratados} tratados</p>
            </div>
          </div>
        </SectionCard>

        {/* Deposits Treated */}
        <SectionCard title="Depósitos Tratados" subtitle="Tratamento focal — resumo">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Larvicida">
              <select className={inputCls} value={form.depositos_tratados.tipo} onChange={(e) => set("depositos_tratados", { ...form.depositos_tratados, tipo: e.target.value })} data-testid="dep-trat-tipo">
                {LARVICIDAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Quant. (g)">
              <input type="number" inputMode="decimal" step="0.01" className={inputCls} value={form.depositos_tratados.quantidade ?? ""} onChange={(e) => set("depositos_tratados", { ...form.depositos_tratados, quantidade: e.target.value })} data-testid="dep-trat-qtd" />
            </Field>
            <Field label="Dep. Trat.">
              <input type="number" inputMode="numeric" className={inputCls} value={form.depositos_tratados.qtde_dep_trat ?? ""} onChange={(e) => set("depositos_tratados", { ...form.depositos_tratados, qtde_dep_trat: e.target.value })} data-testid="dep-trat-num" />
            </Field>
          </div>
        </SectionCard>

        {/* Footer summary */}
        <SectionCard title="Resumo da Atividade">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Casas Fechadas">
              <input type="number" inputMode="numeric" className={inputCls} value={form.casas_fechadas} onChange={(e) => set("casas_fechadas", Number(e.target.value) || 0)} data-testid="casas-fechadas" />
            </Field>
            <Field label="Recuperadas">
              <input type="number" inputMode="numeric" className={inputCls} value={form.recuperadas} onChange={(e) => set("recuperadas", Number(e.target.value) || 0)} data-testid="recuperadas" />
            </Field>
            <Field label="Informados">
              <input type="number" inputMode="numeric" className={inputCls} value={form.informados} onChange={(e) => set("informados", Number(e.target.value) || 0)} data-testid="informados" />
            </Field>
          </div>
        </SectionCard>

        {/* Signatures */}
        <SectionCard title="Assinaturas">
          <Field label="Agente">
            <input className={inputCls} value={form.assinatura_agente} onChange={(e) => set("assinatura_agente", e.target.value)} placeholder="Nome do agente" data-testid="assinatura-agente" />
          </Field>
          <Field label="Supervisor">
            <input className={inputCls} value={form.assinatura_supervisor} onChange={(e) => set("assinatura_supervisor", e.target.value)} placeholder="Nome do supervisor" data-testid="assinatura-supervisor" />
          </Field>
        </SectionCard>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30">
        <div className="max-w-[640px] mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-medium rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 transition-colors"
            data-testid="save-btn"
          >
            <Save className="w-5 h-5" />
            {saving ? "Salvando…" : isNew ? "Salvar Formulário" : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "ok"
              ? "bg-green-600 text-white"
              : toast.type === "info"
              ? "bg-blue-700 text-white"
              : "bg-red-600 text-white"
          }`}
          data-testid="toast"
        >
          {toast.msg}
        </div>
      )}

      {/* Visit modal */}
      <VisitModal
        open={visitOpenIdx !== null}
        index={visitOpenIdx ?? 0}
        visit={visitOpenIdx !== null ? form.visits[visitOpenIdx] : {}}
        onChange={(nv) => setVisit(visitOpenIdx, nv)}
        onClose={() => setVisitOpenIdx(null)}
      />
    </div>
  );
};

export default FormEditor;
