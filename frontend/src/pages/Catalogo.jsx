import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Building2, Home, Trees, Store, Landmark, CheckCircle2, Plus, Pencil } from "lucide-react";
import { catalogApi } from "@/lib/api";
import { imovelKey } from "@/constants/d1";
import ImovelEditor from "@/components/ImovelEditor";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

const tipoMeta = {
  R: { label: "Residência", icon: Home, color: "text-green-700 bg-green-50 border-green-200" },
  C: { label: "Comércio", icon: Store, color: "text-amber-700 bg-amber-50 border-amber-200" },
  TB: { label: "Terreno Baldio", icon: Trees, color: "text-slate-600 bg-slate-100 border-slate-300" },
  PE: { label: "Ponto Estratégico", icon: Landmark, color: "text-purple-700 bg-purple-50 border-purple-200" },
  O: { label: "Outros", icon: Building2, color: "text-blue-700 bg-blue-50 border-blue-200" },
};

const Catalogo = () => {
  const navigate = useNavigate();
  const [loc, setLoc] = useState(null);
  const [quarteiroes, setQuarteiroes] = useState([]);
  const [selectedQt, setSelectedQt] = useState("");
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [filterVisited, setFilterVisited] = useState("all"); // all | visited | pending
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create"); // create | edit
  const [editingImovel, setEditingImovel] = useState(null);

  const reloadAll = () => {
    Promise.all([
      catalogApi.quarteiroes(),
      catalogApi.visited().catch(() => ({ keys: [] })),
    ]).then(([qs, v]) => {
      setQuarteiroes(qs);
      setVisitedSet(new Set(v.keys || []));
    });
    if (selectedQt) {
      catalogApi.imoveis({ quarteirao: selectedQt }).then(setImoveis).catch(() => {});
    }
  };

  const handleEdit = (im) => {
    setEditorMode("edit");
    setEditingImovel(im);
    setEditorOpen(true);
  };
  const handleNew = () => {
    setEditorMode("create");
    setEditingImovel(null);
    setEditorOpen(true);
  };

  useEffect(() => {
    Promise.all([
      catalogApi.localidade(),
      catalogApi.quarteiroes(),
      catalogApi.visited().catch(() => ({ keys: [] })),
    ])
      .then(([l, qs, v]) => {
        setLoc(l);
        setQuarteiroes(qs);
        setVisitedSet(new Set(v.keys || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedQt) {
      setImoveis([]);
      return;
    }
    catalogApi.imoveis({ quarteirao: selectedQt }).then(setImoveis).catch(() => setImoveis([]));
  }, [selectedQt]);

  const filtered = useMemo(() => {
    let arr = imoveis;
    if (filterVisited === "visited")
      arr = arr.filter((i) => visitedSet.has(imovelKey(i)));
    else if (filterVisited === "pending")
      arr = arr.filter((i) => !visitedSet.has(imovelKey(i)));
    if (!search.trim()) return arr;
    const s = search.toLowerCase();
    return arr.filter(
      (i) =>
        i.logradouro.toLowerCase().includes(s) ||
        String(i.numero).toLowerCase().includes(s)
    );
  }, [imoveis, search, visitedSet, filterVisited]);

  const qtStats = useMemo(() => {
    if (!selectedQt) return null;
    const total = imoveis.length;
    const visitados = imoveis.filter((i) => visitedSet.has(imovelKey(i))).length;
    return { total, visitados, pendentes: total - visitados };
  }, [imoveis, visitedSet, selectedQt]);

  const stats = useMemo(() => {
    const total = quarteiroes.reduce(
      (acc, q) => ({
        soma_imoveis: acc.soma_imoveis + (q.soma_imoveis || 0),
        residencia: acc.residencia + (q.residencia || 0),
        comercio: acc.comercio + (q.comercio || 0),
        outros: acc.outros + (q.outros || 0),
        terreno_baldio: acc.terreno_baldio + (q.terreno_baldio || 0),
        habitantes: acc.habitantes + (q.habitantes || 0),
      }),
      { soma_imoveis: 0, residencia: 0, comercio: 0, outros: 0, terreno_baldio: 0, habitantes: 0 }
    );
    return total;
  }, [quarteiroes]);

  const byLado = useMemo(() => {
    const map = {};
    filtered.forEach((i) => {
      const key = i.lado || "—";
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return map;
  }, [filtered]);

  if (loading) return <div className="app-shell p-10 text-center text-slate-500">Carregando…</div>;

  return (
    <div className="app-shell pb-10">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">PNCD · Cadastro</p>
          <h1 className="text-base font-semibold text-slate-900 truncate font-display">Reconhecimento Geográfico</h1>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Localidade */}
        {loc && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Localidade</p>
                <p className="font-semibold text-slate-900 truncate">{loc.localidade_nome}</p>
                <p className="text-sm text-slate-500">
                  {loc.municipio_codigo} · {loc.municipio_nome} / {loc.uf} · Zona {loc.zona}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total imóveis</p>
            <p className="text-3xl font-semibold text-slate-900 font-display">{stats.soma_imoveis}</p>
            <p className="text-xs text-slate-500 mt-0.5">{quarteiroes.length} quarteirões</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Habitantes</p>
            <p className="text-3xl font-semibold text-slate-900 font-display">{stats.habitantes}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3">
            <p className="text-[10px] text-green-800 uppercase tracking-widest font-semibold">Residências</p>
            <p className="text-2xl font-semibold text-green-900 font-display">{stats.residencia}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
            <p className="text-[10px] text-amber-800 uppercase tracking-widest font-semibold">Comércios</p>
            <p className="text-2xl font-semibold text-amber-900 font-display">{stats.comercio}</p>
          </div>
          <div className="bg-slate-100 rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] text-slate-700 uppercase tracking-widest font-semibold">Terrenos Baldios</p>
            <p className="text-2xl font-semibold text-slate-900 font-display">{stats.terreno_baldio}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
            <p className="text-[10px] text-blue-800 uppercase tracking-widest font-semibold">Outros</p>
            <p className="text-2xl font-semibold text-blue-900 font-display">{stats.outros}</p>
          </div>
        </section>

        {/* Picker */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 font-display">Explorar por Quarteirão</h2>
              <p className="text-xs text-slate-500 mt-0.5">{quarteiroes.length} quarteirões cadastrados</p>
            </div>
            <button
              onClick={handleNew}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5 shrink-0"
              data-testid="new-imovel-btn"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>
          <div className="p-5 space-y-3">
            <select
              className={inputCls}
              value={selectedQt}
              onChange={(e) => setSelectedQt(e.target.value)}
              data-testid="catalog-qt-select"
            >
              <option value="">Selecione um quarteirão…</option>
              {quarteiroes.map((q) => (
                <option key={q.quarteirao} value={q.quarteirao}>
                  QT {q.quarteirao} — {q.soma_imoveis} imóveis · {q.habitantes} hab.
                </option>
              ))}
            </select>
            {selectedQt && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-10`}
                    placeholder="Buscar logradouro ou número…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-testid="catalog-search"
                  />
                </div>
                {qtStats && (
                  <div className="grid grid-cols-3 gap-2 text-center" data-testid="qt-stats">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
                      <p className="text-lg font-semibold text-slate-900 font-display">{qtStats.total}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                      <p className="text-[10px] uppercase tracking-wider text-green-700">Visitados</p>
                      <p className="text-lg font-semibold text-green-800 font-display">{qtStats.visitados}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                      <p className="text-[10px] uppercase tracking-wider text-amber-700">Pendentes</p>
                      <p className="text-lg font-semibold text-amber-800 font-display">{qtStats.pendentes}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[
                    { key: "all", label: "Todos" },
                    { key: "visited", label: "Visitados" },
                    { key: "pending", label: "Pendentes" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilterVisited(opt.key)}
                      className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                        filterVisited === opt.key
                          ? "bg-white text-blue-800 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      data-testid={`filter-${opt.key}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {selectedQt && (
            <div className="border-t border-slate-100">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-slate-500">Nenhum imóvel.</p>
              ) : (
                Object.keys(byLado).sort((a, b) => Number(a) - Number(b)).map((lado) => (
                  <div key={lado} className="border-b border-slate-100 last:border-0">
                    <p className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold bg-slate-50">
                      Lado {lado} · {byLado[lado].length} imóveis
                    </p>
                    {byLado[lado].map((im) => {
                      const meta = tipoMeta[im.tipo_imovel] || tipoMeta.O;
                      const Icon = meta.icon;
                      const visited = visitedSet.has(imovelKey(im));
                      return (
                        <div
                          key={im.id}
                          className={`px-5 py-3 border-b border-slate-50 last:border-0 flex items-center gap-3 ${visited ? "bg-green-50/40" : ""}`}
                          data-testid={`catalog-imovel-${im.id}`}
                        >
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {im.logradouro || "—"}{im.numero ? `, ${im.numero}` : ""}{im.seq ? ` (${im.seq})` : ""}
                              </p>
                              {visited && (
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" data-testid={`visited-${im.id}`} />
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {meta.label}
                              {(im.hab || im.cao || im.gato) ? " · " : ""}
                              {im.hab > 0 && `${im.hab} hab.`}
                              {im.cao > 0 && ` · 🐶 ${im.cao}`}
                              {im.gato > 0 && ` · 🐱 ${im.gato}`}
                              {visited && <span className="ml-2 text-green-700 font-medium">· Visitado</span>}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEdit(im)}
                            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-700 shrink-0"
                            data-testid={`edit-imovel-${im.id}`}
                            aria-label="Editar imóvel"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      <ImovelEditor
        open={editorOpen}
        mode={editorMode}
        imovel={editingImovel}
        defaultQuarteirao={selectedQt}
        onClose={() => setEditorOpen(false)}
        onSaved={() => reloadAll()}
        onDeleted={() => reloadAll()}
      />
    </div>
  );
};

export default Catalogo;
