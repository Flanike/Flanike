// Pré-cache agressivo: baixa TODO o catálogo na 1ª abertura para uso 100% offline.
// O Service Worker (catalog cache-first) armazena automaticamente as respostas.
import { catalogApi } from "@/lib/api";

const BOOTSTRAP_KEY = "pncd_bootstrap_v1";

const listeners = new Set();
const state = {
  status: "idle", // idle | running | done | error
  progress: 0,
  total: 0,
  message: "",
  lastRun: null,
};

const emit = () => {
  listeners.forEach((fn) => {
    try {
      fn({ ...state });
    } catch (e) {
      console.warn("[bootstrap] listener error:", e?.message);
    }
  });
};

export const subscribeBootstrap = (fn) => {
  fn({ ...state });
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isBootstrapDone = () => {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // expira após 7 dias
    return data?.ts && Date.now() - data.ts < 7 * 24 * 3600 * 1000;
  } catch {
    return false;
  }
};

const markDone = () => {
  try {
    localStorage.setItem(
      BOOTSTRAP_KEY,
      JSON.stringify({ ts: Date.now(), version: 1 })
    );
  } catch (e) {
    console.warn("[bootstrap] markDone failed:", e?.message);
  }
};

const update = (patch) => {
  Object.assign(state, patch);
  emit();
};

export const runBootstrap = async ({ force = false } = {}) => {
  if (state.status === "running") return;
  if (!force && isBootstrapDone()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  update({ status: "running", progress: 0, total: 3, message: "Carregando localidade…" });
  try {
    // 1) Localidade
    await catalogApi.localidade();
    update({ progress: 1, message: "Carregando quarteirões…" });

    // 2) Quarteirões
    const qts = await catalogApi.quarteiroes();
    update({ total: 2 + (qts?.length || 0), progress: 2, message: "Baixando imóveis…" });

    // 3) Imóveis: faz um GET global (988) que cobre todos
    await catalogApi.imoveis();
    update({ progress: 3, message: "Cacheando por quarteirão…" });

    // 4) E também por quarteirão (para o SW armazenar a query exata usada pelo Picker)
    let i = 3;
    for (const q of qts || []) {
      await catalogApi.imoveis({ quarteirao: q.quarteirao });
      i += 1;
      update({ progress: i, message: `QT ${q.quarteirao}` });
    }

    markDone();
    update({ status: "done", progress: state.total, message: "Pronto para uso offline", lastRun: Date.now() });
  } catch (e) {
    update({ status: "error", message: e?.message || "Falha ao baixar catálogo" });
  }
};

// Tenta na carga inicial e quando voltar online
if (typeof window !== "undefined") {
  // pequeno delay para não brigar com a renderização inicial
  setTimeout(() => runBootstrap(), 2000);
  window.addEventListener("online", () => runBootstrap());
}
