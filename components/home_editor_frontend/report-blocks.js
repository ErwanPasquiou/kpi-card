/* Sections et suivi d’actions : données locales, sans identité utilisateur. */
(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./postit-board.js") : root.PostitBoard;
  const STATUSES = {todo: "À faire", doing: "En cours", done: "Terminé"};
  const PRIORITIES = {high: "Haute", normal: "Normale", low: "Basse"};
  const today = () => new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
  const overdue = (action, date = today()) => action.status !== "done" && !!action.due && action.due < date;
  function filterActions(actions, filters = {}, date = today()) {
    return actions.filter(a => (!filters.status || a.status === filters.status) &&
      (!filters.owner || a.owner === filters.owner) && (!filters.priority || a.priority === filters.priority) &&
      (!filters.late || overdue(a, date)));
  }
  const text = (value, max) => String(value ?? "").slice(0, max);
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function normalize(raw) {
    if (raw.type === "section") return {subtitle: text(raw.subtitle, 500), collapsed: raw.collapsed === true};
    if (raw.type === "verticalSeparator") return {lineStyle: ["solid", "dashed", "dotted"].includes(raw.lineStyle) ? raw.lineStyle : "solid"};
    if (raw.type !== "actionPlan") return {};
    const actions = raw.actions === undefined ? [] : raw.actions;
    if (!Array.isArray(actions) || actions.length > 50) return null;
    const ids = new Set();
    const result = [];
    for (const action of actions) {
      if (!action || typeof action.id !== "string" || !action.id || action.id.length > 100 || ids.has(action.id)) return null;
      if (action.due && !validDate(action.due)) return null;
      ids.add(action.id);
      result.push({id: action.id, title: text(action.title, 240), owner: text(action.owner, 120), due: action.due || "",
        columnId: text(action.columnId, 100), details: text(action.details, 5000),
        tone: Object.hasOwn(P.TONES, action.tone) ? action.tone : "info",
        priority: Object.hasOwn(PRIORITIES, action.priority) ? action.priority : "normal",
        status: Object.hasOwn(STATUSES, action.status) ? action.status : "todo"});
    }
    return P.normalize(raw, result);
  }
  // Les coordonnées sauvegardées ne changent jamais lors d’un repli.
  function visibleRows(blocks, collapsed) {
    const rows = new Map(), last = Math.max(-1, ...blocks.map(b => b.row));
    let hidden = false, next = 0;
    const sections = new Map(blocks.filter(b => b.type === "section").map(b => [b.row, b]));
    for (let row = 0; row <= last; row++) {
      const section = sections.get(row);
      if (section) { rows.set(row, next++); hidden = collapsed(section); }
      else if (!hidden) rows.set(row, next++);
    }
    return rows;
  }
  function renderActions(block, body, context) {
    P.render(block, body, {...context, overdue, validDate});
  }
  function settings(block, container, {el, button, changed, rebuild, focus}) {
    function input(label, id, value, type, onInput, max = 240) {
      const caption = el("label", "field-label", label); caption.htmlFor = id;
      const field = el("input", "field"); field.id = id; field.type = type; field.value = value; field.maxLength = max;
      field.addEventListener("input", () => { if (type === "date" && field.value && !validDate(field.value)) return; onInput(field.value); changed(); });
      container.append(caption, field);
    }
    if (block.type === "actionPlan") return P.settings(block, container, {el, changed, rebuild, focus});
    if (block.type === "section") {
      input("Sous-titre", "section-subtitle", block.subtitle || "", "text", v => block.subtitle = v, 500);
      const label = el("label", "filter-value-option");
      const check = el("input"); check.type = "checkbox"; check.checked = block.collapsed === true;
      check.addEventListener("change", () => { block.collapsed = check.checked; changed(); });
      label.append(check, document.createTextNode("Repliée à l’ouverture du rapport"));
      container.append(label, el("p", "hint", "Regroupe les blocs jusqu’à la section suivante. Déplacer ou supprimer ce titre conserve les blocs à leur place."));
    }
    if (block.type === "verticalSeparator") {
      const label = el("label", "field-label", "Style du trait"); label.htmlFor = "vertical-style";
      const select = el("select", "field"); select.id = "vertical-style";
      for (const [id, name] of [["solid", "Continu"], ["dashed", "Tirets"], ["dotted", "Pointillés"]]) { const option = el("option", "", name); option.value = id; select.append(option); }
      select.value = block.lineStyle; select.addEventListener("change", () => { block.lineStyle = select.value; changed(); });
      container.append(label, select);
    }
  }
  const api = {PRIORITIES, overdue, filterActions, normalize, validDate, visibleRows, renderActions, settings};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReportBlocks = api;
})(globalThis);
