import { useState } from "react";
import { X, Check, Database } from "lucide-react";
import {
  TIPOS_IMOVEL, TIPOS_VISITA, PENDENCIAS, LADOS, LARVICIDAS,
} from "@/constants/d1";
import ImovelPicker from "@/components/ImovelPicker";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">{label}</span>
    {children}
  </label>
);

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-slate-400";

const VisitModal = ({ open, index, visit, onChange, onClose }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!open) return null;
  const set = (key, val) => onChange({ ...visit, [key]: val });

  const handlePick = (im) => {
    onChange({
      ...visit,
      quarteirao: im.quarteirao || visit.quarteirao,
      lado: im.lado || visit.lado,
      logradouro: im.logradouro || "",
      numero: im.numero ? String(im.numero) : "",
      seq_numero: im.seq ? String(im.seq) : "",
      tipo_imovel: im.tipo_imovel || visit.tipo_imovel,
    });
    setPickerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center" data-testid="visit-modal">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Visita</p>
            <h2 className="text-xl font-semibold text-slate-900 font-display">#{index + 1}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
            data-testid="close-visit-modal"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full border border-blue-200 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors"
            data-testid="open-imovel-picker"
          >
            <Database className="w-4 h-4" />
            Buscar no cadastro
          </button>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Quart.">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={visit.quarteirao} onChange={(e) => set("quarteirao", e.target.value.replace(/[^0-9]/g, ""))} data-testid="visit-quarteirao" />
            </Field>
            <Field label="Seq.">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={visit.sequencia} onChange={(e) => set("sequencia", e.target.value.replace(/[^0-9]/g, ""))} data-testid="visit-sequencia" />
            </Field>
            <Field label="Lado">
              <select className={inputCls} value={visit.lado} onChange={(e) => set("lado", e.target.value)} data-testid="visit-lado">
                {LADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Nome do Logradouro">
            <input className={inputCls} value={visit.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Ex: Rua das Flores" data-testid="visit-logradouro" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Número">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={visit.numero} onChange={(e) => set("numero", e.target.value.replace(/[^0-9]/g, ""))} data-testid="visit-numero" />
            </Field>
            <Field label="Sequência">
              <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputCls} value={visit.seq_numero} onChange={(e) => set("seq_numero", e.target.value.replace(/[^0-9]/g, ""))} data-testid="visit-seq-numero" />
            </Field>
            <Field label="Complemento">
              <input className={inputCls} value={visit.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto 12" data-testid="visit-complemento" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo do Imóvel">
              <select className={inputCls} value={visit.tipo_imovel} onChange={(e) => set("tipo_imovel", e.target.value)} data-testid="visit-tipo-imovel">
                <option value="">—</option>
                {TIPOS_IMOVEL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Hora Entrada">
              <input type="time" className={inputCls} value={visit.hora_entrada} onChange={(e) => set("hora_entrada", e.target.value)} data-testid="visit-hora" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo da Visita">
              <select className={inputCls} value={visit.tipo_visita} onChange={(e) => set("tipo_visita", e.target.value)} data-testid="visit-tipo-visita">
                <option value="">—</option>
                {TIPOS_VISITA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Pendência">
              <select className={inputCls} value={visit.pendencia} onChange={(e) => set("pendencia", e.target.value)} data-testid="visit-pendencia">
                {PENDENCIAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Nº Depósitos Eliminados">
            <input type="number" inputMode="numeric" className={inputCls} value={visit.depositos_eliminados ?? ""} onChange={(e) => set("depositos_eliminados", e.target.value)} data-testid="visit-dep-eliminados" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 cursor-pointer min-w-0">
              <input type="checkbox" className="w-5 h-5 accent-blue-700 shrink-0" checked={visit.imovel_com_foco} onChange={(e) => set("imovel_com_foco", e.target.checked)} data-testid="visit-foco" />
              <span className="text-sm font-medium text-slate-800 leading-tight">Imóvel c/ foco</span>
            </label>
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 cursor-pointer min-w-0">
              <input type="checkbox" className="w-5 h-5 accent-blue-700 shrink-0" checked={visit.imovel_tratado} onChange={(e) => set("imovel_tratado", e.target.checked)} data-testid="visit-tratado" />
              <span className="text-sm font-medium text-slate-800 leading-tight">Imóvel tratado</span>
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="section-title mb-3">Tratamento Focal</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Larvicida">
                <select className={inputCls} value={visit.larvicida_tipo} onChange={(e) => set("larvicida_tipo", e.target.value)} data-testid="visit-larvicida">
                  {LARVICIDAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Quant. (g)">
                <input type="number" inputMode="decimal" step="0.01" className={inputCls} value={visit.larvicida_quantidade ?? ""} onChange={(e) => set("larvicida_quantidade", e.target.value)} data-testid="visit-larv-qtd" />
              </Field>
              <Field label="Qtd. Dep. Trat.">
                <input type="number" inputMode="numeric" className={inputCls} value={visit.qtde_dep_tratados ?? ""} onChange={(e) => set("qtde_dep_tratados", e.target.value)} data-testid="visit-dep-trat" />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2"
            data-testid="save-visit-btn"
          >
            <Check className="w-5 h-5" /> Concluir Visita
          </button>
        </div>
      </div>
      <ImovelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        defaultQuarteirao={visit.quarteirao || ""}
      />
    </div>
  );
};

export default VisitModal;
