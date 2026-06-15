import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

const cleanPayload = (form) => {
  // Convert empty-string numerics to null so backend accepts them
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

export const formsApi = {
  list: () => api.get("/forms").then((r) => r.data),
  get: (id) => api.get(`/forms/${id}`).then((r) => r.data),
  create: (data) => api.post("/forms", cleanPayload(data)).then((r) => r.data),
  update: (id, data) =>
    api.put(`/forms/${id}`, cleanPayload(data)).then((r) => r.data),
  remove: (id) => api.delete(`/forms/${id}`).then((r) => r.data),
};

export const catalogApi = {
  localidade: () => api.get("/localidade").then((r) => r.data),
  quarteiroes: () => api.get("/quarteiroes").then((r) => r.data),
  imoveis: (params = {}) =>
    api.get("/imoveis", { params }).then((r) => r.data),
  countImoveis: (params = {}) =>
    api.get("/imoveis/count", { params }).then((r) => r.data),
  visited: () => api.get("/imoveis/visited").then((r) => r.data),
};
