// Centralized constants for D1 form

export const ATIVIDADES = [
  { value: "1", label: "1 – Levantamento de Índice" },
  { value: "2", label: "2 – L.I + Tratamento" },
  { value: "3", label: "3 – Ponto Estratégico" },
  { value: "4", label: "4 – Tratamento" },
  { value: "5", label: "5 – D.F. – Delimitação de Foco" },
  { value: "6", label: "6 – PVE – Pesquisa Vetorial Espacial" },
];

export const TIPOS_IMOVEL = [
  { value: "R", label: "R – Residência" },
  { value: "C", label: "C – Comércio" },
  { value: "TB", label: "TB – Terreno Baldio" },
  { value: "PE", label: "PE – Ponto Estratégico" },
  { value: "O", label: "O – Outros" },
];

export const TIPOS_VISITA = [
  { value: "N", label: "N – Normal" },
  { value: "R", label: "R – Recuperada" },
  { value: "Rec", label: "Rec – Recusa" },
];

export const PENDENCIAS = [
  { value: "", label: "—" },
  { value: "F", label: "F – Fechada" },
  { value: "R", label: "R – Recusa" },
  { value: "Rec", label: "Rec – Recuperada" },
];

export const LADOS = [
  { value: "", label: "—" },
  { value: "P", label: "P – Par" },
  { value: "I", label: "I – Ímpar" },
  { value: "U", label: "U – Único" },
];

export const LARVICIDAS = [
  { value: "", label: "—" },
  { value: "B", label: "B – Bti / Biológico" },
  { value: "P", label: "P – Pyriproxyfen" },
  { value: "D", label: "D – Diflubenzuron" },
  { value: "O", label: "O – Outro" },
];

export const CLASSIFICACAO_DEPOSITOS = [
  { key: "a1", label: "A1 – Caixa d'água (elevado)" },
  { key: "a2", label: "A2 – Outros depósitos de armazenamento de água (baixo)" },
  { key: "b", label: "B – Pequenos depósitos móveis" },
  { key: "c", label: "C – Depósitos fixos" },
  { key: "d1", label: "D1 – Pneus e outros materiais rodantes" },
  { key: "d2", label: "D2 – Lixo (recipientes plásticos, latas), sucatas e entulhos" },
  { key: "e", label: "E – Depósitos naturais" },
];

export const emptyVisit = () => ({
  quarteirao: "",
  sequencia: "",
  lado: "",
  logradouro: "",
  numero: "",
  seq_numero: "",
  complemento: "",
  tipo_imovel: "",
  hora_entrada: "",
  tipo_visita: "",
  pendencia: "",
  depositos_eliminados: "",
  imovel_com_foco: false,
  imovel_tratado: false,
  larvicida_tipo: "",
  larvicida_quantidade: "",
  qtde_dep_tratados: "",
});

export const emptyForm = () => ({
  municipio: "",
  localidade: "",
  categoria: "",
  zona: "",
  tipo: "",
  folha: "",
  data_atividade: new Date().toISOString().slice(0, 10),
  atividade: "",
  quarteiroes_trabalhados: "",
  quarteiroes_concluidos: "",
  visits: Array.from({ length: 20 }, emptyVisit),
  depositos_eliminados: { a1: 0, a2: 0, b: 0, c: 0, d1: 0, d2: 0, e: 0 },
  depositos_tratados: { tipo: "", quantidade: "", qtde_dep_trat: "" },
  casas_fechadas: 0,
  recuperadas: 0,
  informados: 0,
  assinatura_agente: "",
  assinatura_supervisor: "",
});

export const visitIsFilled = (v) =>
  Boolean(v?.logradouro || v?.numero || v?.tipo_imovel);

export const countTipo = (visits, tipo) =>
  visits.filter((v) => v.tipo_imovel === tipo).length;
