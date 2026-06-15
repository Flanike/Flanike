import { TIPOS_IMOVEL, ATIVIDADES, visitIsFilled } from "@/constants/d1";

const safe = (v) => (v === null || v === undefined ? "" : String(v));

export const exportCSV = (form) => {
  const lines = [];
  lines.push(["PNCD - Resumo Diário do Serviço Antivetorial (D1)"].join(","));
  lines.push("");
  lines.push(["Município", form.municipio].join(","));
  lines.push(["Localidade", form.localidade].join(","));
  lines.push(["Categoria", form.categoria].join(","));
  lines.push(["Zona", form.zona].join(","));
  lines.push(["Tipo", form.tipo].join(","));
  lines.push(["Folha", form.folha].join(","));
  lines.push(["Data da Atividade", form.data_atividade].join(","));
  const atv = ATIVIDADES.find((a) => a.value === form.atividade)?.label || form.atividade;
  lines.push(["Atividade", atv].join(","));
  lines.push(["Quarteirões trabalhados", form.quarteiroes_trabalhados].join(","));
  lines.push(["Quarteirões concluídos", form.quarteiroes_concluidos].join(","));
  lines.push("");

  const header = [
    "#", "Quart.", "Seq.", "Lado", "Logradouro", "Número", "Seq", "Compl.",
    "Tipo", "Hora", "Visita", "Pend.",
    "Dep.Elim.", "C/Foco", "Tratado", "Larv.", "Qtd(g)", "Dep.Trat."
  ];
  lines.push(header.join(","));
  form.visits.forEach((v, i) => {
    const row = [
      i + 1, v.quarteirao, v.sequencia, v.lado, v.logradouro, v.numero,
      v.seq_numero, v.complemento, v.tipo_imovel, v.hora_entrada,
      v.tipo_visita, v.pendencia, safe(v.depositos_eliminados),
      v.imovel_com_foco ? "Sim" : "Não",
      v.imovel_tratado ? "Sim" : "Não",
      v.larvicida_tipo, safe(v.larvicida_quantidade), safe(v.qtde_dep_tratados),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  });

  lines.push("");
  lines.push("Totais por tipo de imóvel,");
  TIPOS_IMOVEL.forEach((t) => {
    const n = form.visits.filter((v) => v.tipo_imovel === t.value).length;
    lines.push([t.label, n].join(","));
  });
  const totalImov = form.visits.filter(visitIsFilled).length;
  lines.push(["Total imóveis", totalImov].join(","));
  lines.push("");
  lines.push(["Casas Fechadas", form.casas_fechadas].join(","));
  lines.push(["Recuperadas", form.recuperadas].join(","));
  lines.push(["Informados", form.informados].join(","));
  lines.push("");
  lines.push(["Agente", form.assinatura_agente].join(","));
  lines.push(["Supervisor", form.assinatura_supervisor].join(","));

  const csv = lines.join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `D1_${form.data_atividade || "form"}_${(form.localidade || "").replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPDF = async (form) => {
  const { jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod.default || autoTableMod;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const atvLabel = ATIVIDADES.find((a) => a.value === form.atividade)?.label || form.atividade;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PROGRAMA NACIONAL DE CONTROLE DA DENGUE – PNCD", 148, 10, { align: "center" });
  doc.setFontSize(10);
  doc.text("RESUMO DIÁRIO DO SERVIÇO ANTIVETORIAL", 148, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let y = 22;
  const headerRows = [
    ["Município", form.municipio || "—", "Localidade", form.localidade || "—", "Categoria", form.categoria || "—"],
    ["Zona", form.zona || "—", "Tipo", form.tipo || "—", "Folha", form.folha || "—"],
    ["Data da Atividade", form.data_atividade || "—", "Atividade", atvLabel || "—", "", ""],
  ];
  autoTable(doc, {
    startY: y,
    head: [],
    body: headerRows,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 244, 250] },
      2: { fontStyle: "bold", fillColor: [240, 244, 250] },
      4: { fontStyle: "bold", fillColor: [240, 244, 250] },
    },
    margin: { left: 8, right: 8 },
  });

  // Visits table
  const visitHead = [[
    "#", "Quart.", "Seq", "Lado", "Logradouro", "Nº", "Seq", "Compl.",
    "Tipo", "Hora", "Visita", "Pend.", "Dep.El.", "Foco", "Trat.",
    "Larv.", "Qtd(g)", "DepTrat"
  ]];
  const visitBody = form.visits.map((v, i) => [
    i + 1, v.quarteirao, v.sequencia, v.lado, v.logradouro, v.numero,
    v.seq_numero, v.complemento, v.tipo_imovel, v.hora_entrada,
    v.tipo_visita, v.pendencia, safe(v.depositos_eliminados),
    v.imovel_com_foco ? "X" : "", v.imovel_tratado ? "X" : "",
    v.larvicida_tipo, safe(v.larvicida_quantidade), safe(v.qtde_dep_tratados),
  ]);
  autoTable(doc, {
    head: visitHead,
    body: visitBody,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    margin: { left: 8, right: 8 },
  });

  // Totals
  const totals = TIPOS_IMOVEL.map((t) => [
    t.label,
    form.visits.filter((v) => v.tipo_imovel === t.value).length,
  ]);
  totals.push(["Total imóveis (preenchidos)", form.visits.filter(visitIsFilled).length]);
  autoTable(doc, {
    head: [["Tipo de Imóvel", "Qtde"]],
    body: totals,
    theme: "striped",
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    margin: { left: 8, right: 8 },
    tableWidth: 90,
  });

  // Footer
  autoTable(doc, {
    head: [],
    body: [
      ["Casas Fechadas", form.casas_fechadas || 0, "Recuperadas", form.recuperadas || 0, "Informados", form.informados || 0],
      ["Agente", form.assinatura_agente || "—", "Supervisor", form.assinatura_supervisor || "—", "", ""],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 244, 250] },
      2: { fontStyle: "bold", fillColor: [240, 244, 250] },
      4: { fontStyle: "bold", fillColor: [240, 244, 250] },
    },
    margin: { left: 8, right: 8 },
  });

  doc.save(`D1_${form.data_atividade || "form"}_${(form.localidade || "").replace(/\s+/g, "_")}.pdf`);
};
