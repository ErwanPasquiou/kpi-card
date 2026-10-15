/* Sections et suivi d’actions : données locales, sans identité utilisateur. */
(function (root) {
  "use strict";
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
        priority: Object.hasOwn(PRIORITIES, action.priority) ? action.priority : "normal",
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
  let formSequence = 0;
  function renderActions(block, body, {el, editable, update, undo = null, filters = {}}) {
    const actions = block.actions || [];
    function button(label, fn) {
      const node = el("button", "button small", label); node.type = "button";
      node.addEventListener("click", fn); return node;
    }
    function draw(nextUndo = null, focusId = null) {
      body.replaceChildren(); renderActions(block, body, {el, editable, update, undo: nextUndo, filters});
      const target = focusId ? [...body.querySelectorAll("[data-action-edit]")].find(n => n.dataset.actionEdit === focusId) : body.querySelector(".action-add");
      (target || body.querySelector(".action-add"))?.focus({preventScroll: true});
    }
    function commit(next, nextUndo = null, focusId = null) {
      if (update({actions: next}) === false) return false;
      draw(nextUndo, focusId); return true;
    }
    function edit(action = null) {
      body.replaceChildren();
      const form = el("form", "action-form");
      form.append(el("h3", "chart-heading", action ? "Modifier l’action" : "Nouvelle action"));
      const id = "live-action-" + ++formSequence;
      function field(label, key, type, value, max) {
        const caption = el("label", "field-label", label); caption.htmlFor = id + key;
        const input = el("input", "field"); input.id = caption.htmlFor; input.type = type; input.value = value || "";
        if (max) input.maxLength = max;
        form.append(caption, input); return input;
      }
      const title = field("Action", "title", "text", action?.title, 240); title.required = true;
      const owner = field("Responsable", "owner", "text", action?.owner, 120);
      const due = field("Échéance", "due", "date", action?.due);
      const caption = el("label", "field-label", "Statut"); caption.htmlFor = id + "status";
      const status = el("select", "field"); status.id = caption.htmlFor;
      for (const [value, label] of Object.entries(STATUSES)) { const option = el("option", "", label); option.value = value; status.append(option); }
      status.value = action?.status || "todo"; form.append(caption, status);
      const priorityLabel = el("label", "field-label", "Priorité"); priorityLabel.htmlFor = id + "priority";
      const priority = el("select", "field"); priority.id = priorityLabel.htmlFor;
      for (const [value, label] of Object.entries(PRIORITIES)) { const option = el("option", "", label); option.value = value; priority.append(option); }
      priority.value = action?.priority || "normal"; form.append(priorityLabel, priority);
      const message = el("p", "hint"); message.setAttribute("role", "status");
      const controls = el("div", "action-controls");
      const save = el("button", "button small primary", "Enregistrer l’action"); save.type = "submit";
      controls.append(save, button("Annuler", () => draw(null, action?.id)));
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (!title.value.trim()) { title.setCustomValidity("Saisissez une action."); title.reportValidity(); return; }
        if (due.value && !validDate(due.value)) { message.textContent = "L’échéance doit être une date valide."; return; }
        const value = {id: action?.id || crypto.randomUUID(), title: title.value.trim(), owner: owner.value.trim(), due: due.value, status: status.value, priority: priority.value};
        const next = action ? actions.map(a => a.id === action.id ? value : a) : [...actions, value];
        if (!commit(next, null, value.id)) message.textContent = "L’action n’a pas pu être enregistrée.";
      });
      title.addEventListener("input", () => title.setCustomValidity(""));
      form.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); draw(null, action?.id); } });
      form.append(controls, message); body.append(form); title.focus({preventScroll: true});
    }
    body.append(el("h3", "chart-heading", block.content || "Plan d’action"));
    const done = actions.filter(a => a.status === "done").length;
    body.append(el("p", "hint", `${done} / ${actions.length} action(s) terminée(s)`));
    const progress = el("progress", "action-progress"); progress.max = Math.max(1, actions.length); progress.value = done;
    progress.setAttribute("aria-label", "Progression du plan d’action"); body.append(progress);
    if (!actions.length) body.append(el("p", "hint", editable ? "Ajoutez votre première action." : "Aucune action pour le moment."));
    if (undo && editable) {
      const notice = el("div", "action-undo"); notice.setAttribute("role", "status");
      notice.append(el("span", "", "Action supprimée."), button("Annuler la suppression", () => {
        const next = [...actions]; next.splice(Math.min(undo.index, next.length), 0, undo.action);
        commit(next, null, undo.action.id);
      })); body.append(notice);
    }
    const lateCount = actions.filter(a => overdue(a)).length;
    if (lateCount) body.append(el("p", "action-late", `${lateCount} action(s) en retard`));
    const toolbar = el("div", "action-filters");
    function filterSelect(key, label, choices) {
      const caption = el("label", "period-label", label), select = el("select", "field");
      for (const [value, name] of [["", "Tous"], ...choices]) { const option = el("option", "", name); option.value = value; select.append(option); }
      select.value = filters[key] || "";
      select.dataset.actionFilter = key;
      select.addEventListener("change", () => {
        filters[key] = select.value; draw(undo);
        body.querySelector(`[data-action-filter="${key}"]`)?.focus({preventScroll: true});
      });
      caption.append(select); toolbar.append(caption);
    }
    filterSelect("status", "Statut", Object.entries(STATUSES));
    filterSelect("priority", "Priorité", Object.entries(PRIORITIES));
    filterSelect("owner", "Responsable", [...new Set([...actions.map(a => a.owner), filters.owner].filter(Boolean))].sort().map(v => [v, v]));
    const lateLabel = el("label", "filter-value-option"), late = el("input"); late.type = "checkbox"; late.checked = !!filters.late;
    late.dataset.actionFilter = "late";
    late.addEventListener("change", () => { filters.late = late.checked; draw(undo); body.querySelector('[data-action-filter="late"]')?.focus({preventScroll: true}); });
    lateLabel.append(late, document.createTextNode("En retard uniquement")); toolbar.append(lateLabel);
    if (actions.length && editable) body.append(toolbar);
    const shown = filterActions(actions, filters);
    if (actions.length && !shown.length) body.append(el("p", "hint", "Aucune action ne correspond aux filtres."));
    const list = el("ul", "action-list");
    for (const action of shown) {
      const index = actions.findIndex(a => a.id === action.id);
      const item = el("li", "action-item status-" + action.status);
      item.append(el("strong", "", action.title || "Action sans titre"),
        el("p", "hint", (action.owner || "Responsable à définir") + " · " +
          (action.due ? "Échéance : " + action.due.split("-").reverse().join("/") : "Sans échéance")));
      item.append(el("span", "action-badge priority-" + (action.priority || "normal"), "Priorité " + PRIORITIES[action.priority || "normal"]));
      if (overdue(action)) item.append(el("span", "action-late", " · En retard"));
      if (editable) {
        const controls = el("div", "action-controls");
        const select = el("select", "field action-status"); select.setAttribute("aria-label", "Statut : " + (action.title || "Action sans titre"));
        for (const [id, label] of Object.entries(STATUSES)) { const option = el("option", "", label); option.value = id; select.append(option); }
        select.value = action.status;
        select.addEventListener("change", () => {
          if (!commit(actions.map(a => a.id === action.id ? {...a, status: select.value} : a), null, action.id)) select.value = action.status;
        });
        const modify = button("Modifier", () => edit(action)); modify.dataset.actionEdit = action.id;
        modify.setAttribute("aria-label", "Modifier l’action : " + action.title);
        const remove = button("Supprimer", () => commit(actions.filter(a => a.id !== action.id), {action, index}));
        remove.setAttribute("aria-label", "Supprimer l’action : " + action.title);
        controls.append(select, modify, remove); item.append(controls);
      } else item.append(el("span", "action-badge", STATUSES[action.status]));
      list.append(item);
    }
    body.append(list);
    if (editable) {
      const add = button("Ajouter une action", () => edit()); add.classList.add("action-add"); add.disabled = actions.length >= 50;
      body.append(add);
      if (actions.length >= 50) body.append(el("p", "hint", "Limite de 50 actions atteinte."));
    }
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
  }
  const api = {PRIORITIES, overdue, filterActions, normalize, validDate, visibleRows, renderActions, settings};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReportBlocks = api;
})(globalThis);
