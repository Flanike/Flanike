// Sync queue para mutações offline → online.
// Persistido em localStorage. Drenado quando o navegador volta a ficar online.

const QUEUE_KEY = "pncd_sync_queue";
const LOCAL_FORMS_KEY = "pncd_local_forms"; // formulários criados/editados localmente
const LISTENERS = new Set();

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* full */
  }
};

const notify = () => {
  const snapshot = {
    queueSize: getQueue().length,
    localForms: getLocalForms(),
  };
  LISTENERS.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {}
  });
};

export const subscribeSyncState = (fn) => {
  LISTENERS.add(fn);
  // initial
  fn({ queueSize: getQueue().length, localForms: getLocalForms() });
  return () => LISTENERS.delete(fn);
};

export const getQueue = () => read(QUEUE_KEY, []);

export const getLocalForms = () => read(LOCAL_FORMS_KEY, {});

export const isTempId = (id) => typeof id === "string" && id.startsWith("local_");

const newTempId = () =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const pushQueue = (op) => {
  const q = getQueue();
  q.push({ ...op, ts: Date.now() });
  write(QUEUE_KEY, q);
  notify();
};

const setLocalForm = (id, data) => {
  const map = getLocalForms();
  map[id] = data;
  write(LOCAL_FORMS_KEY, map);
  notify();
};

const removeLocalForm = (id) => {
  const map = getLocalForms();
  delete map[id];
  write(LOCAL_FORMS_KEY, map);
  notify();
};

// API offline-aware
export const queueCreateForm = (data) => {
  const id = newTempId();
  const now = new Date().toISOString();
  const localDoc = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
    _pending: "create",
  };
  setLocalForm(id, localDoc);
  pushQueue({ op: "create", localId: id, payload: data });
  return localDoc;
};

export const queueUpdateForm = (id, data) => {
  const now = new Date().toISOString();
  const localDoc = {
    ...data,
    id,
    updated_at: now,
    _pending: "update",
  };
  setLocalForm(id, localDoc);
  pushQueue({ op: "update", id, payload: data });
  return localDoc;
};

export const queueDeleteForm = (id) => {
  // Remove local snapshot e enfileira delete
  removeLocalForm(id);
  pushQueue({ op: "delete", id });
};

// Sumário das visitas marcadas como pendentes para o card "/api/forms"
export const localFormsAsSummaries = () => {
  const map = getLocalForms();
  return Object.values(map).map((f) => ({
    id: f.id,
    municipio: f.municipio || "",
    localidade: f.localidade || "",
    data_atividade: f.data_atividade || "",
    atividade: f.atividade || "",
    folha: f.folha || "",
    total_visitas: (f.visits || []).filter(
      (v) => v?.logradouro || v?.numero || v?.tipo_imovel
    ).length,
    focos: (f.visits || []).filter((v) => v?.imovel_com_foco).length,
    created_at: f.created_at,
    updated_at: f.updated_at,
    _pending: f._pending,
  }));
};

export const drainQueue = async (apiInstance) => {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0 };

  let processed = 0;
  const remaining = [];

  for (const op of queue) {
    try {
      if (op.op === "create") {
        const resp = await apiInstance.post("/forms", op.payload);
        const created = resp.data;
        // Substitui o doc local temp pelo doc real
        removeLocalForm(op.localId);
        processed += 1;
      } else if (op.op === "update") {
        // Pula updates de IDs locais (já cobertos pelo create)
        if (isTempId(op.id)) {
          processed += 1;
          continue;
        }
        await apiInstance.put(`/forms/${op.id}`, op.payload);
        removeLocalForm(op.id);
        processed += 1;
      } else if (op.op === "delete") {
        if (isTempId(op.id)) {
          processed += 1;
          continue;
        }
        try {
          await apiInstance.delete(`/forms/${op.id}`);
        } catch (e) {
          // Se já não existe, ok
          if (e?.response?.status !== 404) throw e;
        }
        processed += 1;
      }
    } catch (e) {
      // Mantém na fila para tentar de novo
      remaining.push(op);
    }
  }

  // Operações que falharam continuam na fila + tudo que veio depois mas não foi tentado
  write(QUEUE_KEY, remaining);
  notify();
  return { processed, remaining: remaining.length };
};
