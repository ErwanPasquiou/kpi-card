/* Interfaces interactives des blocs ; les données restent fictives et locales. */
(function (root) {
  "use strict";
  const K = root.KPIData, F = root.KPIFilters;
  let sequence = 0;
  const el = (tag, className = "", text = null) => {
    const node = document.createElement(tag); node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  };
  function button(label, action, className = "button small") {
    const node = el("button", className, label); node.type = "button";
    node.addEventListener("click", action); return node;
  }
  function select(label, options, value, parent) {
    const id = "data-field-" + ++sequence;
    const caption = el("label", "field-label", label); caption.htmlFor = id;
    const node = el("select", "field"); node.id = id;
    for (const [key, text] of options) {
      const option = el("option", "", text); option.value = key; node.append(option);
    }
    node.value = String(value); parent.append(caption, node); return node;
  }
  function filterEditor(parent, table, filters, onChange, fixedColumn = null) {
    const wrap = el("div", "filters-editor");
    const summary = el("div", "filter-chips");
    filters.forEach((filter, index) => {
      if (fixedColumn && filter.column !== fixedColumn) return;
      summary.append(button("Retirer : " + F.describe([filter], table), () => onChange(filters.filter((_, i) => i !== index)), "filter-chip"));
    });
    wrap.append(summary);
    const form = el("form", "filter-form");
    const columns = fixedColumn ? table.columns.filter((column) => column.key === fixedColumn) : table.columns;
    const field = select("Colonne à filtrer", columns.map((column) => [column.key, column.label]), columns[0].key, form);
    const operator = select("Condition", [], "", form);
    const caption = el("label", "field-label", "Valeur");
    const input = el("input", "field"); input.id = "filter-value-" + ++sequence; caption.htmlFor = input.id;
    input.maxLength = 240; input.autocomplete = "off";
    const message = el("p", "target-error"); message.setAttribute("role", "alert");
    const updateValue = () => { input.disabled = ["empty", "notEmpty"].includes(operator.value); };
    const updateColumn = () => {
      const column = table.columns.find((column) => column.key === field.value);
      operator.replaceChildren();
      for (const op of F.operators(column)) {
        const option = el("option", "", F.LABELS[op]); option.value = op; operator.append(option);
      }
      operator.value = column.kind === "text" ? "contains" : "eq";
      input.type = column.kind === "date" ? "date" : "text";
      input.inputMode = column.kind === "number" ? "decimal" : "text";
      input.value = ""; input.placeholder = column.kind === "number" ? "Ex. 1000 ou 95,5" : "Valeur recherchée";
      message.textContent = ""; updateValue();
    };
    field.addEventListener("change", updateColumn); operator.addEventListener("change", updateValue); updateColumn();
    form.append(caption, input, message);
    const submit = el("button", "button small", "Appliquer le filtre"); submit.type = "submit";
    submit.disabled = filters.length >= F.MAX_FILTERS; form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const next = F.normalize([...filters, {column: field.value, op: operator.value, value: input.value}], table);
      if (!next) { message.textContent = "Saisissez une valeur valide pour cette colonne (nombre, date ou texte non vide)."; input.focus(); return; }
      onChange(next);
    });
    wrap.append(form, el("p", "width-help", "Les conditions se combinent avec ET, en plus de la période. Maximum 20 filtres."));
    if (filters.length) wrap.append(button("Effacer tous les filtres", () => onChange([])));
    parent.append(wrap);
    return input;
  }
  function table(block, body, model, period, update) {
    const surface = el("section", "source-table-block");
    // Empêcher une interaction interne de reconstruire l'inspecteur du bloc.
    surface.addEventListener("click", (event) => event.stopPropagation());
    surface.addEventListener("keydown", (event) => event.stopPropagation());
    let page = 0, selectedColumn = null;
    const commit = (patch) => {
      if (update(patch) === false) return;
      page = 0; draw(); surface.querySelector(".column-panel button")?.focus();
    };
    function draw() {
      const scroll = surface.querySelector(".table-scroll")?.scrollLeft || 0;
      surface.replaceChildren();
      const data = model.source(block.sourceId, period, block.filters || []);
      const sorted = F.sorted(data.rows, block.sort, data.table);
      const slice = F.page(sorted, page, block.pageSize);
      page = slice.index;
      surface.append(el("h3", "chart-heading", block.content || data.table.label),
        el("p", "demo-label", data.table.label + " · Données brutes fictives"),
        el("p", "metric-range", K.rangeLabel(data.range)),
        el("p", "filter-summary", F.describe(data.filters, data.table) || "Aucun filtre de colonne"));
      const hint = el("p", "width-help", "Cliquez sur un en-tête pour trier ou filtrer sa colonne.");
      surface.append(hint);
      if (selectedColumn) {
        const column = data.table.columns.find((item) => item.key === selectedColumn);
        const panel = el("section", "column-panel");
        panel.setAttribute("aria-label", "Tri et filtres : " + column.label);
        panel.append(el("h4", "", column.label));
        const controls = el("div", "table-controls");
        controls.append(button("Tri croissant", () => commit({sort: {column: column.key, direction: "asc"}})),
          button("Tri décroissant", () => commit({sort: {column: column.key, direction: "desc"}})),
          button("Fermer", () => { selectedColumn = null; draw(); surface.querySelector('[data-column="' + column.key + '"]')?.focus(); }));
        panel.append(controls);
        filterEditor(panel, data.table, block.filters || [], (filters) => commit({filters}), column.key);
        surface.append(panel);
      }
      const wrap = el("div", "table-scroll");
      wrap.tabIndex = 0; wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", "Données brutes : " + data.table.label);
      const grid = el("table", "raw-table");
      grid.append(el("caption", "sr-only", block.content || data.table.label));
      const head = el("thead"), tr = el("tr"), tbody = el("tbody");
      for (const column of data.table.columns) {
        const th = el("th", column.kind === "number" ? "numeric" : ""); th.scope = "col";
        const active = block.sort?.column === column.key;
        th.setAttribute("aria-sort", active ? block.sort.direction === "asc" ? "ascending" : "descending" : "none");
        const filtered = (block.filters || []).some((filter) => filter.column === column.key);
        const trigger = button(column.label + (active ? block.sort.direction === "asc" ? " ↑" : " ↓" : "") + (filtered ? " •" : ""), () => {
          selectedColumn = column.key; draw(); surface.querySelector(".column-panel button")?.focus();
        }, "column-trigger");
        trigger.dataset.column = column.key;
        trigger.setAttribute("aria-label", "Trier ou filtrer : " + column.label);
        trigger.setAttribute("aria-expanded", String(selectedColumn === column.key));
        th.append(trigger); tr.append(th);
      }
      head.append(tr);
      for (const row of slice.rows) {
        const line = el("tr");
        for (const column of data.table.columns) {
          const value = row[column.key];
          const text = value == null ? "—" : column.kind === "date" ? K.formatDate(value) :
            typeof value === "number" ? value.toLocaleString("fr-FR", {maximumFractionDigits: 2}) : value;
          line.append(el("td", column.kind === "number" ? "numeric" : "", text));
        }
        tbody.append(line);
      }
      if (!slice.total) {
        const line = el("tr"), cell = el("td", "empty-data", "Aucune ligne ne correspond à ces filtres.");
        cell.colSpan = data.table.columns.length; line.append(cell); tbody.append(line);
      }
      grid.append(head, tbody); wrap.append(grid); surface.append(wrap); wrap.scrollLeft = scroll;
      const controls = el("div", "data-pagination");
      const previous = button("Précédent", () => { page--; draw(); surface.querySelector('[data-page="previous"]:not(:disabled), [data-page="next"]:not(:disabled)')?.focus(); });
      const next = button("Suivant", () => { page++; draw(); (surface.querySelector('[data-page="next"]:not(:disabled)') || surface.querySelector('[data-page="previous"]:not(:disabled)'))?.focus(); });
      previous.dataset.page = "previous"; next.dataset.page = "next";
      previous.disabled = page === 0; next.disabled = page === slice.pages - 1;
      const status = el("span", "", slice.total.toLocaleString("fr-FR") + " lignes · Page " + (page + 1) + " sur " + slice.pages);
      status.setAttribute("role", "status");
      controls.append(previous, status, next); surface.append(controls);
    }
    draw(); body.append(surface);
  }
  function note(block, body, update) {
    const tone = {info: "Information", success: "Décision / réussite", warning: "Point de vigilance"};
    const box = el("form", "editorial-callout live-note tone-" + (block.tone || "info"));
    box.append(el("span", "callout-label", tone[block.tone] || tone.info));
    const headingLabel = el("label", "field-label", "Titre de la note"), title = el("input", "field live-note-title");
    title.id = "note-heading-" + ++sequence; headingLabel.htmlFor = title.id; title.value = block.heading || ""; title.maxLength = 120;
    const contentLabel = el("label", "field-label", "Votre note"), content = el("textarea", "field live-note-content");
    content.id = "note-content-" + sequence; contentLabel.htmlFor = content.id; content.value = block.content; content.maxLength = 5000; content.rows = 4;
    const status = el("p", "width-help"); status.setAttribute("role", "status");
    const actions = el("div", "table-controls");
    const save = el("button", "button small", "Enregistrer la note"); save.type = "submit";
    const cancel = button("Annuler la saisie", () => {
      title.value = block.heading || ""; content.value = block.content;
      status.textContent = "Saisie annulée."; dirty();
    });
    function dirty() { const changed = title.value !== (block.heading || "") || content.value !== block.content; save.disabled = cancel.disabled = !changed; }
    for (const input of [title, content]) input.addEventListener("input", () => { dirty(); status.textContent = "Note modifiée, à enregistrer."; });
    box.addEventListener("submit", (event) => {
      event.preventDefault();
      const saved = update({heading: title.value, content: content.value});
      if (saved === false) { status.textContent = "La note n’a pas pu être enregistrée."; return; }
      dirty(); status.textContent = saved === "session" ? "Note conservée pour cette session uniquement." : "Note enregistrée dans ce navigateur.";
    });
    actions.append(save, cancel); box.append(headingLabel, title, contentLabel, content, actions, status);
    dirty(); body.append(box);
  }
  root.InteractiveBlocks = {filterEditor, table, note};
})(globalThis);
