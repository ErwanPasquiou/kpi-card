/* Filtres typés partagés : avant agrégation, tri puis pagination. */
(function (root) {
  "use strict";
  const MAX_FILTERS = 20;
  const LABELS = {eq: "Est égal à", ne: "Est différent de", contains: "Contient",
    gte: "Est supérieur ou égal à", lte: "Est inférieur ou égal à",
    empty: "Est vide", notEmpty: "N’est pas vide"};
  const empty = (value) => value == null || value === "";
  const fold = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  function operators(column) {
    return column.kind === "number" || column.kind === "date" ?
      ["eq", "ne", "gte", "lte", "empty", "notEmpty"] : ["eq", "ne", "contains", "empty", "notEmpty"];
  }
  function normalize(raw, table) {
    if (raw === undefined) return [];
    if (!Array.isArray(raw) || raw.length > MAX_FILTERS) return null;
    const result = [];
    for (const item of raw) {
      const column = table.columns.find((column) => column.key === item?.column);
      if (!column || !operators(column).includes(item.op)) return null;
      let value = item.value;
      if (["empty", "notEmpty"].includes(item.op)) value = "";
      else if (column.kind === "number") {
        if (typeof value !== "number" && typeof value !== "string") return null;
        const input = String(value).trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)) return null;
        value = Number(input);
        if (!Number.isFinite(value)) return null;
      } else if (column.kind === "date") {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const date = new Date(value + "T00:00:00Z");
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
      } else {
        if (typeof value !== "string" || !value.trim() || value.length > 240) return null;
        value = value.trim();
      }
      result.push({column: column.key, op: item.op, value});
    }
    return result;
  }
  function apply(rows, filters, table) {
    const normalized = normalize(filters, table);
    if (!normalized) throw new Error("Filtres invalides pour cette source.");
    const kinds = Object.fromEntries(table.columns.map((column) => [column.key, column.kind]));
    return rows.filter((row) => normalized.every(({column, op, value}) => {
      const actual = row[column];
      if (op === "empty") return empty(actual);
      if (op === "notEmpty") return !empty(actual);
      if (empty(actual)) return false;
      const a = kinds[column] === "text" ? fold(actual) : actual;
      const b = kinds[column] === "text" ? fold(value) : value;
      if (op === "eq") return a === b;
      if (op === "ne") return a !== b;
      if (op === "contains") return a.includes(b);
      if (op === "gte") return a >= b;
      return a <= b;
    }));
  }
  function normalizeSort(raw, table) {
    if (!raw) return {column: "date", direction: "desc"};
    return table.columns.some((column) => column.key === raw.column) && ["asc", "desc"].includes(raw.direction) ?
      {column: raw.column, direction: raw.direction} : null;
  }
  function sorted(rows, sort, table) {
    const spec = normalizeSort(sort, table);
    if (!spec) throw new Error("Tri invalide pour cette source.");
    const column = table.columns.find((item) => item.key === spec.column);
    return rows.map((row, index) => ({row, index})).sort((a, b) => {
      const x = a.row[spec.column], y = b.row[spec.column];
      if (empty(x) || empty(y)) return empty(x) && empty(y) ? a.index - b.index : empty(x) ? 1 : -1;
      const order = column.kind === "number" ? x - y :
        String(x).localeCompare(String(y), "fr", {numeric: true, sensitivity: "base"});
      return (spec.direction === "desc" ? -order : order) || a.index - b.index;
    }).map((item) => item.row);
  }
  function page(rows, index, size) {
    const pageSize = [10, 25, 50].includes(size) ? size : 10;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.min(pages - 1, Math.max(0, Number.isInteger(index) ? index : 0));
    return {rows: rows.slice(current * pageSize, (current + 1) * pageSize), index: current, pages, total: rows.length};
  }
  function describe(filters, table) {
    return (filters || []).map((item) => {
      const label = table.columns.find((column) => column.key === item.column)?.label || item.column;
      return label + " " + LABELS[item.op].toLocaleLowerCase("fr") +
        (["empty", "notEmpty"].includes(item.op) ? "" : " " + item.value);
    }).join(" · ET · ");
  }
  const api = {MAX_FILTERS, LABELS, operators, normalize, apply, normalizeSort, sorted, page, describe};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPIFilters = api;
})(globalThis);
