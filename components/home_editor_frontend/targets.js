/* Objectifs des blocs : répartition calendaire et comparaison au réalisé. */
(function (root) {
  "use strict";
  const K = typeof module !== "undefined" && module.exports ? require("./data.js") : root.KPIData;
  const DAY = 86400000;
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const PERIODS = [
    {id: "month", label: "Mensuel · 1 mois", basis: "mois", months: 1},
    {id: "year", label: "À l’année", basis: "an", months: 12},
    {id: "semester", label: "Sur 6 mois", basis: "période de 6 mois", months: 6},
    {id: "quarter", label: "Sur 3 mois", basis: "période de 3 mois", months: 3},
    {id: "week", label: "À la semaine", basis: "semaine", months: 0},
  ];
  const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
  const toIso = (date) => date.toISOString().slice(0, 10);
  const nextDay = (iso) => toIso(new Date(toDate(iso).getTime() + DAY));
  const days = (start, end) => Math.round((toDate(end) - toDate(start)) / DAY) + 1;
  const kpiDefinition = (kpi) => typeof kpi === "string" ? K.definition(kpi) : kpi;
  const periodDefinition = (id) => PERIODS.find((item) => item.id === id) || PERIODS[0];

  function parseValue(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return NaN;
    const text = value.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
    if (!text) return null;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    return Number(text);
  }
  function valueError(rawValue, kpi) {
    const value = parseValue(rawValue), definition = kpiDefinition(kpi);
    if (value === null) return "";
    if (!Number.isFinite(value)) return "Saisissez un nombre valide (ex. 120000 ou 95,5).";
    if (value < 0 || value > 1e12) return "L’objectif doit être compris entre 0 et 1 000 000 000 000.";
    if (definition.format === "percent" && value > 100) return "L’objectif de ce taux doit être compris entre 0 et 100 %.";
    if (definition.format === "rating" && (value < 1 || value > 5)) return "L’objectif de note doit être compris entre 1 et 5.";
    return "";
  }
  function hasValue(raw) {
    return raw?.mode === "monthly" ? MONTHS.some((_, index) => parseValue(raw.monthlyValues?.[index]) !== null) :
      parseValue(raw?.value) !== null;
  }
  function validationIssue(raw, kpi) {
    if (raw?.mode === "monthly") {
      if (!hasValue(raw)) return null;
      for (let month = 0; month < MONTHS.length; month++) {
        const value = raw.monthlyValues?.[month];
        const message = parseValue(value) === null ? "Renseignez une cible pour ce mois." : valueError(value, kpi);
        if (message) return {message: `${MONTHS[month]} : ${message}`, month};
      }
      return null;
    }
    const message = valueError(raw?.value, kpi);
    return message ? {message, month: null} : null;
  }
  const validationError = (raw, kpi) => validationIssue(raw, kpi)?.message || "";
  function normalize(raw, kpi) {
    const definition = kpiDefinition(kpi);
    const cleanValue = (value) => valueError(value, definition) ? null : parseValue(value);
    return {
      mode: raw?.mode === "monthly" ? "monthly" : "simple",
      value: cleanValue(raw?.value),
      period: periodDefinition(raw?.period).id,
      direction: ["at_least", "at_most"].includes(raw?.direction) ? raw.direction : definition.targetDirection,
      monthlyValues: MONTHS.map((_, index) => cleanValue(raw?.monthlyValues?.[index])),
    };
  }

  function monthSlices(range) {
    let cursor = range.start;
    const slices = [];
    while (cursor <= range.end) {
      const date = toDate(cursor), month = date.getUTCMonth(), year = date.getUTCFullYear();
      const monthStart = toIso(new Date(Date.UTC(year, month, 1)));
      const monthEnd = toIso(new Date(Date.UTC(year, month + 1, 0)));
      const end = monthEnd < range.end ? monthEnd : range.end;
      slices.push({month, days: days(cursor, end), monthDays: days(monthStart, monthEnd)});
      cursor = nextDay(end);
    }
    return slices;
  }
  function valueForRange(target, kpi, range) {
    if (!hasValue(target) || validationError(target, kpi)) return null;
    const additive = kpiDefinition(kpi).targetMode === "prorata";
    if (target.mode === "monthly") {
      const slices = monthSlices(range);
      // Les seuils (taux, moyennes, distincts) restent comparables à un KPI global.
      const weighted = slices.reduce((sum, slice) => sum + target.monthlyValues[slice.month] *
        (additive ? slice.days / slice.monthDays : slice.days), 0);
      return additive ? weighted : weighted / days(range.start, range.end);
    }
    if (!additive) return target.value;
    const spec = periodDefinition(target.period);
    if (spec.id === "week") return target.value * days(range.start, range.end) / 7;
    const monthlyValue = target.value / spec.months;
    return monthSlices(range).reduce((sum, slice) => sum + monthlyValue * slice.days / slice.monthDays, 0);
  }
  function monthlyDefaults(raw, kpi, year) {
    const simple = normalize({...raw, mode: "simple"}, kpi);
    return MONTHS.map((_, month) => valueForRange(simple, kpi, {
      start: toIso(new Date(Date.UTC(year, month, 1))),
      end: toIso(new Date(Date.UTC(year, month + 1, 0))),
    }));
  }
  function evaluate(raw, result) {
    if (validationError(raw, result.kpi) || !hasValue(raw)) return null;
    const target = normalize(raw, result.kpi);
    const value = valueForRange(target, result.kpi, result.range);
    const actual = result.value;
    const delta = actual !== null && Number.isFinite(actual) ? actual - value : null;
    const tolerance = Math.max(Math.abs(value), Number.isFinite(actual) ? Math.abs(actual) : 0) * Number.EPSILON * 16;
    const adjustedDelta = delta !== null && Math.abs(delta) < tolerance ? 0 : delta;
    const relative = adjustedDelta === null || value === 0 ? null : adjustedDelta / Math.abs(value) * 100;
    const ratio = actual === null || !Number.isFinite(actual) || value === 0 ? null : actual / value * 100;
    return {
      target, value, actual, delta: adjustedDelta,
      relative: Number.isFinite(relative) ? relative : null,
      ratio: Number.isFinite(ratio) ? ratio : null,
      met: adjustedDelta === null ? null : target.direction === "at_most" ? adjustedDelta <= 0 : adjustedDelta >= 0,
      mode: result.kpi.targetMode,
      series: result.series.map((point) => valueForRange(target, result.kpi, point)),
    };
  }
  function formatValue(value, kpi, compact = false) {
    const definition = kpiDefinition(kpi);
    if (definition.format !== "integer") return K.formatValue(value, definition, compact);
    if (value === null || !Number.isFinite(value)) return "—";
    return value.toLocaleString("fr-FR", {maximumFractionDigits: 2, ...(compact ? {notation: "compact"} : {})});
  }
  function signed(value, formatter) {
    if (value === null || !Number.isFinite(value)) return "—";
    const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
    return prefix + formatter(Math.abs(value));
  }
  function formatDelta(value, kpi) {
    const definition = kpiDefinition(kpi);
    return signed(value, (absolute) => ["percent", "rating"].includes(definition.format) ?
      `${absolute.toLocaleString("fr-FR", {maximumFractionDigits: 2})} point${absolute > 1 ? "s" : ""}` : formatValue(absolute, definition));
  }
  const formatRelative = (value) => signed(value, (absolute) => `${absolute.toLocaleString("fr-FR", {maximumFractionDigits: 1})} %`);
  function policyText(kpi) {
    const definition = kpiDefinition(kpi);
    if (definition.targetMode === "prorata") return "Les objectifs mensuels s’additionnent : 1 000 par mois donne 12 000 sur 12 mois complets. Chaque mois partiel est proratisé selon ses jours couverts. Une cible hebdomadaire est répartie sur 7 jours.";
    const subject = definition.id === "projects_count" ? "Les projets distincts ne s’additionnent pas dans le temps." : "Les taux et moyennes ne s’additionnent pas dans le temps.";
    return `${subject} En mode simple, la cible reste fixe. En avancé, les cibles mensuelles sont moyennées en fonction du nombre de jours couverts par le rapport.`;
  }
  function description(comparison, kpi) {
    if (comparison.target.mode === "monthly") return `Objectifs mensuels personnalisés · ${comparison.mode === "prorata" ? "prorata des mois partiels" : "moyenne pondérée par les jours"}`;
    const spec = periodDefinition(comparison.target.period);
    return `${formatValue(comparison.target.value, kpi)} par ${spec.basis} · ${comparison.mode === "prorata" ? "prorata des jours couverts" : "cible fixe"}`;
  }
  function statusLabel(comparison) {
    if (comparison.met === null) return "Comparaison indisponible";
    if (comparison.target.direction === "at_most") return comparison.met ? "Plafond respecté" : "Plafond dépassé";
    return comparison.met ? "Objectif atteint" : "Objectif non atteint";
  }
  const api = {PERIODS, MONTHS, parseValue, hasValue, valueError, validationIssue, validationError, normalize, periodDefinition, valueForRange, monthlyDefaults, evaluate,
    formatValue, formatDelta, formatRelative, policyText, description, statusLabel};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPITargets = api;
})(globalThis);
