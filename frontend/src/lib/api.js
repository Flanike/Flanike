import axios from "axios";
import {
  queueCreateForm,
  queueUpdateForm,
  queueDeleteForm,
  getLocalForms,
  localFormsAsSummaries,
  isTempId,
  drainQueue,
} from "@/lib/syncQueue";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const cleanPayload = (form) => {
  const numerify = (v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  return {
    ...form,
    casas_fechadas: numerify(form.casas_fechadas) ?? 0,
    recuperadas: numerify(form.recuperadas) ?? 0,
    informados: numerify(form.informados) ?? 0,
    depositos_eliminados: Object.fromEntries(
      Object.entries(form.depositos_eliminados || {}).map(([k, v]) => [
        k,
        numerify(v) ?? 0,
      ])
    ),
    depositos_tratados: {
      tipo: form.depositos_tratados?.tipo || "",
      quantidade: numerify(form.depositos_tratados?.quantidade),
      qtde_dep_trat: numerify(form.depositos_tratados?.qtde_dep_trat),
    },
    visits: (form.visits || []).map((v) => ({
      ...v,
      depositos_eliminados: numerify(v.depositos_eliminados),
      larvicida_quantidade: numerify(v.larvicida_quantidade),
      qtde_dep_tratados: numerify(v.qtde_dep_tratados),
    })),
  };
};

const isOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

export const formsApi = {
  list: async () => {
    let serverForms = [];
    try {
      const r = await api.get("/forms");
      serverForms = r.data || [];
    } catch (e) {
      // offline ou erro — segue só com locais
    }
    const local = localFormsAsSummaries();
    // Mistura locais (no topo) com servidor; evita duplicatas
    const ids = new Set(serverForms.map((f) => f.id));
    const merged = [
      ...local.filter((f) => !ids.has(f.id)),
      ...serverForms,
    ];
    merged.sort(
      (a, b) =>
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
    );
    return merged;
  },

  get: async (id) => {
    // Se for ID local, retorna do storage
    if (isTempId(id)) {
      const local = getLocalForms();
      if (local[id]) return local[id];
      throw new Error("Formulário local não encontrado");
    }
    try {
      const r = await api.get(`/forms/${id}`);
      return r.data;
    } catch (e) {
      // offline: tenta localStorage rascunho
      const local = getLocalForms();
      if (local[id]) return local[id];
      throw e;
    }
  },

  create: async (data) => {
    const payload = cleanPayload(data);
    if (!isOnline()) {
      return queueCreateForm(payload);
    }
    try {
      const r = await api.post("/forms", payload);
      return r.data;
    } catch (e) {
      return queueCreateForm(payload);
    }
  },

  update: async (id, data) => {
    const payload = cleanPayload(data);
    if (isTempId(id) || !isOnline()) {
      return queueUpdateForm(id, payload);
    }
    try {
      const r = await api.put(`/forms/${id}`, payload);
      return r.data;
    } catch (e) {
      return queueUpdateForm(id, payload);
    }
  },

  remove: async (id) => {
    if (isTempId(id) || !isOnline()) {
      queueDeleteForm(id);
      return { ok: true, queued: true };
    }
    try {
      const r = await api.delete(`/forms/${id}`);
      return r.data;
    } catch (e) {
      queueDeleteForm(id);
      return { ok: true, queued: true };
    }
  },
};

export const catalogApi = {
  localidade: () => api.get("/localidade").then((r) => r.data),
  quarteiroes: () => api.get("/quarteiroes").then((r) => r.data),
  imoveis: (params = {}) =>
    api.get("/imoveis", { params }).then((r) => r.data),
  countImoveis: (params = {}) =>
    api.get("/imoveis/count", { params }).then((r) => r.data),
  visited: () => api.get("/imoveis/visited").then((r) => r.data),
  createImovel: (data) => api.post("/imoveis", data).then((r) => r.data),
  updateImovel: (id, data) =>
    api.put(`/imoveis/${id}`, data).then((r) => r.data),
  deleteImovel: (id) => api.delete(`/imoveis/${id}`).then((r) => r.data),
  // Pré-cache: ao tocar essa URL, o service worker armazena a resposta no cache
  prefetchQuarteirao: (quarteirao) => {
    if (!quarteirao) return Promise.resolve();
    return api.get("/imoveis", { params: { quarteirao } }).catch(() => null);
  },
};

export const statsApi = {
  weekly: () => api.get("/forms/stats/weekly").then((r) => r.data),
  fechadas: () => api.get("/forms/stats/fechadas").then((r) => r.data),
};

// Sync automático quando voltar a ficar online
let syncing = false;
export const trySync = async () => {
  if (syncing) return;
  syncing = true;
  try {
    return await drainQueue(api);
  } finally {
    syncing = false;
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    trySync();
  });
  // Tenta sincronizar logo no carregamento
  setTimeout(trySync, 1500);
}
