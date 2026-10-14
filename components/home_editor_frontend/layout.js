/* Règles de placement indépendantes du navigateur. Les lignes/colonnes commencent à 0. */
(function (root) {
  "use strict";
  const K = typeof module !== "undefined" && module.exports ? require("./data.js") : root.KPIData;
  const T = typeof module !== "undefined" && module.exports ? require("./targets.js") : root.KPITargets;
  const B = typeof module !== "undefined" && module.exports ? require("./content-blocks.js") : root.ContentBlocks;
  const F = typeof module !== "undefined" && module.exports ? require("./filters.js") : root.KPIFilters;
  const COLS = 6;
  const C = typeof module !== "undefined" && module.exports ? require("./chart-styles.js") : root.ChartStyles;
  const MAX_ROWS = 100;
  // "title" reste accepté en entrée ; normalisé en texte de niveau 1.
  const TYPES = ["text", "title", "chart", "card", "separator", "table", "manualTable", "callout"];
  const LEGACY_KPIS = {
    "overview-chart": "delivered_count", "sales-revenue": "revenue", "sales-wins": "sales_count",
    "projects-deliveries": "delivered_count", "customers-satisfaction": "satisfaction", "customers-feedback": "feedback_count",
  };
  const DEFAULT_CHART = {
    values: [12, 19, 14, 27, 22, 32],
    labels: ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin"],
  };

  function normalizeChart(value) {
    if (value === undefined) return {values: [...DEFAULT_CHART.values], labels: [...DEFAULT_CHART.labels]};
    if (!value || !Array.isArray(value.values) || !Array.isArray(value.labels) ||
        value.values.length < 2 || value.values.length > 12 ||
        value.values.length !== value.labels.length ||
        value.values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e9) ||
        value.labels.some((v) => typeof v !== "string")) return null;
    return {values: [...value.values], labels: value.labels.map((v) => v.slice(0, 24))};
  }

  function availableSpan(blocks, row, col, ignoreId = null) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 ||
        row >= MAX_ROWS || col < 0 || col >= COLS) return 0;
    let free = COLS - col;
    for (const block of blocks) {
      if (block.id === ignoreId || block.row !== row) continue;
      if (block.col <= col && block.col + block.span > col) return 0;
      if (block.col > col) free = Math.min(free, block.col - col);
    }
    return free;
  }

  function placement(blocks, row, col, wantedSpan, ignoreId = null) {
    const free = availableSpan(blocks, row, col, ignoreId);
    if (!free || !Number.isInteger(wantedSpan) || wantedSpan < 1) return null;
    return {row, col, span: Math.min(wantedSpan, free, COLS)};
  }

  function normalize(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.blocks)) return null;
    const blocks = [];
    const ids = new Set();
    if (value.blocks.length > COLS * MAX_ROWS) return null;
    for (const raw of value.blocks) {
      if (!raw || typeof raw.id !== "string" || !raw.id || raw.id.length > 100 ||
          ids.has(raw.id) || !TYPES.includes(raw.type) ||
          !Number.isInteger(raw.span) || raw.span < 1 || raw.span > COLS ||
          raw.span > availableSpan(blocks, raw.row, raw.col)) return null;
      ids.add(raw.id);
      const chartData = raw.type === "chart" ? normalizeChart(raw.chartData) : undefined;
      if (raw.type === "chart" && !chartData) return null;
      const editorial = B.normalize(raw);
      if (!editorial) return null;
      const kpiId = K.isKpi(raw.kpiId) ? raw.kpiId : LEGACY_KPIS[raw.id] || "revenue";
      const filters = ["chart", "card"].includes(raw.type) ? F.normalize(raw.filters, K.tableDefinition(K.definition(kpiId).table)) : [];
      if (!filters) return null;
      const type = raw.type === "title" ? "text" :
        raw.type === "table" && raw.table !== undefined && raw.sourceId === undefined ? "manualTable" : raw.type;
      blocks.push({
        id: raw.id, type, row: raw.row, col: raw.col, span: raw.span,
        content: String(raw.content ?? "").slice(0, 5000),
        ...editorial,
        chartKind: C.normalize(raw.chartKind),
        ...(chartData ? {chartData} : {}),
        ...(["chart", "card"].includes(raw.type) ? {
          kpiId, filters,
          period: K.validPeriod(raw.period) ? raw.period : "inherit",
          target: T.normalize(raw.target, K.isKpi(raw.kpiId) ? raw.kpiId : LEGACY_KPIS[raw.id] || "revenue"),
        } : {}),
      });
    }
    return {version: 1, blocks};
  }

  // Chercher une place après le bloc, puis avant lui, sans réduire sa largeur.
  function duplicatePlacement(blocks, block) {
    const start = block.row * COLS + block.col + block.span;
    for (let offset = 0; offset < COLS * MAX_ROWS; offset++) {
      const cell = (start + offset) % (COLS * MAX_ROWS);
      const row = Math.floor(cell / COLS), col = cell % COLS;
      if (availableSpan(blocks, row, col) >= block.span) return {row, col, span: block.span};
    }
    return null;
  }

  const api = {COLS, MAX_ROWS, TYPES, DEFAULT_CHART, normalizeChart, availableSpan, placement, normalize, duplicatePlacement};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HomeLayout = api;
})(globalThis);
