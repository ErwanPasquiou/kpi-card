/* Tables fictives déterministes, calculs des KPI et export. Aucune requête externe. */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const PERIODS = [
    {id: "rolling12", label: "12 mois glissants"},
    {id: "currentYear", label: "Année en cours"},
    {id: "months6", label: "6 mois"},
    {id: "months3", label: "3 mois"},
    {id: "month1", label: "1 mois"},
    {id: "week1", label: "1 semaine"},
  ];
  const dateValue = (iso) => new Date(`${iso}T00:00:00Z`);
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const addDays = (iso, days) => isoDate(new Date(dateValue(iso).getTime() + days * DAY));
  function today() {
    const parts = new Intl.DateTimeFormat("fr-FR", {timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  function shiftMonths(iso, amount) {
    const date = dateValue(iso), day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + amount);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return isoDate(date);
  }
  const validPeriod = (value) => PERIODS.some((item) => item.id === value);
  function bounds(period, end = today()) {
    const id = validPeriod(period) ? period : "rolling12";
    let start;
    if (id === "currentYear") start = `${end.slice(0, 4)}-01-01`;
    else if (id === "week1") start = addDays(end, -6);
    else start = addDays(shiftMonths(end, -({rolling12: 12, months6: 6, months3: 3, month1: 1}[id])), 1);
    return {start, end, period: id, label: PERIODS.find((item) => item.id === id).label};
  }
  const formatDate = (iso) => dateValue(iso).toLocaleDateString("fr-FR", {timeZone: "UTC"});
  const rangeLabel = (range) => `Du ${formatDate(range.start)} au ${formatDate(range.end)}`;
  const round = (value) => Math.round(value * 100) / 100;
  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  const mean = (rows, key) => rows.length ? sum(rows, key) / rows.length : null;
  const percent = (rows, predicate) => rows.length ? 100 * rows.filter(predicate).length / rows.length : null;
  const won = (row) => row.statut === "Gagnée";
  const delivered = (row) => row.statut === "Livrée";
  const all = () => true;
  const TABLES = [
    {id: "sales", label: "Ventes", grain: "Une ligne par vente", columns: [
      ["vente_id", "Vente", "text"], ["date", "Date", "date"], ["client", "Client", "text"],
      ["region", "Région", "text"], ["produit", "Produit", "text"], ["quantite", "Quantité", "number"],
      ["montant_ht", "Montant HT (€)", "number"], ["cout_ht", "Coût HT (€)", "number"], ["statut", "Statut", "text"],
    ]},
    {id: "operations", label: "Opérations", grain: "Une ligne par opération", columns: [
      ["operation_id", "Opération", "text"], ["date", "Date d’activité", "date"], ["projet", "Projet", "text"],
      ["equipe", "Équipe", "text"], ["statut", "Statut", "text"], ["date_echeance", "Échéance", "date"],
      ["heures_prevues", "Heures prévues", "number"], ["heures_reelles", "Heures réalisées", "number"],
    ]},
    {id: "feedback", label: "Retours clients", grain: "Une ligne par retour client", columns: [
      ["retour_id", "Retour", "text"], ["date", "Date", "date"], ["client", "Client", "text"],
      ["canal", "Canal", "text"], ["note", "Note / 5", "number"],
      ["delai_reponse_heures", "Délai de réponse (h)", "number"], ["commentaire", "Commentaire", "text"],
    ]},
  ].map((table) => ({...table, columns: table.columns.map(([key, label, kind]) => ({key, label, kind}))}));
  const KPIS = [
    {id: "revenue", label: "Chiffre d’affaires HT", table: "sales", format: "money", filter: won,
      formula: "Somme des montants HT des ventes gagnées. Les ventes annulées sont exclues.", calculate: (rows) => sum(rows, "montant_ht")},
    {id: "sales_count", label: "Ventes conclues", table: "sales", format: "integer", filter: won,
      formula: "Nombre de ventes au statut Gagnée.", calculate: (rows) => rows.length},
    {id: "average_basket", label: "Panier moyen HT", table: "sales", format: "money", filter: won,
      formula: "Montant HT total des ventes gagnées ÷ nombre de ventes gagnées.", calculate: (rows) => mean(rows, "montant_ht")},
    {id: "margin", label: "Taux de marge sur CA", table: "sales", format: "percent", filter: won,
      formula: "(Montant HT total − coût HT total) ÷ montant HT total × 100, sur les ventes gagnées.",
      calculate: (rows) => sum(rows, "montant_ht") ? (sum(rows, "montant_ht") - sum(rows, "cout_ht")) / sum(rows, "montant_ht") * 100 : null},
    {id: "operations_count", label: "Opérations enregistrées", table: "operations", format: "integer", filter: all,
      formula: "Nombre d’opérations enregistrées, tous statuts confondus.", calculate: (rows) => rows.length},
    {id: "delivered_count", label: "Opérations livrées", table: "operations", format: "integer", filter: delivered,
      formula: "Nombre d’opérations au statut Livrée.", calculate: (rows) => rows.length},
    {id: "on_time", label: "Livraisons dans les délais", table: "operations", format: "percent", filter: delivered,
      formula: "Livraisons dont la date d’activité est au plus tard à l’échéance ÷ nombre de livraisons × 100.",
      calculate: (rows) => percent(rows, (row) => row.date <= row.date_echeance)},
    {id: "projects_count", label: "Projets concernés", table: "operations", format: "integer", filter: (row) => row.statut !== "Annulée",
      formula: "Nombre de projets distincts associés aux opérations de la période, hors opérations annulées.", calculate: (rows) => new Set(rows.map((row) => row.projet)).size},
    {id: "satisfaction", label: "Clients satisfaits", table: "feedback", format: "percent", filter: all,
      formula: "Retours avec une note de 4 ou 5 sur 5 ÷ nombre total de retours × 100.", calculate: (rows) => percent(rows, (row) => row.note >= 4)},
    {id: "average_rating", label: "Note moyenne", table: "feedback", format: "rating", filter: all,
      formula: "Somme des notes ÷ nombre de retours. Notes de 1 à 5.", calculate: (rows) => mean(rows, "note")},
    {id: "response_time", label: "Délai moyen de réponse", table: "feedback", format: "hours", filter: all,
      formula: "Somme des délais de réponse en heures ÷ nombre de retours.", calculate: (rows) => mean(rows, "delai_reponse_heures")},
    {id: "feedback_count", label: "Retours clients recueillis", table: "feedback", format: "integer", filter: all,
      formula: "Nombre de retours clients reçus.", calculate: (rows) => rows.length},
  ].map((kpi) => ({...kpi,
    targetMode: ["revenue", "sales_count", "operations_count", "delivered_count", "feedback_count"].includes(kpi.id) ? "prorata" : "fixed",
    targetDirection: kpi.id === "response_time" ? "at_most" : "at_least",
  }));
  const definition = (id) => KPIS.find((item) => item.id === id) || KPIS[0];
  const tableDefinition = (id) => TABLES.find((item) => item.id === id) || TABLES[0];
  const isKpi = (id) => KPIS.some((item) => item.id === id);

  function generateTables(end) {
    const result = {sales: [], operations: [], feedback: []};
    const clients = ["Atelier Azur", "Maison Rivage", "Studio Horizon", "Les Jardins", "Groupe Nova", "Bureau Atlas"];
    const regions = ["Île-de-France", "Bretagne", "Occitanie", "Auvergne-Rhône-Alpes"];
    const products = ["Abonnement Essentiel", "Abonnement Équipe", "Accompagnement", "Formation"];
    for (let date = shiftMonths(end, -18); date <= end; date = addDays(date, 1)) {
      // Graine calendaire : une même journée conserve ses données au prochain chargement.
      let seed = Math.floor(dateValue(date).getTime() / DAY) >>> 0;
      const random = (max) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * max); };
      const stamp = date.replace(/-/g, "");
      const count = 2 + random(5);
      for (let i = 0; i < count; i++) {
        const quantity = 1 + random(8), amount = round((180 + random(2200)) * quantity);
        result.sales.push({vente_id: `V-${stamp}-${i + 1}`, date, client: clients[random(clients.length)],
          region: regions[random(regions.length)], produit: products[random(products.length)], quantite: quantity,
          montant_ht: amount, cout_ht: round(amount * (0.48 + random(30) / 100)), statut: random(10) ? "Gagnée" : "Annulée"});
      }
      const operations = 2 + random(4);
      for (let i = 0; i < operations; i++) {
        const status = random(10), planned = 4 + random(29);
        result.operations.push({operation_id: `O-${stamp}-${i + 1}`, date,
          projet: `Projet ${String(1 + random(18)).padStart(2, "0")}`, equipe: ["Nord", "Ouest", "Sud"][random(3)],
          statut: status < 8 ? "Livrée" : status === 8 ? "En cours" : "Annulée",
          date_echeance: addDays(date, random(10) < 8 ? random(4) : -1 - random(3)),
          heures_prevues: planned, heures_reelles: status < 8 ? round(planned * (0.7 + random(60) / 100)) : null});
      }
      const feedback = 1 + random(5);
      for (let i = 0; i < feedback; i++) {
        const score = random(10), note = score < 5 ? 5 : score < 8 ? 4 : 1 + random(3);
        result.feedback.push({retour_id: `R-${stamp}-${i + 1}`, date, client: clients[random(clients.length)],
          canal: ["E-mail", "Téléphone", "Portail"][random(3)], note, delai_reponse_heures: round((15 + random(345)) / 60),
          commentaire: note >= 4 ? "Service apprécié, suivi clair." : "Amélioration du suivi souhaitée."});
      }
    }
    for (const table of Object.values(result)) table.reverse();
    return result;
  }

  function formatValue(value, kpi, compact = false) {
    if (value === null || !Number.isFinite(value)) return "—";
    const kind = typeof kpi === "string" ? definition(kpi).format : kpi.format;
    const options = {maximumFractionDigits: kind === "integer" ? 0 : 1};
    if (compact) options.notation = "compact";
    if (kind === "money") Object.assign(options, {style: "currency", currency: "EUR", maximumFractionDigits: compact ? 1 : 2});
    const number = new Intl.NumberFormat("fr-FR", options).format(value);
    return number + ({percent: " %", rating: " / 5", hours: " h"}[kind] || "");
  }

  function createModel(referenceDate = today()) {
    const tables = generateTables(referenceDate), cache = new Map();
    function source(tableId, period = "rolling12") {
      const table = tableDefinition(tableId), range = bounds(period, referenceDate);
      return {table, range, rows: tables[table.id].filter((row) => row.date >= range.start && row.date <= range.end)};
    }
    function evaluate(kpiId, period = "rolling12") {
      const kpi = definition(kpiId), key = `${kpi.id}:${validPeriod(period) ? period : "rolling12"}`;
      if (cache.has(key)) return cache.get(key);
      const data = source(kpi.table, period), rows = data.rows.filter(kpi.filter);
      const daily = ["month1", "week1"].includes(data.range.period);
      const bucketKey = (date) => daily ? date : date.slice(0, 7);
      const groups = new Map();
      for (const row of rows) {
        const key = bucketKey(row.date);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      const series = [];
      let cursor = daily ? data.range.start : `${data.range.start.slice(0, 7)}-01`;
      while (cursor <= data.range.end) {
        const bucket = groups.get(bucketKey(cursor)) || [];
        const start = cursor < data.range.start ? data.range.start : cursor;
        const end = daily ? cursor : addDays(shiftMonths(cursor, 1), -1);
        const label = dateValue(cursor).toLocaleDateString("fr-FR", daily ?
          {day: "2-digit", month: "2-digit", timeZone: "UTC"} : {month: "short", year: "2-digit", timeZone: "UTC"});
        series.push({label, value: kpi.calculate(bucket), count: bucket.length, start, end: end > data.range.end ? data.range.end : end});
        cursor = daily ? addDays(cursor, 1) : shiftMonths(cursor, 1);
      }
      const result = {...data, rows, kpi, value: kpi.calculate(rows), series, granularity: daily ? "jour" : "mois"};
      cache.set(key, result);
      return result;
    }
    return {referenceDate, source, evaluate};
  }

  function toCsv(table, rows) {
    const cell = (value) => {
      let text = value == null ? "" : typeof value === "number" ? String(value).replace(".", ",") : String(value);
      // Protéger les cellules texte à l'ouverture dans un tableur.
      if (typeof value === "string" && /^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return "\uFEFF" + [table.columns.map((column) => cell(column.label)).join(";"),
      ...rows.map((row) => table.columns.map((column) => cell(row[column.key])).join(";"))].join("\r\n") + "\r\n";
  }
  const api = {PERIODS, TABLES, KPIS, today, bounds, rangeLabel, formatDate, validPeriod, isKpi, definition, formatValue, createModel, toCsv,
    calculationHelpers: {sum, mean, percent}};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPIData = api;
})(globalThis);
