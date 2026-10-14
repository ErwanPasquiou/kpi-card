/* Blocs éditoriaux : schéma borné, migration et présentation sans HTML utilisateur. */
(function (root) {
  "use strict";
  const K = typeof module !== "undefined" && module.exports ? require("./data.js") : root.KPIData;
  const F = typeof module !== "undefined" && module.exports ? require("./filters.js") : root.KPIFilters;
  const MAX_COLUMNS = 6, MAX_TABLE_ROWS = 20, MAX_CELL = 240;
  const STYLES = ["paragraph", "heading1", "heading2"];
  const TONES = {info: "Information", success: "Décision / réussite", warning: "Point de vigilance"};
  const text = (value, max = MAX_CELL) => String(value ?? "").slice(0, max);
  const defaults = () => ({
    columns: ["Sujet", "Responsable", "Échéance"],
    rows: [["Préparer la démonstration", "Équipe projet", "Mercredi"],
      ["Valider la prochaine étape", "Comité de décision", "À confirmer"]],
  });
  function normalizeTable(raw) {
    if (raw === undefined) return defaults();
    if (!raw || !Array.isArray(raw.columns) || !Array.isArray(raw.rows) ||
        raw.columns.length < 1 || raw.columns.length > MAX_COLUMNS ||
        raw.rows.length < 1 || raw.rows.length > MAX_TABLE_ROWS ||
        raw.columns.some((cell) => typeof cell !== "string") ||
        raw.rows.some((row) => !Array.isArray(row) || row.length !== raw.columns.length ||
          row.some((cell) => typeof cell !== "string"))) return null;
    return {columns: raw.columns.map((cell) => text(cell)),
      rows: raw.rows.map((row) => row.map((cell) => text(cell)))};
  }
  function normalize(raw) {
    if (raw.type === "text" || raw.type === "title") return {
      textStyle: raw.type === "title" ? "heading1" : STYLES.includes(raw.textStyle) ? raw.textStyle : "paragraph",
      align: ["left", "center", "right"].includes(raw.align) ? raw.align : "left",
    };
    if (raw.type === "separator") return {
      lineStyle: ["solid", "dashed", "dotted"].includes(raw.lineStyle) ? raw.lineStyle : "solid",
      spacing: [12, 24, 40].includes(raw.spacing) ? raw.spacing : 24,
    };
    if (raw.type === "manualTable" || raw.type === "table" && raw.table !== undefined && raw.sourceId === undefined) {
      const table = normalizeTable(raw.table);
      return table ? {table} : null;
    }
    if (raw.type === "table") {
      const sourceId = K.TABLES.some((table) => table.id === raw.sourceId) ? raw.sourceId : "sales";
      const table = K.tableDefinition(sourceId), filters = F.normalize(raw.filters, table), sort = F.normalizeSort(raw.sort, table);
      if (!filters || !sort) return null;
      return {sourceId, filters, sort, period: K.validPeriod(raw.period) ? raw.period : "inherit",
        pageSize: [10, 25, 50].includes(raw.pageSize) ? raw.pageSize : 10};
    }
    if (raw.type === "callout") return {
      tone: Object.hasOwn(TONES, raw.tone) ? raw.tone : "info",
      heading: text(raw.heading, 120),
    };
    return {};
  }
  function render(block, body, el) {
    if (block.type === "text") {
      const tag = {heading1: "h2", heading2: "h3", paragraph: "p"}[block.textStyle] || "p";
      const node = el(tag, `editorial-text text-${block.textStyle || "paragraph"}${block.content ? "" : " block-placeholder"}`,
        block.content || "Votre texte");
      node.style.textAlign = block.align || "left";
      body.append(node);
    }
    if (block.type === "separator") {
      const rule = el("div", "editorial-separator");
      rule.style.setProperty("--separator-space", `${block.spacing || 24}px`);
      rule.style.setProperty("--separator-style", block.lineStyle || "solid");
      if (block.content) rule.append(el("span", "", block.content));
      else { rule.setAttribute("role", "separator"); rule.setAttribute("aria-label", "Séparateur de section"); }
      body.append(rule);
    }
    if (block.type === "callout") {
      const box = el("aside", `editorial-callout tone-${block.tone || "info"}`);
      box.append(el("span", "callout-label", TONES[block.tone] || TONES.info));
      if (block.heading) box.append(el("h3", "", block.heading));
      box.append(el("p", "", block.content || "Votre message"));
      body.append(box);
    }
    if (block.type === "manualTable") {
      const data = block.table || defaults();
      const wrap = el("div", "editorial-table-scroll");
      wrap.tabIndex = 0; wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", block.content || "Tableau manuel");
      const table = el("table", "editorial-table");
      table.append(el("caption", "", block.content || "Tableau manuel"));
      const head = el("thead"), tr = el("tr"), tbody = el("tbody");
      data.columns.forEach((label, i) => {
        const th = el("th", "", label || `Colonne ${i + 1}`); th.scope = "col"; tr.append(th);
      });
      head.append(tr);
      for (const row of data.rows) {
        const line = el("tr");
        for (const value of row) line.append(el("td", "", value || "—"));
        tbody.append(line);
      }
      table.append(head, tbody); wrap.append(table);
      body.append(wrap, el("p", "manual-data-note", "Contenu saisi manuellement · Démonstration"));
    }
  }
  function settings(block, container, ui) {
    const {el, button, changed, rebuild, focus} = ui;
    function field(label, id, value, action, max = MAX_CELL) {
      const caption = el("label", "field-label", label); caption.htmlFor = id;
      const input = el("input", "field"); input.id = id; input.type = "text";
      input.maxLength = max; input.value = value;
      input.addEventListener("input", () => { action(input.value); changed(); });
      container.append(caption, input); return input;
    }
    function select(label, id, choices, value, action) {
      const caption = el("label", "field-label", label); caption.htmlFor = id;
      const input = el("select", "field"); input.id = id;
      for (const [key, title] of choices) {
        const option = el("option", "", title); option.value = key; input.append(option);
      }
      input.value = String(value);
      input.addEventListener("change", () => { action(input.value); changed(); });
      container.append(caption, input);
    }
    if (block.type === "text") {
      select("Style du texte", "text-style", [["heading1", "Titre 1"], ["heading2", "Titre 2"], ["paragraph", "Texte"]],
        block.textStyle || "paragraph", (value) => { block.textStyle = value; });
      select("Alignement", "text-align", [["left", "À gauche"], ["center", "Centré"], ["right", "À droite"]],
        block.align || "left", (value) => { block.align = value; });
    }
    if (block.type === "separator") {
      select("Style du trait", "separator-style", [["solid", "Continu"], ["dashed", "Tirets"], ["dotted", "Pointillés"]],
        block.lineStyle || "solid", (value) => { block.lineStyle = value; });
      select("Espacement", "separator-spacing", [[12, "Compact"], [24, "Normal"], [40, "Aéré"]],
        block.spacing || 24, (value) => { block.spacing = Number(value); });
    }
    if (block.type === "callout") {
      select("Intention", "callout-tone", Object.entries(TONES), block.tone || "info", (value) => { block.tone = value; });
      field("Titre de l’encadré", "callout-heading", block.heading || "", (value) => { block.heading = value; }, 120);
    }
    if (block.type !== "manualTable") return;
    block.table ||= defaults();
    const data = block.table;
    container.append(el("p", "width-help", "Modifiez les en-têtes et les cellules. Jusqu’à 6 colonnes et 20 lignes. Aucune connexion à une source."));
    const columnActions = el("div", "table-edit-actions");
    const addColumn = button("+ Colonne", "button small", () => {
      if (data.columns.length >= MAX_COLUMNS) return;
      data.columns.push(`Colonne ${data.columns.length + 1}`);
      data.rows.forEach((row) => row.push(""));
      changed(); rebuild(); focus(`table-heading-${data.columns.length - 1}`);
    });
    addColumn.disabled = data.columns.length >= MAX_COLUMNS;
    columnActions.append(addColumn); container.append(columnActions);
    data.columns.forEach((label, col) => {
      field(`En-tête ${col + 1}`, `table-heading-${col}`, label, (value) => { data.columns[col] = value; });
      const remove = button(`Supprimer la colonne ${col + 1}`, "table-remove", () => {
        if (data.columns.length <= 1) return;
        data.columns.splice(col, 1); data.rows.forEach((row) => row.splice(col, 1));
        changed(); rebuild(); focus(`table-heading-${Math.min(col, data.columns.length - 1)}`);
      });
      remove.disabled = data.columns.length <= 1; container.append(remove);
    });
    container.append(el("p", "width-help", "Supprimer une ligne ou une colonne efface ses cellules dans le brouillon. Annuler le tableau de bord restaure sa dernière version enregistrée."));
    data.rows.forEach((row, index) => {
      const group = el("fieldset", "table-row-editor");
      group.append(el("legend", "", `Ligne ${index + 1}`));
      row.forEach((value, col) => {
        const id = `table-cell-${index}-${col}`;
        const caption = el("label", "field-label", data.columns[col] || `Colonne ${col + 1}`); caption.htmlFor = id;
        const input = el("input", "field"); input.id = id; input.value = value; input.maxLength = MAX_CELL;
        input.setAttribute("aria-label", `Ligne ${index + 1}, colonne ${col + 1}`);
        input.addEventListener("input", () => { row[col] = input.value; changed(); });
        group.append(caption, input);
      });
      const remove = button("Supprimer cette ligne", "table-remove", () => {
        if (data.rows.length <= 1) return;
        data.rows.splice(index, 1); changed(); rebuild();
        focus(`table-cell-${Math.min(index, data.rows.length - 1)}-0`);
      });
      remove.disabled = data.rows.length <= 1; group.append(remove); container.append(group);
    });
    const addRow = button("+ Ligne", "button small", () => {
      if (data.rows.length >= MAX_TABLE_ROWS) return;
      data.rows.push(data.columns.map(() => ""));
      changed(); rebuild(); focus(`table-cell-${data.rows.length - 1}-0`);
    });
    addRow.disabled = data.rows.length >= MAX_TABLE_ROWS; container.append(addRow);
  }
  const api = {MAX_COLUMNS, MAX_TABLE_ROWS, MAX_CELL, defaults, normalizeTable, normalize, render, settings};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ContentBlocks = api;
})(globalThis);
