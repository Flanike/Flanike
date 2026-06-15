import { useEffect, useState, useMemo } from "react";
import { X, Search, MapPin, CheckCircle2, Plus } from "lucide-react";
import { catalogApi } from "@/lib/api";
import { imovelKey } from "@/constants/d1";
import ImovelEditor from "@/components/ImovelEditor";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

const tipoBadge = {
  R: "bg-green-50 text-green-700 border-green-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
  TB: "bg-slate-100 text-slate-600 border-slate-300",
  PE: "bg-purple-50 text-purple-700 border-purple-200",
  O: "bg-blue-50 text-blue-700 border-blue-200",
};

const ImovelPicker = ({ open, onClose, onPick, defaultQuarteirao = "" }) => {
  const [quarteiroes, setQuarteiroes] = useState([]);
  const [qt, setQt] = useState(defaultQuarteirao);
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [editorOpen, setEditorOpen] = useState(false);

  const reloadImoveis = () => {
    if (!qt) return;
    catalogApi.imoveis({ quarteirao: qt }).then(setImoveis).catch(() => setImoveis([]));
    catalogApi.quarteiroes().then(setQuarteiroes).catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    catalogApi.quarteiroes().then(setQuarteiroes).catch(() => setQuarteiroes([]));
    catalogApi
      .visited()
      .then((v) => setVisitedSet(new Set(v.keys || [])))
      .catch(() => setVisitedSet(new Set()));
  }, [open]);

  useEffect(() => {
    setQt(defaultQuarteirao);
  }, [defaultQuarteirao, open]);

  useEffect(() => {
    if (!open || !qt) {
      setImoveis([]);
      return;
    }
    setLoading(true);
    catalogApi
      .imoveis({ quarteirao: qt })
      .then(setImoveis)
      .catch(() => setImoveis([]))
      .finally(() => setLoading(false));
  }, [qt, open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return imoveis;
    const s = search.toLowerCase();
    return imoveis.filter(
      (i) =>
        i.logradouro.toLowerCase().includes(s) ||
        String(i.numero).toLowerCase().includes(s)
    );
  }, [imoveis, search]);

  const byLado = useMemo(() => {
    const map = {};
    filtered.forEach((i) => {
      const key = i.lado || "—";
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return map;
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center" data-testid="imovel-picker">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Cadastro</p>
            <h2 className="text-xl font-semibold text-slate-900 font-display">Selecionar Imóvel</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorOpen(true)}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5"
              data-testid="picker-new-imovel"
              title="Adicionar imóvel novo ao cadastro"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              data-testid="close-picker"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Quarteirão</span>
            <select
              className={inputCls}
              value={qt}
              onChange={(e) => setQt(e.target.value)}
              data-testid="picker-qt-select"
            >
              <option value="">Selecione um quarteirão…</option>
              {quarteiroes.map((q) => (
                <option key={q.quarteirao} value={q.quarteirao}>
                  QT {q.quarteirao} — {q.soma_imoveis} imóveis (R:{q.residencia} C:{q.comercio} TB:{q.terreno_baldio})
                </option>
              ))}
            </select>
          </label>
          {qt && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Buscar logradouro ou nº…"
                className={`${inputCls} pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="picker-search"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!qt ? (
            <div className="p-8 text-center text-slate-500">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>Escolha um quarteirão para ver os imóveis cadastrados.</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-slate-500">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum imóvel encontrado.</div>
          ) : (
            Object.keys(byLado)
              .sort((a, b) => Number(a) - Number(b))
              .map((lado) => (
                <div key={lado} className="border-b border-slate-100 last:border-0">
                  <p className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold bg-slate-50">
                    Lado {lado}
                  </p>
                  <div className="divide-y divide-slate-100">
                    {byLado[lado].map((im) => {
                      const visited = visitedSet.has(imovelKey(im));
                      return (
                        <button
                          key={im.id}
                          onClick={() => onPick(im)}
                          className={`w-full text-left px-5 py-3 hover:bg-blue-50 active:bg-blue-100 flex items-center gap-3 transition-colors ${visited ? "bg-green-50/30" : ""}`}
                          data-testid={`pick-imovel-${im.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {im.logradouro || "—"}
                                {im.numero ? `, ${im.numero}` : ""}
                                {im.seq ? ` (seq ${im.seq})` : ""}
                              </p>
                              {visited && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                            </div>
                            <p className="text-xs text-slate-500">
                              {im.hab > 0 && `${im.hab} hab.`}
                              {im.cao > 0 && ` · ${im.cao} cão`}
                              {im.gato > 0 && ` · ${im.gato} gato`}
                              {!im.hab && !im.cao && !im.gato && "Sem moradores cadastrados"}
                              {visited && <span className="ml-2 text-green-700 font-medium">· Visitado</span>}
                            </p>
                          </div>
                          {im.tipo_imovel && (
                            <span className={`text-[11px] font-semibold px-2 py-1 rounded-md border ${tipoBadge[im.tipo_imovel] || "bg-slate-100 text-slate-600 border-slate-300"}`}>
                              {im.tipo_imovel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <ImovelEditor
        open={editorOpen}
        mode="create"
        defaultQuarteirao={qt || defaultQuarteirao}
        onClose={() => setEditorOpen(false)}
        onSaved={(novo) => {
          // Atualiza listas e seleciona o quarteirão do novo
          if (novo?.quarteirao && novo.quarteirao !== qt) setQt(novo.quarteirao);
          reloadImoveis();
          setEditorOpen(false);
          // Já preenche a visita com o imóvel recém criado
          onPick(novo);
        }}
      />
    </div>
  );
};

export default ImovelPicker;
