/* Modèle du hub, exemples et validation de la collection enregistrée. */
(function (root) {
  "use strict";
  const L = typeof module !== "undefined" && module.exports ? require("./layout.js") : root.HomeLayout;
  const K = typeof module !== "undefined" && module.exports ? require("./data.js") : root.KPIData;
  const BADGES = ["Personnel", "Pilotage", "Commercial", "Projets", "Relation client", "Finance", "Marketing", "Ressources humaines", "Opérations", "Production", "Logistique", "Achats", "Qualité", "Informatique", "Support", "Innovation", "RSE", "Juridique", "Sécurité", "Autre"];
  const THEMES = ["blue", "teal", "violet", "amber"];
  const R = typeof module !== "undefined" && module.exports ? require("./report-analysis.js") : root.ReportAnalysis;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  // Convertir uniquement les chiffres d'exemple restés intacts ; préserver les textes personnalisés.
  const LEGACY_CARDS = {
    "overview-volume": ["128 opérations\nréalisées en juin\n\n+ 16 % par rapport à mai", "delivered_count"],
    "overview-quality": ["94 %\nde réalisation dans les délais\n\nObjectif : 95 %", "on_time"],
    "overview-projects": ["18 projets\nen cours\n\n3 livraisons prévues cette semaine", "projects_count"],
    "sales-total": ["1 240 k€\nde chiffre d’affaires au semestre\n\n95,4 % de l’objectif de 1 300 k€", "revenue"],
    "projects-portfolio": ["12 projets\nen portefeuille\n\nUne vue commune pour toute l’équipe", "projects_count"],
    "projects-done": ["8 livraisons\nréalisées en juin", "delivered_count"],
    "projects-attention": ["2 projets\nà surveiller cette semaine", "on_time"],
    "customers-score": ["92 %\nde clients satisfaits en juin\n\n+ 8 points depuis janvier", "satisfaction"],
    "customers-rating": ["4,6 / 5\nnote moyenne des avis\n\nUne qualité à maintenir", "average_rating"],
    "customers-delay": ["2 heures\nde délai moyen de réponse\n\nObjectif : moins de 3 heures", "response_time"],
  };

  function upgradeExamples(raw) {
    if (!raw.example || !Array.isArray(raw.layout?.blocks)) return raw.layout;
    return {...raw.layout, blocks: raw.layout.blocks.map((block) => {
      if (!block) return block;
      const legacy = LEGACY_CARDS[block.id];
      if (legacy && block.type === "text" && block.content === legacy[0]) {
        return {...block, type: "card", kpiId: legacy[1], period: "inherit", content: K.definition(legacy[1]).label};
      }
      if (block.id === "sales-revenue" && !block.kpiId && block.content === "Chiffre d’affaires mensuel · k€") {
        return {...block, content: "Chiffre d’affaires HT"};
      }
      return block;
    })};
  }

  function normalizeBoard(raw) {
    if (!raw || typeof raw.id !== "string" || !raw.id || raw.id.length > 100 ||
        typeof raw.name !== "string" || !raw.name.trim()) return null;
    const layout = L.normalize(upgradeExamples(raw));
    const globalFilters = R.normalizeFilters(raw.globalFilters);
    if (!layout || !globalFilters) return null;
    return {
      id: raw.id, name: raw.name.trim().slice(0, 90),
      description: String(raw.description ?? "").trim().slice(0, 240),
      category: String(raw.category || "Personnel").slice(0, 40),
      theme: THEMES.includes(raw.theme) ? raw.theme : "blue",
      example: raw.example === true,
      favorite: raw.favorite === true,
      period: K.validPeriod(raw.period) ? raw.period : "rolling12",
      comparison: raw.comparison === "none" ? "none" : "previous",
      globalFilters,
      updatedAt: Number.isFinite(raw.updatedAt) && raw.updatedAt > 0 ? raw.updatedAt : 0,
      layout,
    };
  }

  function normalize(raw) {
    if (!raw || raw.version !== 2 || !Array.isArray(raw.dashboards) || raw.dashboards.length > 200) return null;
    const dashboards = [], ids = new Set();
    for (const item of raw.dashboards) {
      const board = normalizeBoard(item);
      if (!board || ids.has(board.id)) return null;
      ids.add(board.id);
      dashboards.push(board);
    }
    return {version: 2, dashboards};
  }

  function upsert(collection, value) {
    const board = normalizeBoard(value);
    if (!board) throw new Error("Tableau de bord invalide.");
    const dashboards = clone(collection.dashboards);
    const index = dashboards.findIndex((item) => item.id === board.id);
    if (index < 0) dashboards.push(board); else dashboards[index] = board;
    const result = normalize({version: 2, dashboards});
    if (!result) throw new Error("La collection est invalide ou contient plus de 200 tableaux.");
    return result;
  }

  function remove(collection, id) {
    return {version: 2, dashboards: clone(collection.dashboards.filter((board) => board.id !== id))};
  }

  function examples(now = Date.now()) {
    const block = (id, type, row, col, span, content, options = {}) => ({id, type, row, col, span, content, ...options});
    const metric = (id, row, col, span, kpiId) => block(id, "card", row, col, span, K.definition(kpiId).label, {kpiId});
    const board = (id, name, description, category, theme, blocks) => ({
      id, name, description, category, theme, example: true, updatedAt: now,
      layout: {version: 1, blocks},
    });
    return normalize({version: 2, dashboards: [
      board("example-overview", "Vue d’ensemble", "Les chiffres clés et les priorités réunis en un coup d’œil.", "Pilotage", "blue", [
        block("overview-heading", "title", 0, 0, 6, "L’essentiel, en un regard"),
        metric("overview-volume", 1, 0, 2, "delivered_count"),
        metric("overview-quality", 1, 2, 2, "on_time"),
        metric("overview-projects", 1, 4, 2, "projects_count"),
        block("overview-chart", "chart", 2, 0, 4, "Opérations livrées", {chartKind: "bar", kpiId: "delivered_count"}),
        block("overview-note", "text", 2, 4, 2, "Le point de la semaine\n\nFinaliser les trois livraisons et préparer la revue des projets du mois prochain."),
        block("overview-separator", "separator", 3, 0, 6, "De l’analyse à l’action", {lineStyle: "solid", spacing: 24}),
        block("overview-actions", "table", 4, 0, 4, "Détail des opérations", {sourceId: "operations"}),
        block("overview-decision", "callout", 4, 4, 2, "Valider ensemble la prochaine étape à partir des indicateurs et du plan d’action.", {tone: "success", heading: "La décision à prendre"}),
      ]),
      board("example-sales", "Performance commerciale", "Chiffre d’affaires, ventes et progression vers les objectifs.", "Commercial", "teal", [
        block("sales-heading", "title", 0, 0, 6, "Garder le cap sur vos objectifs"),
        block("sales-revenue", "chart", 1, 0, 4, "Chiffre d’affaires HT", {chartKind: "line", kpiId: "revenue"}),
        metric("sales-total", 1, 4, 2, "revenue"),
        block("sales-note", "text", 2, 0, 3, "Les priorités commerciales\n\nRelancer les propositions en cours.\nPréparer les rendez-vous de renouvellement.\nPartager les retours clients avec l’équipe."),
        block("sales-wins", "chart", 2, 3, 3, "Ventes conclues", {chartKind: "bar", kpiId: "sales_count"}),
      ]),
      board("example-projects", "Suivi des projets", "Une vue partagée sur les livraisons et le travail à venir.", "Projets", "violet", [
        block("projects-heading", "title", 0, 0, 4, "Faire avancer les projets ensemble"),
        metric("projects-portfolio", 0, 4, 2, "projects_count"),
        block("projects-deliveries", "chart", 1, 0, 3, "Opérations livrées", {chartKind: "bar", kpiId: "delivered_count"}),
        block("projects-priorities", "text", 1, 3, 3, "Priorités de la semaine\n\n01 · Valider le prototype du portail.\n02 · Préparer la recette utilisateur.\n03 · Mettre à jour le planning partagé."),
        metric("projects-done", 2, 0, 2, "delivered_count"),
        metric("projects-attention", 2, 2, 2, "on_time"),
        block("projects-next", "text", 2, 4, 2, "Prochain jalon\n\nRevue de démonstration avec les équipes"),
      ]),
      board("example-customers", "Satisfaction client", "Écoute client, qualité de service et retours à partager.", "Relation client", "amber", [
        block("customers-heading", "title", 0, 0, 6, "Prendre le pouls de vos clients"),
        metric("customers-score", 1, 0, 2, "satisfaction"),
        metric("customers-rating", 1, 2, 2, "average_rating"),
        metric("customers-delay", 1, 4, 2, "response_time"),
        block("customers-satisfaction", "chart", 2, 0, 3, "Clients satisfaits", {chartKind: "line", kpiId: "satisfaction"}),
        block("customers-feedback", "chart", 2, 3, 3, "Retours clients recueillis", {chartKind: "bar", kpiId: "feedback_count"}),
      ]),
    ]});
  }

  function fromLegacy(layout, now = Date.now()) {
    const valid = L.normalize(layout);
    if (!valid || !valid.blocks.length) return null;
    return normalizeBoard({id: "imported-home", name: "Mon premier tableau", description: "Votre composition enregistrée dans le premier POC.",
      category: "Personnel", theme: "blue", example: false, updatedAt: now, layout: valid});
  }

  const api = {BADGES,THEMES, normalizeBoard, normalize, upsert, remove, examples, fromLegacy};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Dashboards = api;
})(globalThis);
