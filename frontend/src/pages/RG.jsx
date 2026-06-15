import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Download, MapPin, Home, Building2, TreePine, Store } from "lucide-react";
import { catalogApi } from "@/lib/api";
import { NicolasKelpLogo } from "@/components/NicolasKelpLogo";

const tipoIcon = {
  R: { Icon: Home, label: "Residência" },
  C: { Icon: Store, label: "Comércio" },
  O: { Icon: Building2, label: "Outros" },
  TB: { Icon: TreePine, label: "Terreno baldio" },
  PE: { Icon: MapPin, label: "Ponto estratégico" },
};

const RG = () => {
  const navigate = useNavigate();
  const [imoveis, setImoveis] = useState([]);
  const [quarteiroes, setQuarteiroes] = useState([]);
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQt, setExpandedQt] = useState(null);

  useEffect(() => {
    Promise.all([
      catalogApi.imoveis(),
      catalogApi.quarteiroes(),
      catalogApi.localidade().catch(() => null),
    ])
      .then(([ims, qts, lc]) => {
        setImoveis(ims);
        setQuarteiroes(qts);
        setLoc(lc);
      })
      .finally(() => setLoading(false));
  }, []);

  // Agrupa por quarteirão preservando ordem
  const grouped = useMemo(() => {
    const map = {};
    imoveis.forEach((im) => {
      const qt = String(im.quarteirao || "");
      if (!map[qt]) map[qt] = { lado1: [], lado2: [], stats: { R: 0, C: 0, O: 0, TB: 0, PE: 0, hab: 0, cao: 0, gato: 0 } };
      const side = String(im.lado) === "1" ? "lado1" : "lado2";
      map[qt][side].push(im);
      if (im.tipo_imovel && map[qt].stats[im.tipo_imovel] !== undefined) {
        map[qt].stats[im.tipo_imovel] += 1;
      }
      map[qt].stats.hab += im.hab || 0;
      map[qt].stats.cao += im.cao || 0;
      map[qt].stats.gato += im.gato || 0;
    });
    // Sort each side by ordem
    Object.values(map).forEach((g) => {
      g.lado1.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      g.lado2.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    });
    return map;
  }, [imoveis]);

  const totals = useMemo(() => {
    const t = { R: 0, C: 0, O: 0, TB: 0, PE: 0, hab: 0, cao: 0, gato: 0, total: 0 };
    imoveis.forEach((im) => {
      if (im.tipo_imovel && t[im.tipo_imovel] !== undefined) t[im.tipo_imovel] += 1;
      t.hab += im.hab || 0;
      t.cao += im.cao || 0;
      t.gato += im.gato || 0;
      t.total += 1;
    });
    return t;
  }, [imoveis]);

  const exportCSV = () => {
    const header = ["quarteirao", "lado", "ordem", "logradouro", "numero", "seq", "tipo_imovel", "hab", "cao", "gato"];
    const escape = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = imoveis
      .slice()
      .sort(
        (a, b) =>
          (Number(a.quarteirao) || 0) - (Number(b.quarteirao) || 0) ||
          (Number(a.lado) || 0) - (Number(b.lado) || 0) ||
          (a.ordem || 0) - (b.ordem || 0)
      )
      .map((i) => header.map((h) => escape(i[h])).join(","));
    const csv = "\uFEFF" + header.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RG-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedQts = useMemo(
    () => Object.keys(grouped).sort((a, b) => Number(a) - Number(b)),
    [grouped]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 font-display leading-tight">Boletim RG</h1>
            <p className="text-xs text-slate-500">Reconhecimento Geográfico — QT01 a QT33</p>
          </div>
          <button onClick={exportCSV} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700" data-testid="export-rg-btn" title="Exportar CSV">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => window.print()} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700" data-testid="print-rg-btn" title="Imprimir">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-5">
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-red-900 rounded-2xl border border-blue-950 p-5 shadow-lg" data-testid="rg-hero">
          <div className="flex items-start gap-4">
            <NicolasKelpLogo size={56} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-red-200/90 uppercase tracking-widest font-semibold">Boletim de Reconhecimento Geográfico</p>
              <h2 className="text-xl font-semibold text-white font-display leading-tight mt-0.5">
                {loc?.municipio_nome || "—"}
              </h2>
              <p className="text-xs text-blue-100/85 mt-1">
                {loc?.localidade_codigo} — {loc?.localidade_nome}
              </p>
              <p className="text-[11px] text-blue-200/80 mt-0.5">
                Zona {loc?.zona || "14"} · {sortedQts.length} quarteirões · {totals.total} imóveis
              </p>
            </div>
          </div>
        </section>

        {/* Totais agregados */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" data-testid="rg-totals">
          {[
            { key: "R", label: "Residências", val: totals.R, cls: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800" },
            { key: "C", label: "Comércios", val: totals.C, cls: "from-blue-50 to-blue-100 border-blue-200 text-blue-800" },
            { key: "TB", label: "Terrenos baldios", val: totals.TB, cls: "from-amber-50 to-amber-100 border-amber-200 text-amber-800" },
            { key: "O", label: "Outros", val: totals.O, cls: "from-slate-50 to-slate-100 border-slate-200 text-slate-800" },
          ].map((s) => (
            <div key={s.key} className={`bg-gradient-to-br ${s.cls} rounded-xl border p-3`}>
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{s.label}</p>
              <p className="text-2xl font-semibold font-display leading-tight tabular-nums">{s.val}</p>
            </div>
          ))}
        </section>
        <section className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Habitantes", val: totals.hab },
            { label: "Cães", val: totals.cao },
            { label: "Gatos", val: totals.gato },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{s.label}</p>
              <p className="text-xl font-semibold text-slate-900 font-display tabular-nums">{s.val}</p>
            </div>
          ))}
        </section>

        {/* Por QT */}
        <section className="space-y-2" data-testid="rg-quarteiroes">
          <p className="section-title">Quarteirões</p>
          {loading ? (
            <p className="text-center text-slate-400 py-8 text-sm">Carregando…</p>
          ) : (
            sortedQts.map((qt) => {
              const g = grouped[qt];
              const total = g.lado1.length + g.lado2.length;
              const isOpen = expandedQt === qt;
              return (
                <div key={qt} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid={`rg-qt-${qt}`}>
                  <button
                    onClick={() => setExpandedQt(isOpen ? null : qt)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    data-testid={`rg-qt-toggle-${qt}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-blue-800 font-display">{qt}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Quarteirão {qt}</p>
                      <p className="text-[11px] text-slate-500">
                        {total} imóveis · L1: {g.lado1.length} · L2: {g.lado2.length} · {g.stats.hab} hab.
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {Object.entries({ R: g.stats.R, C: g.stats.C, TB: g.stats.TB, O: g.stats.O })
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => (
                          <span key={k} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                            {k} {v}
                          </span>
                        ))}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 p-3 space-y-3" data-testid={`rg-qt-detail-${qt}`}>
                      {[
                        { lado: "1", items: g.lado1 },
                        { lado: "2", items: g.lado2 },
                      ].map(({ lado, items }) =>
                        items.length > 0 ? (
                          <div key={lado}>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              Lado {lado} <span className="text-slate-400 font-normal">· {items.length} imóveis</span>
                            </p>
                            <div className="space-y-1">
                              {items.map((im, idx) => {
                                const ti = tipoIcon[im.tipo_imovel];
                                const TipoIc = ti?.Icon;
                                return (
                                  <div key={im.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-slate-50" data-testid={`rg-imovel-${im.id}`}>
                                    <span className="text-slate-400 tabular-nums w-6 text-right">{idx + 1}.</span>
                                    {TipoIc && (
                                      <TipoIc className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    )}
                                    <span className="font-medium text-slate-800 truncate flex-1">
                                      {im.logradouro || "—"}
                                      {im.numero && <span className="text-slate-600">, {im.numero}</span>}
                                      {im.seq && <span className="text-slate-500"> (seq {im.seq})</span>}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                                      {im.tipo_imovel || "—"}
                                    </span>
                                    {(im.hab > 0 || im.cao > 0 || im.gato > 0) && (
                                      <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
                                        {im.hab > 0 && `${im.hab}h`}
                                        {im.cao > 0 && ` ${im.cao}c`}
                                        {im.gato > 0 && ` ${im.gato}g`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};

export default RG;
