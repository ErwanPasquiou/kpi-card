/* Sections et suivi d’actions : données locales, sans identité utilisateur. */
(function (root) {
  "use strict";
  const STATUSES = {todo: "À faire", doing: "En cours", done: "Terminé"};
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
        status: Object.hasOwn(STATUSES, action.status) ? action.status : "todo"});
    }
    return {actions: result};
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
  function renderActions(block, body, {el, editable, update}) {
    body.append(el("h3", "chart-heading", block.content || "Plan d’action"));
    const actions = block.actions || [], done = actions.filter(a => a.status === "done").length;
    body.append(el("p", "hint", `${done} / ${actions.length} action(s) terminée(s)`));
    const progress = el("progress", "action-progress"); progress.max = Math.max(1, actions.length); progress.value = done;
    progress.setAttribute("aria-label", "Progression du plan d’action"); body.append(progress);
    if (!actions.length) body.append(el("p", "hint", "Ajoutez vos actions dans les réglages du bloc."));
    const list = el("ul", "action-list");
    for (const action of actions) {
      const item = el("li", "action-item status-" + action.status);
      item.append(el("strong", "", action.title || "Action sans titre"),
        el("p", "hint", (action.owner || "Responsable à définir") + " · " +
          (action.due ? "Échéance : " + action.due.split("-").reverse().join("/") : "Sans échéance")));
      if (editable) {
        const select = el("select", "field action-status"); select.setAttribute("aria-label", "Statut : " + (action.title || "Action sans titre"));
        for (const [id, label] of Object.entries(STATUSES)) { const option = el("option", "", label); option.value = id; select.append(option); }
        select.value = action.status;
        select.addEventListener("change", () => {
          const result = update({actions: actions.map(a => a.id === action.id ? {...a, status: select.value} : a)});
          if (result === false) { select.value = action.status; return; }
          body.replaceChildren(); renderActions(block, body, {el, editable, update});
          [...body.querySelectorAll("select")][actions.indexOf(action)]?.focus({preventScroll: true});
        });
        item.append(select);
      } else item.append(el("span", "action-badge", STATUSES[action.status]));
      list.append(item);
    }
    body.append(list);
  }
  function settings(block, container, {el, button, changed, rebuild, focus}) {
    function input(label, id, value, type, onInput, max = 240) {
      const caption = el("label", "field-label", label); caption.htmlFor = id;
      const field = el("input", "field"); field.id = id; field.type = type; field.value = value; field.maxLength = max;
      field.addEventListener("input", () => { if (type === "date" && field.value && !validDate(field.value)) return; onInput(field.value); changed(); });
      container.append(caption, field);
    }
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
    if (block.type !== "actionPlan") return;
    block.actions ||= [];
    for (const [index, action] of block.actions.entries()) {
      container.append(el("h4", "", `Action ${index + 1}`));
      input("Action", `action-title-${index}`, action.title, "text", v => action.title = v);
      input("Responsable", `action-owner-${index}`, action.owner, "text", v => action.owner = v, 120);
      input("Échéance", `action-due-${index}`, action.due, "date", v => action.due = v);
      const label = el("label", "field-label", "Statut"); label.htmlFor = `action-status-${index}`;
      const select = el("select", "field"); select.id = label.htmlFor;
      for (const [id, name] of Object.entries(STATUSES)) { const option = el("option", "", name); option.value = id; select.append(option); }
      select.value = action.status; select.addEventListener("change", () => { action.status = select.value; changed(); });
      container.append(label, select, button("Supprimer cette action", "button small", () => {
        block.actions.splice(index, 1); changed(); rebuild(); focus("add-action");
      }));
    }
    const add = button("Ajouter une action", "button small", () => {
      if (block.actions.length >= 50) return;
      block.actions.push({id: crypto.randomUUID(), title: "Nouvelle action", owner: "", due: "", status: "todo"});
      changed(); rebuild(); focus(`action-title-${block.actions.length - 1}`);
    });
    add.id = "add-action"; add.disabled = block.actions.length >= 50; container.append(add);
  }
  const api = {normalize, validDate, visibleRows, renderActions, settings};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReportBlocks = api;
})(globalThis);
