import { useEffect, useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { TIPOS_IMOVEL, LADOS } from "@/constants/d1";
import { catalogApi } from "@/lib/api";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

const empty = {
  quarteirao: "",
  lado: "",
  logradouro: "",
  numero: "",
  seq: "",
  tipo_imovel: "",
  hab: 0,
  cao: 0,
  gato: 0,
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">{label}</span>
    {children}
  </label>
);

const ImovelEditor = ({ open, mode, imovel, defaultQuarteirao, onClose, onSaved, onDeleted }) => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && imovel) {
      setForm({ ...empty, ...imovel });
    } else {
      setForm({ ...empty, quarteirao: defaultQuarteirao || "" });
    }
    setErr("");
  }, [open, mode, imovel, defaultQuarteirao]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.quarteirao || !form.logradouro) {
      setErr("Quarteirão e logradouro são obrigatórios.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        ...form,
        hab: Number(form.hab) || 0,
        cao: Number(form.cao) || 0,
        gato: Number(form.gato) || 0,
      };
      let saved;
      if (mode === "edit" && imovel?.id) {
        saved = await catalogApi.updateImovel(imovel.id, payload);
      } else {
        saved = await catalogApi.createImovel(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Excluir este imóvel do cadastro?")) return;
    setSaving(true);
    try {
      await catalogApi.deleteImovel(imovel.id);
      onDeleted?.(imovel);
      onClose?.();
    } catch (e) {
      setErr("Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center" data-testid="imovel-editor">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Cadastro</p>
            <h2 className="text-xl font-semibold text-slate-900 font-display">
              {mode === "edit" ? "Editar imóvel" : "Novo imóvel"}
            </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="close-editor">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2" data-testid="editor-error">{err}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quarteirão *">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={form.quarteirao} onChange={(e) => set("quarteirao", e.target.value.replace(/[^0-9]/g, ""))} placeholder="1" data-testid="ed-quarteirao" />
            </Field>
            <Field label="Lado">
              <select
                className={inputCls}
                value={form.lado}
                onChange={(e) => set("lado", e.target.value)}
                data-testid="ed-lado"
              >
                {LADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Nome do Logradouro *">
            <input className={inputCls} value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="R - MARIA ROSA S. A." data-testid="ed-logradouro" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Número">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value.replace(/[^0-9]/g, ""))} data-testid="ed-numero" />
            </Field>
            <Field label="Seq.">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={form.seq} onChange={(e) => set("seq", e.target.value.replace(/[^0-9]/g, ""))} data-testid="ed-seq" />
            </Field>
            <Field label="Tipo">
              <select className={inputCls} value={form.tipo_imovel} onChange={(e) => set("tipo_imovel", e.target.value)} data-testid="ed-tipo">
                <option value="">—</option>
                {TIPOS_IMOVEL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <Field label="Habitantes">
              <input type="number" inputMode="numeric" min="0" className={inputCls} value={form.hab} onChange={(e) => set("hab", e.target.value)} data-testid="ed-hab" />
            </Field>
            <Field label="Cão">
              <input type="number" inputMode="numeric" min="0" className={inputCls} value={form.cao} onChange={(e) => set("cao", e.target.value)} data-testid="ed-cao" />
            </Field>
            <Field label="Gato">
              <input type="number" inputMode="numeric" min="0" className={inputCls} value={form.gato} onChange={(e) => set("gato", e.target.value)} data-testid="ed-gato" />
            </Field>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 bg-white flex gap-2">
          {mode === "edit" && (
            <button
              onClick={del}
              disabled={saving}
              className="bg-white border border-red-300 hover:bg-red-50 text-red-700 font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="ed-delete"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2"
            data-testid="ed-save"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImovelEditor;
