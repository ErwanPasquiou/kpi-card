/* Composant autonome : aucune dépendance JavaScript ni requête externe. */
(() => {
  "use strict";
  const L = window.HomeLayout;
  const D = window.Dashboards;
  const K = window.KPIData;
  const T = window.KPITargets;
  const B = window.ContentBlocks;
  const F = window.KPIFilters;
  const I = window.InteractiveBlocks;
  const C = window.ChartStyles;
  const R = window.ReportAnalysis;
  let reportSource = "sales";
  const dataModel = K.createModel();
  const $ = (id) => document.getElementById(id);
  const root = $("editor"), canvas = $("canvas");
  const definitions = {
    text: {label: "Texte", hint: "Titre 1, titre 2 ou paragraphe", span: 3, content: "Écrivez votre texte ici."},
    chart: {label: "Graphique", hint: "Un KPI dans le temps", span: 3, content: "Chiffre d’affaires HT"},
    card: {label: "Carte", hint: "Un KPI en un chiffre", span: 2, content: "Chiffre d’affaires HT"},
    separator: {label: "Séparateur", hint: "Une respiration entre sections", span: 6, content: ""},
    table: {label: "Tableau", hint: "Données brutes, tri et filtres", span: 6, content: "Données sources"},
    manualTable: {label: "Tableau manuel", hidden: true},
    callout: {label: "Encadré", hint: "Information, vigilance, décision", span: 3, content: "Présentez ici le message à retenir."},
  };
  const paths = {
    edit: '<path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-5-5L3 14l-1 6z"/>',
    text: '<path d="M4 5h16M4 10h16M4 15h11M4 20h8"/>',
    title: '<path d="M4 5h16M12 5v15M8 20h8"/>',
    chart: '<path d="M4 3v17h17M8 16v-5M13 16V7M18 16V4"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9h4M7 14h10"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11M15 9v11"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    grip: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
    move: '<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
    separator: '<path d="M3 12h18M7 5h10M7 19h10"/>',
    callout: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 11v6M12 7h.01"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 12h18"/>',
    back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
    arrow: '<path d="m14 5 7 7-7 7M3 12h18"/>',
  };
  let initialized = false, editing = false, selectedId = null, pending = null, dragging = null;
  let catalogueMode = false;
  let blocks = [], saved = {version: 1, blocks: []}, storageKey = "", rows = 3, lastHeight = 0;
  let collection = {version: 2, dashboards: []}, view = "hub", draftBoard = null, isNew = false, lastDeleted = null;
  let favoritesOnly = false, detail = null, detailReturnFocus = null, dataPage = 0;
  const inspectorSections = new Map();
  const PAGE_SIZE = 50;
  const clone = (data) => JSON.parse(JSON.stringify(data));

  function el(tag, className = "", text = null) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const holder = el("span");
    holder.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
    return holder.firstElementChild;
  }

  function button(text, className, action, symbol) {
    const node = el("button", className);
    node.type = "button";
    if (symbol) node.append(icon(symbol));
    if (text) node.append(document.createTextNode(text));
    node.addEventListener("click", action);
    return node;
  }

  function notify(text, error = false) {
    $("status").textContent = text;
    $("status").classList.toggle("error", error);
  }

  function send(type, data = {}) {
    window.parent.postMessage({isStreamlitMessage: true, type, ...data}, "*");
  }

  function resizeFrame() {
    const surface = catalogueMode ? $("catalogue") : root;
    const height = Math.max(440, Math.ceil(surface.getBoundingClientRect().height) + 2);
    if (height !== lastHeight) {
      lastHeight = height;
      send("streamlit:setFrameHeight", {height});
    }
  }

  function blockById(id) { return blocks.find((block) => block.id === id); }
  function lastRow() { return Math.max(-1, ...blocks.map((block) => block.row)); }
  function activePayload() { return dragging || pending; }
  function metricPeriod(block, board = draftBoard) { return K.validPeriod(block.period) ? block.period : board?.period || "rolling12"; }
  function metricResult(block, board = draftBoard, previous = false) {
    return dataModel.evaluate(block.kpiId, metricPeriod(block, board), block.filters || [], R.filtersFor(board, block), previous);
  }
  function updateReport(patch) {
    if (!editing || !draftBoard) return;
    Object.assign(draftBoard, patch);
    renderCanvas(); renderInspector(); renderReportControls();
  }
  function renderReportControls() {
    const host = $("report-controls"), opened = host.querySelector("details")?.open || false;
    host.hidden = view === "hub";
    host.replaceChildren();
    if (host.hidden) return;
    if (!editing) {
      host.append(el("p", "field-label", draftBoard.comparison === "none"
        ? "Comparaison : désactivée" : "Comparaison : période précédente"));
      const filters = Object.entries(draftBoard.globalFilters || {}).map(([id, conditions]) =>
        K.tableDefinition(id).label + " : " + F.describe(conditions, K.tableDefinition(id)));
      host.append(el("p", "filter-summary", filters.length
        ? "Filtres globaux : " + filters.join(" · ") : "Aucun filtre global"));
      host.append(el("p", "hint", "Passez en mode modification pour changer ces réglages."));
      return;
    }
    const label = el("label", "field-label", "Comparer les indicateurs");
    label.htmlFor = "report-comparison";
    const select = el("select", "field"); select.id = "report-comparison";
    for (const [value,text] of [["previous","À la période précédente"],["none","Sans comparaison"]]) {
      const option=el("option","",text); option.value=value; select.append(option);
    }
    select.value=draftBoard.comparison;
    select.addEventListener("change",()=>updateReport({comparison:select.value}));
    const details=el("details","report-global-filters"); details.open=opened;
    const count=Object.values(draftBoard.globalFilters || {}).reduce((n,filters)=>n+filters.length,0);
    details.append(el("summary","","Filtres globaux du rapport · "+count+" condition(s)"));
    const content=el("div","sidebar-section-body");
    const sourceLabel=el("label","field-label","Source à filtrer"); sourceLabel.htmlFor="report-source";
    const source=el("select","field"); source.id="report-source";
    for(const table of K.TABLES) { const option=el("option","",table.label); option.value=table.id; source.append(option); }
    source.value=reportSource;
    source.addEventListener("change",()=>{reportSource=source.value; renderReportControls();});
    content.append(sourceLabel,source);
    const affected=blocks.filter(block=>R.sourceId(block)===reportSource);
    const dataBlocks=blocks.filter(block=>R.sourceId(block));
    content.append(el("p","hint",affected.length+" bloc(s) concerné(s) sur "+dataBlocks.length+" blocs de données : "+
      (affected.map(block=>block.content || definitions[block.type].label).join(", ") || "aucun")+
      ". Les blocs des autres sources ne sont pas filtrés par ces conditions."));
    const data=dataModel.source(reportSource,draftBoard.period);
    I.filterEditor(content,data.table,draftBoard.globalFilters?.[reportSource] || [],(filters)=>{
      const globalFilters=R.normalizeFilters({...draftBoard.globalFilters,[reportSource]:filters});
      updateReport({globalFilters});
    },null,data.rows);
    content.append(el("p","hint","Les filtres globaux s’ajoutent aux filtres de chaque bloc avec ET, pour les deux périodes comparées. Les choix affichés suivent la période du rapport."));
    if(count) content.append(button("Effacer tous les filtres du rapport","button small",()=>updateReport({globalFilters:{}})));
    details.append(content); host.append(label,select,details);
    if(count) {
      const active=el("p","filter-summary");
      active.textContent=Object.entries(draftBoard.globalFilters).map(([id,filters])=>K.tableDefinition(id).label+" : "+F.describe(filters,K.tableDefinition(id))).join(" · ");
      host.append(active);
    }
  }

  function updateInteractiveBlock(block, patch) {
    const candidate = blocks.map((item) => item.id === block.id ? {...item, ...patch} : item);
    const layout = L.normalize({version: 1, blocks: candidate});
    if (!layout) { notify("Les réglages de ce bloc ne sont pas valides.", true); return false; }
    Object.assign(block, patch);
    if (editing) { renderInspector(); return true; }
    draftBoard = D.normalizeBoard({...draftBoard, layout, updatedAt: Date.now()});
    collection = D.upsert(collection, draftBoard);
    saved = clone(layout);
    return persistCollection("Bloc enregistré dans ce navigateur.") ? true : "session";
  }

  function fillPeriods(select, value, inherit = false) {
    select.replaceChildren();
    const options = inherit ? [{id: "inherit", label: "Période du tableau"}, ...K.PERIODS] : K.PERIODS;
    for (const item of options) {
      const option = el("option", "", item.label);
      option.value = item.id;
      select.append(option);
    }
    select.value = value;
  }

  function favoriteButton(board, compact = false) {
    const node = button(compact ? "" : board.favorite ? "Favori" : "Ajouter aux favoris",
      `button ${compact ? "small icon-button " : ""}favorite-button${board.favorite ? " is-favorite" : ""}`, () => toggleFavorite(board.id), "star");
    node.dataset.favoriteId = board.id;
    node.setAttribute("aria-pressed", String(board.favorite));
    node.title = `${board.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} : ${board.name}`;
    node.setAttribute("aria-label", node.title);
    return node;
  }

  function toggleFavorite(id) {
    const board = collection.dashboards.find((item) => item.id === id);
    if (!board) return;
    const favorite = !board.favorite;
    collection = D.upsert(collection, {...board, favorite});
    if (draftBoard?.id === id) draftBoard.favorite = favorite;
    if (view === "hub") renderHub(); else render();
    const next = [...root.querySelectorAll("[data-favorite-id]")].find((node) => node.dataset.favoriteId === id);
    (next || $("hub-filters").querySelector("button"))?.focus({preventScroll: true});
    persistCollection(favorite ? `« ${board.name} » ajouté aux favoris.` : `« ${board.name} » retiré des favoris.`);
  }

  function setBoardPeriod(value) {
    if (!draftBoard || !K.validPeriod(value)) return;
    draftBoard.period = value;
    $("view-period").value = $("dashboard-period").value = value;
    $("board-period-summary").textContent = K.rangeLabel(K.bounds(value, dataModel.referenceDate));
    renderReportControls();
    renderCanvas();
    renderInspector();
    if (!editing) {
      collection = D.upsert(collection, draftBoard);
      persistCollection("Période du tableau enregistrée.");
    }
  }

  function persistCollection(message = "") {
    let persistent = true;
    try { localStorage.setItem(storageKey, JSON.stringify(collection)); }
    catch (_) { persistent = false; }
    send("streamlit:setComponentValue", {value: collection, dataType: "json"});
    if (!persistent) notify("Modifications conservées pour cette session. Le navigateur bloque l’enregistrement local.", true);
    else if (message) notify(message);
    return persistent;
  }

  function showHub() {
    view = "hub";
    editing = isNew = false;
    draftBoard = null;
    selectedId = pending = dragging = null;
    render();
    notify("");
  }

  function openDashboard(id, edit = false) {
    const board = collection.dashboards.find((item) => item.id === id);
    if (!board) return;
    draftBoard = clone(board);
    saved = clone(board.layout);
    blocks = clone(saved.blocks);
    view = "dashboard";
    editing = isNew = false;
    selectedId = pending = dragging = null;
    $("create-panel").hidden = true;
    if (edit) startEditing(); else { render(); notify(""); }
  }

  function showCreatePanel() {
    $("create-panel").hidden = false;
    $("create-form").reset();
    $("new-name").focus();
  }

  function createDashboard(event) {
    event.preventDefault();
    const name = $("new-name").value.trim();
    if (!name) { $("new-name").focus(); return notify("Donnez un nom à votre tableau de bord.", true); }
    if (collection.dashboards.length >= 200) return notify("La collection peut contenir jusqu’à 200 tableaux.", true);
    const template = D.examples().dashboards.find((item) => item.id === $("new-template").value);
    draftBoard = D.normalizeBoard({
      id: crypto.randomUUID(), name, description: $("new-description").value,
      category: "Personnel", theme: template?.theme || "blue", example: false,
      period: template?.period || "rolling12", favorite: false,
      updatedAt: Date.now(), layout: template ? clone(template.layout) : {version: 1, blocks: []},
    });
    saved = clone(draftBoard.layout);
    blocks = clone(saved.blocks);
    isNew = true;
    view = "dashboard";
    selectedId = pending = dragging = null;
    $("create-panel").hidden = true;
    startEditing();
    notify("Composez votre tableau, puis cliquez sur Enregistrer pour l’ajouter à l’accueil.");
  }

  function deleteDashboard(id) {
    const board = collection.dashboards.find((item) => item.id === id);
    if (!board) return;
    lastDeleted = clone(board);
    collection = D.remove(collection, id);
    renderHub();
    persistCollection(`« ${board.name} » supprimé. Vous pouvez annuler la suppression.`);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    try { collection = D.upsert(collection, lastDeleted); }
    catch (error) { return notify(error.message, true); }
    lastDeleted = null;
    renderHub();
    persistCollection("Tableau de bord restauré.");
  }

  function previewDashboard(board) {
    const preview = button("", "dashboard-preview", () => openDashboard(board.id));
    preview.setAttribute("aria-label", `Ouvrir ${board.name}`);
    const surface = el("span", "preview-surface");
    surface.setAttribute("aria-hidden", "true");
    const firstRow = board.layout.blocks.length ? Math.min(...board.layout.blocks.map((item) => item.row)) : 0;
    const visibleBlocks = board.layout.blocks.filter((block) => block.row < firstRow + 3);
    for (const block of visibleBlocks) {
      const mini = el("span", `preview-block preview-${block.type}`);
      mini.style.gridRow = String(block.row - firstRow + 1);
      mini.style.gridColumn = `${block.col + 1} / span ${block.span}`;
      if (block.type === "text" && block.textStyle !== "paragraph") mini.append(el("span", "preview-title", block.content));
      if (block.type === "text" && block.textStyle === "paragraph") {
        mini.append(el("span", "preview-text", block.content.split("\n")[0]));
        mini.append(el("span", "preview-line"), el("span", "preview-line short"));
      }
      if (block.type === "separator") mini.append(el("span", "preview-divider"));
      if (["table", "manualTable"].includes(block.type)) mini.append(icon("table"), el("span", "preview-text", block.content || "Tableau"));
      if (block.type === "callout") mini.append(el("span", "preview-callout", block.heading || block.content));
      if (block.type === "chart") {
        const chart = el("span", "preview-bars");
        const values = metricResult(block, board).series.map((point) => point.value || 0);
        const max = Math.max(1, ...values);
        for (const value of values) {
          const bar = el("span");
          bar.style.height = `${Math.max(3, value / max * 100)}%`;
          chart.append(bar);
        }
        mini.append(chart);
      }
      if (block.type === "card") {
        const result = metricResult(block, board);
        mini.append(el("span", "preview-metric", K.formatValue(result.value, result.kpi, true)),
          el("span", "preview-metric-label", block.content || result.kpi.label));
      }
      surface.append(mini);
    }
    if (!visibleBlocks.length) { surface.classList.add("preview-empty"); surface.append(icon("grid")); }
    preview.append(surface);
    return preview;
  }

  function renderHub() {
    $("dashboard-count").textContent = String(collection.dashboards.length);
    const filters = $("hub-filters");
    filters.replaceChildren();
    const favoriteCount = collection.dashboards.filter((board) => board.favorite).length;
    for (const [favorite, label] of [[false, `Tous les tableaux (${collection.dashboards.length})`], [true, `Favoris (${favoriteCount})`]]) {
      const filter = button(label, `filter-button${favorite === favoritesOnly ? " active" : ""}`, () => {
        favoritesOnly = favorite;
        renderHub();
        $("hub-filters").querySelector(`[data-filter="${favorite}"]`).focus();
      }, favorite ? "star" : "grid");
      filter.dataset.filter = String(favorite);
      filter.setAttribute("aria-pressed", String(favorite === favoritesOnly));
      filters.append(filter);
    }
    const undo = $("undo-delete");
    undo.hidden = !lastDeleted;
    undo.replaceChildren();
    if (lastDeleted) undo.append(el("span", "", `« ${lastDeleted.name} » a été supprimé.`), button("Annuler la suppression", "button small", undoDelete));
    const query = $("dashboard-search").value.trim().toLocaleLowerCase("fr");
    const matches = collection.dashboards.filter((board) =>
      (!favoritesOnly || board.favorite) && `${board.name} ${board.description} ${board.category}`.toLocaleLowerCase("fr").includes(query))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite));
    const grid = $("dashboard-grid");
    grid.replaceChildren();
    for (const board of matches) {
      const card = el("article", "dashboard-card");
      card.dataset.id = board.id;
      card.dataset.theme = board.theme;
      const top = el("div", "dashboard-card-top");
      const badges = el("div", "dashboard-badges");
      badges.append(el("span", "example-tag", board.example ? "EXEMPLE" : "PERSONNEL"), favoriteButton(board, true));
      top.append(el("span", "category-tag", board.category), badges);
      const body = el("div", "dashboard-card-body");
      body.append(el("h3", "", board.name), el("p", "", board.description || "Un tableau de bord à votre image."));
      const meta = el("div", "dashboard-card-meta");
      const charts = board.layout.blocks.filter((block) => block.type === "chart").length;
      meta.append(el("span", "", `${board.layout.blocks.length} blocs · ${charts} graphique${charts > 1 ? "s" : ""}`));
      const date = board.updatedAt ? new Date(board.updatedAt).toLocaleDateString("fr-FR", {day: "numeric", month: "short"}) : "";
      meta.append(el("span", "", date ? `Modifié le ${date}` : ""));
      const actions = el("div", "dashboard-card-actions");
      const open = button("Ouvrir", "button small primary", () => openDashboard(board.id), "arrow");
      const edit = button("Modifier", "button small", () => openDashboard(board.id, true), "edit");
      edit.setAttribute("aria-label", `Modifier ${board.name}`);
      const remove = button("", "button small danger icon-button", () => deleteDashboard(board.id), "trash");
      remove.title = `Supprimer ${board.name}`;
      remove.setAttribute("aria-label", remove.title);
      actions.append(open, edit, remove);
      card.append(top, previewDashboard(board), body, meta, actions);
      grid.append(card);
    }
    if (!matches.length) {
      const empty = el("div", "empty-state hub-empty");
      empty.append(el("h2", "", query ? "Aucun tableau ne correspond à cette recherche." : favoritesOnly ? "Vos favoris vous attendent ici." : "Votre collection commence ici."),
        el("p", "", query ? "Essayez un autre nom ou une autre catégorie." : favoritesOnly ? "Cliquez sur l’étoile d’un tableau pour le retrouver rapidement." : "Créez un tableau vierge ou partez de l’un des quatre modèles."));
      if (!query && !favoritesOnly) empty.append(button("Créer un tableau de bord", "button primary", showCreatePanel, "plus"));
      grid.append(empty);
    }
  }

  function startEditing() {
    editing = true;
    selectedId = null;
    for (const id of ["board-section", "palette-section", "settings-section"]) $(id).open = false;
    inspectorSections.clear();
    rows = Math.min(L.MAX_ROWS, Math.max(3, lastRow() + 2));
    render();
    notify("Choisissez un bloc dans le panneau, puis déposez-le sur une case libre.");
    $("palette-section").querySelector("summary").focus({preventScroll: true});
  }

  function save() {
    if (!draftBoard.name.trim()) {
      focusInspector("dashboard-name");
      return notify("Le tableau de bord doit avoir un nom.", true);
    }
    const invalidTarget = blocks.find((block) => ["chart", "card"].includes(block.type) && T.validationError(block.target, block.kpiId));
    if (invalidTarget) {
      selectBlock(invalidTarget.id);
      const issue = T.validationIssue(invalidTarget.target, invalidTarget.kpiId);
      focusInspector(issue.month === null ? "block-target-value" : `block-target-month-${issue.month}`);
      return notify(issue.message, true);
    }
    const layout = L.normalize({version: 1, blocks});
    if (!layout) return notify("La disposition contient un emplacement invalide.", true);
    draftBoard = D.normalizeBoard({...draftBoard, layout, updatedAt: Date.now()});
    try { collection = D.upsert(collection, draftBoard); }
    catch (error) { return notify(error.message, true); }
    saved = clone(layout);
    blocks = clone(layout.blocks);
    editing = isNew = false;
    selectedId = pending = dragging = null;
    render();
    persistCollection(`« ${draftBoard.name} » enregistré dans ce navigateur.`);
  }

  function cancel() {
    if (isNew) { showHub(); return notify("Création annulée."); }
    blocks = clone(saved.blocks);
    draftBoard = clone(collection.dashboards.find((board) => board.id === draftBoard.id));
    editing = false;
    selectedId = pending = dragging = null;
    render();
    notify("Modifications annulées.");
  }

  function render() {
    const hub = view === "hub";
    $("hub").hidden = !hub;
    $("workspace").hidden = hub;
    $("board-filters").hidden = hub || editing;
    $("breadcrumb").hidden = hub;
    $("breadcrumb").replaceChildren();
    if (!hub) {
      const back = button("Tous les tableaux", "breadcrumb-button", showHub, "back");
      back.disabled = editing;
      back.title = editing ? "Enregistrez ou annulez les modifications pour revenir à l’accueil" : "Retour à l’accueil";
      $("breadcrumb").append(back, el("span", "", "/"), el("span", "", draftBoard.name || "Nouveau tableau"));
    }
    $("page-title").textContent = hub ? "Vos tableaux de bord." : draftBoard.name || "Nouveau tableau";
    $("eyebrow-label").textContent = hub ? "VOTRE ESPACE KPI-CARD" : editing ? "COMPOSEZ VOTRE TABLEAU" : draftBoard.category.toLocaleUpperCase("fr");
    root.classList.toggle("editing", editing);
    $("sidebar").hidden = !editing;
    renderReportControls();
    $("canvas-heading").hidden = !editing;
    $("column-guides").hidden = !editing;
    $("add-row").hidden = !editing;
    $("add-row").disabled = rows >= L.MAX_ROWS;
    $("mode-description").textContent = hub ? "Tous vos indicateurs, un espace pour les retrouver." : editing ?
      "Glissez, ajustez, composez. Enregistrez quand tout est à sa place." :
      draftBoard.description || "Un tableau composé avec vos blocs, selon vos besoins.";
    const actions = $("toolbar-actions");
    actions.replaceChildren();
    if (hub) {
      const create = button("Nouveau tableau de bord", "button primary", showCreatePanel, "plus");
      create.id = "create-dashboard";
      actions.append(button("Données de démo", "button", openSources, "table"), create);
      renderHub();
      return;
    }
    $("dashboard-name").value = draftBoard.name;
    $("dashboard-description").value = draftBoard.description;
    fillPeriods($("dashboard-period"), draftBoard.period);
    fillPeriods($("view-period"), draftBoard.period);
    $("board-period-summary").textContent = K.rangeLabel(K.bounds(draftBoard.period, dataModel.referenceDate));
    if (editing) actions.append(button("Annuler", "button", cancel), button("Enregistrer", "button primary", save, "check"));
    else actions.append(favoriteButton(draftBoard), button("Modifier", "button primary", startEditing, "edit"));
    renderCanvas();
    renderPalette();
    renderInspector();
  }

  function gridPosition(node, row, col, span = 1) {
    node.style.gridRow = String(row + 1);
    node.style.gridColumn = `${col + 1} / span ${span}`;
    node.dataset.row = row;
    node.dataset.col = col;
  }

  function renderCanvas() {
    canvas.replaceChildren();
    // Seules les lignes exclusivement séparatrices deviennent compactes.
    // Conserver la hauteur des lignes vides et des compositions existantes.
    canvas.style.gridTemplateRows = editing ? "" : Array.from({length: lastRow() + 1}, (_, row) => {
      const items = blocks.filter((block) => block.row === row);
      return items.length && items.every((block) => block.type === "separator") ? "minmax(0, auto)" : "minmax(90px, auto)";
    }).join(" ");
    if (!editing && !blocks.length) {
      const empty = el("div", "empty-state");
      const symbol = el("div", "empty-symbol");
      symbol.append(icon("grid"));
      empty.append(symbol, el("h2", "", "Une page à composer"), el("p", "", "Cliquez sur Modifier pour ajouter votre premier bloc à la grille de 6 colonnes."));
      canvas.append(empty);
      return;
    }
    if (editing) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < L.COLS; col++) {
          if (!L.availableSpan(blocks, row, col)) continue;
          const cell = button("", "drop-cell", () => place(activePayload(), row, col), "plus");
          gridPosition(cell, row, col);
          cell.setAttribute("aria-label", `Déposer un bloc, ligne ${row + 1}, colonne ${col + 1}`);
          canvas.append(cell);
        }
      }
    }
    for (const block of [...blocks].sort((a, b) => a.row - b.row || a.col - b.col)) {
      const card = el("article", "block");
      card.dataset.id = block.id;
      card.dataset.type = block.type;
      gridPosition(card, block.row, block.col, block.span);
      card.classList.toggle("selected", editing && block.id === selectedId);
      card.classList.toggle("moving", activePayload()?.id === block.id);
      card.setAttribute("aria-label", `${definitions[block.type].label}, ligne ${block.row + 1}, colonne ${block.col + 1}, largeur ${block.span}`);
      if (editing) {
        card.tabIndex = 0;
        card.addEventListener("click", () => selectBlock(block.id));
        card.addEventListener("keydown", (event) => {
          if (event.target !== card || !["Enter", " "].includes(event.key)) return;
          event.preventDefault();
          selectBlock(block.id);
          focusInspector("block-content");
        });
        const tools = el("div", "block-toolbar");
        const label = el("div", "block-toolbar-label");
        const handle = button("", "drag-handle", (event) => {
          event.stopPropagation();
          arm({id: block.id});
        }, "grip");
        handle.title = "Glisser pour déplacer, ou cliquer puis choisir une case";
        handle.setAttribute("aria-label", `Déplacer le bloc ${definitions[block.type].label}`);
        handle.draggable = true;
        attachDrag(handle, {id: block.id});
        label.append(handle, document.createTextNode(definitions[block.type].label));
        tools.append(label, el("span", "span-badge", `${block.span}/6`));
        card.append(tools);
      }
      if (!editing && ["chart", "card"].includes(block.type)) {
        card.classList.add("data-block");
        card.addEventListener("click", (event) => {
          if (!event.target.closest("button, [role=button]")) openBlockData(block, card.querySelector(".block-data-button"));
        });
      }
      card.append(renderBody(block));
      if (editing && ["chart", "card"].includes(block.type)) {
        const inspect = button("Voir les données", "block-data-button", (event) => {
          event.stopPropagation();
          openBlockData(block, inspect);
        }, "table");
        card.append(inspect);
      }
      canvas.append(card);
    }
  }

  function renderBody(block) {
    const body = el("div", "block-body");
    if (block.type === "table") I.table(block, body, dataModel, metricPeriod(block), (patch) => updateInteractiveBlock(block, patch), R.filtersFor(draftBoard, block));
    else if (block.type === "callout" && !editing) I.note(block, body, (patch) => updateInteractiveBlock(block, patch));
    else B.render(block, body, el);
    if (["chart", "card"].includes(block.type)) {
      const result = metricResult(block);
      const target = T.evaluate(block.target, result);
      body.append(el("h3", "chart-heading", block.content || result.kpi.label),
        el("p", "demo-label", `${result.table.label} · Données fictives`),
        el("p", block.type === "card" ? "metric-value" : "metric-total", K.formatValue(result.value, result.kpi)));
      if (block.content && block.content !== result.kpi.label) body.append(el("p", "metric-definition", result.kpi.label));
      body.append(el("p", "metric-period", `${result.range.label} · ${result.rows.length.toLocaleString("fr-FR")} lignes`),
        el("p", "metric-range", K.rangeLabel(result.range)));
      if (result.filters.length) body.append(el("p", "filter-summary", F.describe(result.filters, result.table)));
      if (R.filtersFor(draftBoard, block).length) body.append(el("p", "filter-summary", "Filtres globaux appliqués · " + result.table.label));
      if (draftBoard.comparison !== "none") body.append(renderComparison(block, result));
      if (target) body.append(renderTargetSummary(target, result.kpi, block.type === "chart"));
      if (block.type === "chart" && (result.rows.length || target)) {
        body.append(C.categorical(block.chartKind) ? window.CategoryCharts.render(block, result, (group,trigger)=>openCategoryData(block,result,group,trigger)) : renderChart(block, result, target));
        if (target && C.categorical(block.chartKind)) body.append(el("p", "hint", "Objectif global du bloc, non réparti entre les catégories."));
        if (target && !C.categorical(block.chartKind)) {
          const legend = el("div", "chart-legend");
          legend.append(el("span", "legend-actual", "Réalisé"),
            el("span", "legend-target", `Objectif par ${result.granularity}${target.mode === "prorata" ? " · proratisé" : target.target.mode === "monthly" ? " · personnalisé" : " · fixe"}`));
          body.append(legend);
        }
      }
      if (!result.rows.length) body.append(el("p", "hint", "Aucune donnée sur cette période."));
      if (!editing) body.append(button("Voir toutes les données", "block-data-button", (event) => { event.stopPropagation(); openBlockData(block,event.currentTarget); }, "table"));
    }
    return body;
  }

  function renderComparison(block, current) {
    const previous = metricResult(block, draftBoard, true), change = R.comparison(current, previous);
    const box=el("div","period-comparison");
    box.append(el("p","","Période précédente : "+K.formatValue(previous.value,current.kpi)));
    if(change.delta===null) box.append(el("p","hint","Comparaison indisponible : aucune observation ou valeur non calculable."));
    else {
      const percent=change.percent===null?"variation relative non définie (base nulle)":
        (change.percent>0?"+":"")+change.percent.toLocaleString("fr-FR",{maximumFractionDigits:1})+" %";
      box.append(el("strong","",T.formatDelta(change.delta,current.kpi)+" · "+percent));
    }
    box.append(el("p","hint",K.rangeLabel(previous.range)+" · même nombre de jours, juste avant la période du bloc."));
    const inspect=button("Voir la période précédente","comparison-link",(event)=>{
      event.stopPropagation();
      detail={data:previous,title:(block.content || current.kpi.label)+" · Période précédente",source:false};
      showDataPanel(event.currentTarget);
    });
    inspect.addEventListener("keydown",event=>event.stopPropagation());
    box.append(inspect); return box;
  }

  function renderTargetSummary(comparison, kpi, compact = false) {
    const state = comparison.met === null ? "unknown" : comparison.met ? "met" : "missed";
    const summary = el("div", `target-summary target-${state}${compact ? " target-compact" : ""}`);
    const heading = el("div", "target-summary-heading");
    heading.append(el("span", "", comparison.target.direction === "at_most" ? "Plafond sur la période" : "Objectif sur la période"),
      el("strong", "", T.formatValue(comparison.value, kpi)));
    const variation = el("div", "target-variation");
    variation.append(el("span", "target-delta", T.formatDelta(comparison.delta, kpi)));
    if (comparison.relative !== null) variation.append(el("span", "target-relative", `(${T.formatRelative(comparison.relative)})`));
    variation.append(el("span", "target-variation-label", "d’écart à l’objectif"));
    summary.append(heading, variation, el("p", "target-status", T.statusLabel(comparison)));
    if (!compact && comparison.ratio !== null) {
      const track = el("div", "target-progress"), fill = el("span");
      track.setAttribute("aria-hidden", "true");
      fill.style.width = `${Math.max(0, Math.min(100, comparison.ratio))}%`;
      track.append(fill);
      const ratio = comparison.ratio.toLocaleString("fr-FR", {maximumFractionDigits: 1});
      summary.append(track, el("p", "target-ratio", `${ratio} % ${comparison.target.direction === "at_most" ? "du plafond" : "de l’objectif"}`));
    }
    if (comparison.value === 0 && comparison.delta !== null) summary.append(el("p", "target-note", "Écart relatif non calculable : objectif nul."));
    if (comparison.delta === null) summary.append(el("p", "target-note", "Aucune valeur disponible pour comparer à l’objectif."));
    summary.append(el("p", "target-basis", T.description(comparison, kpi)));
    return summary;
  }

  function svgNode(tag, attributes = {}, text = null) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== null) node.textContent = text;
    return node;
  }

  function renderChart(block, result, target = null) {
    const series = result.series;
    const maximum = result.kpi.format === "percent" ? 100 : result.kpi.format === "rating" ? 5 :
      Math.max(1, ...series.map((point) => point.value || 0), ...(target?.series || [])) * 1.12;
    const svg = svgNode("svg", {class: "chart kpi-chart", viewBox: "0 0 640 220", role: "img",
      "aria-label": `${result.kpi.label}, par ${result.granularity}. ${K.rangeLabel(result.range)}.`});
    svg.append(svgNode("title", {}, series.map((point, index) => `${point.label} : ${K.formatValue(point.value, result.kpi)}${target ? `, objectif ${T.formatValue(target.series[index], result.kpi)}` : ""}`).join(" ; ")));
    const xAt = (index) => series.length === 1 ? 350 : 96 + index * 510 / (series.length - 1);
    const yAt = (value) => 176 - value / maximum * 148;
    for (const fraction of [0, 0.5, 1]) {
      const value = maximum * fraction, y = yAt(value);
      svg.append(svgNode("path", {d: `M77 ${y}H628`, fill: "none", stroke: "#edf1f4"}),
        svgNode("text", {x: 68, y: y + 4, "text-anchor": "end"}, T.formatValue(value, result.kpi, true)));
    }
    if (["line", "area", "step"].includes(block.chartKind)) {
      for (const path of C.paths(series, block.chartKind, xAt, yAt, yAt(0))) {
        if (block.chartKind === "area") svg.append(svgNode("path", {d: path.area, fill: "#72bad7", "fill-opacity": 0.3, stroke: "none"}));
        svg.append(svgNode("path", {d: path.stroke, fill: "none", stroke: "#247db0", "stroke-width": 3, "stroke-linejoin": "round"}));
      }
    }
    const stride = Math.max(1, Math.ceil(series.length / 6));
    series.forEach((point, index) => {
      const x = xAt(index);
      if (point.value !== null) {
        const y = yAt(point.value), width = Math.min(34, 360 / series.length);
        const mark = block.chartKind !== "bar" ? svgNode("circle", {cx: x, cy: y, r: block.chartKind === "dots" ? 5 : 3.5, fill: "#247db0"}) :
          svgNode("rect", {x: x - width / 2, y, width, height: Math.max(0, 176 - y), rx: 3, fill: index === series.length - 1 ? "#243977" : "#72bad7"});
        mark.append(svgNode("title", {}, `${point.label} : ${K.formatValue(point.value, result.kpi)} · ${point.count} lignes`));
        svg.append(mark);
      }
      if (index % stride === 0 || index === series.length - 1 && index % stride > stride / 2) {
        svg.append(svgNode("text", {x, y: 201, "text-anchor": "middle"}, point.label));
      }
    });
    if (target) {
      const path = series.length === 1 ? `M77 ${yAt(target.series[0])}H628` :
        target.series.map((value, index) => `${index ? "L" : "M"}${xAt(index)} ${yAt(value)}`).join(" ");
      svg.append(svgNode("path", {d: path, fill: "none", stroke: "#c37b17", "stroke-width": 2.5, "stroke-dasharray": "8 5", "stroke-linejoin": "round"}));
      target.series.forEach((value, index) => {
        const mark = svgNode("circle", {cx: xAt(index), cy: yAt(value), r: 3, fill: "#fff", stroke: "#c37b17", "stroke-width": 1.5});
        mark.append(svgNode("title", {}, `${series[index].label} · Objectif : ${T.formatValue(value, result.kpi)} · ${K.rangeLabel(series[index])}`));
        svg.append(mark);
      });
    }
    return svg;
  }

  function renderPalette() {
    const palette = $("palette");
    palette.replaceChildren();
    for (const [type, definition] of Object.entries(definitions)) {
      if (definition.hidden) continue;
      const item = button("", "palette-item", () => arm({type}));
      item.draggable = true;
      item.setAttribute("aria-label", `Ajouter un bloc ${definition.label}`);
      item.setAttribute("aria-pressed", String(pending?.type === type));
      item.classList.toggle("armed", pending?.type === type);
      const symbol = el("span", "palette-icon");
      symbol.append(icon(type));
      const text = el("span");
      text.append(el("strong", "", definition.label), el("small", "", definition.hint));
      const grip = el("span", "palette-grip");
      grip.append(icon("grip"));
      item.append(symbol, text, grip);
      attachDrag(item, {type});
      palette.append(item);
    }
    $("placement-hint").hidden = !pending;
    $("placement-hint").textContent = pending ? "Cliquez sur une case pour déposer le bloc. Échap pour annuler." : "";
  }

  function selectBlock(id) {
    selectedId = id;
    $("settings-section").open = true;
    pending = null;
    clearPreview();
    canvas.querySelectorAll(".block").forEach((node) => {
      node.classList.toggle("selected", node.dataset.id === id);
      node.classList.remove("moving");
    });
    renderPalette();
    renderInspector();
  }

  function arm(payload) {
    pending = payload;
    selectedId = payload.id || null;
    renderCanvas();
    renderPalette();
    renderInspector();
    notify("Cliquez sur une case libre pour déposer le bloc. Échap pour annuler.");
    canvas.querySelector(".drop-cell")?.focus({preventScroll: true});
  }

  function focusInspector(field) {
    const node = typeof field === "string" ? $(field) : field;
    if (!node) return;
    for (let section = node.closest("details"); section; section = section.parentElement?.closest("details")) section.open = true;
    node.focus({preventScroll: true});
    node.scrollIntoView({block: "nearest"});
  }

  function inspectorSection(inspector, key, title) {
    const stateKey = inspector.dataset.blockKey;
    if (!inspectorSections.has(stateKey)) inspectorSections.set(stateKey, {});
    const state = inspectorSections.get(stateKey);
    const section = el("details", "inspector-section");
    section.dataset.section = key;
    section.open = state[key] ?? false;
    section.append(el("summary", "", title));
    const content = el("div", "inspector-section-content");
    section.append(content);
    section.addEventListener("toggle", () => {
      if (section.isConnected) { state[key] = section.open; resizeFrame(); }
    });
    inspector.append(section);
    return content;
  }

  function renderInspector() {
    const inspector = $("inspector");
    const previous = inspectorSections.get(inspector.dataset.blockKey);
    if (previous) for (const section of inspector.querySelectorAll("details[data-section]")) previous[section.dataset.section] = section.open;
    inspector.replaceChildren();
    const block = blockById(selectedId);
    inspector.dataset.blockKey = block ? `${draftBoard.id}:${block.id}` : "";
    if (!block) {
      inspector.append(el("h3", "", "À vous de composer"), el("p", "hint", "Après le dépôt, sélectionnez un bloc pour modifier son contenu et sa largeur."));
      return;
    }
    inspector.append(el("h3", "", `Réglages · ${definitions[block.type].label}`));
    const metric = ["chart", "card"].includes(block.type);
    const content = inspectorSection(inspector, "content", "Contenu", !metric);
    const contentLabel = el("label", "field-label", block.type === "chart" ? "Nom du graphique" : block.type === "card" ? "Nom de la carte" :
      ["table", "manualTable"].includes(block.type) ? "Titre du tableau" : block.type === "separator" ? "Libellé (facultatif)" : "Contenu");
    contentLabel.htmlFor = "block-content";
    const multiline = ["text", "callout"].includes(block.type);
    const input = el(multiline ? "textarea" : "input", "field");
    input.id = "block-content";
    input.value = block.content;
    input.maxLength = 5000;
    if (!multiline) input.type = "text";
    input.addEventListener("input", () => {
      block.content = input.value;
      renderCanvas();
    });
    content.append(contentLabel, input);
    if (!metric) B.settings(block, content, {
      el, button, changed: renderCanvas, rebuild: renderInspector, focus: focusInspector,
    });
    if (block.type === "table") {
      const data = inspectorSection(inspector, "data", "Données et période", true);
      const label = el("label", "field-label", "Source du tableau"); label.htmlFor = "block-source";
      const source = el("select", "field"); source.id = "block-source";
      for (const table of K.TABLES) {
        const option = el("option", "", table.label); option.value = table.id; source.append(option);
      }
      source.value = block.sourceId;
      source.addEventListener("change", () => {
        block.sourceId = source.value; block.filters = []; block.sort = {column: "date", direction: "desc"};
        renderCanvas(); renderInspector(); focusInspector("block-source");
        notify("Source modifiée : les filtres et le tri ont été réinitialisés.");
      });
      const periodLabel = el("label", "field-label", "Période du bloc"); periodLabel.htmlFor = "block-period";
      const period = el("select", "field"); period.id = "block-period"; fillPeriods(period, block.period, true);
      period.addEventListener("change", () => { block.period = period.value; renderCanvas(); renderInspector(); focusInspector("block-period"); });
      const sizeLabel = el("label", "field-label", "Lignes par page"); sizeLabel.htmlFor = "block-page-size";
      const size = el("select", "field"); size.id = "block-page-size";
      for (const count of [10, 25, 50]) { const option = el("option", "", String(count)); option.value = String(count); size.append(option); }
      size.value = String(block.pageSize);
      size.addEventListener("change", () => { block.pageSize = Number(size.value); renderCanvas(); });
      data.append(label, source, periodLabel, period, sizeLabel, size);
    }
    if (metric) {
      const data = inspectorSection(inspector, "data", "Données et période", true);
      const label = el("label", "field-label", "KPI à afficher");
      label.htmlFor = "block-kpi";
      const select = el("select", "field");
      select.id = "block-kpi";
      for (const table of K.TABLES) {
        const group = el("optgroup");
        group.label = table.label;
        for (const kpi of K.KPIS.filter((item) => item.table === table.id)) {
          const option = el("option", "", kpi.label);
          option.value = kpi.id;
          group.append(option);
        }
        select.append(group);
      }
      select.value = K.definition(block.kpiId).id;
      select.addEventListener("change", () => {
        const previous = K.definition(block.kpiId);
        const hadTarget = T.hasValue({...block.target, mode: "monthly"}) || T.hasValue({...block.target, mode: "simple"});
        block.kpiId = select.value;
        if (previous.table !== K.definition(block.kpiId).table) {
          block.filters = [];
          block.groupBy = C.dimension(K.tableDefinition(K.definition(block.kpiId).table))?.key || "";
          notify("Source modifiée : les filtres de l’ancien indicateur ont été retirés.");
        }
        block.target = T.normalize({period: block.target?.period}, block.kpiId);
        if (block.chartKind === "donut" && !K.definition(block.kpiId).additive) block.chartKind = "horizontal";
        if (!block.content || block.content === previous.label) block.content = K.definition(block.kpiId).label;
        renderCanvas(); renderInspector();
        if (hadTarget) notify("Objectif réinitialisé : renseignez la cible du nouveau KPI.");
        focusInspector("block-kpi");
      });
      const periodLabel = el("label", "field-label", "Période du bloc");
      periodLabel.htmlFor = "block-period";
      const period = el("select", "field");
      period.id = "block-period";
      fillPeriods(period, block.period || "inherit", true);
      period.addEventListener("change", () => {
        block.period = period.value;
        renderCanvas(); renderInspector();
        focusInspector("block-period");
      });
      const result = metricResult(block);
      const info = el("div", "kpi-info");
      info.append(el("strong", "", `Source : ${result.table.label}`),
        el("p", "", result.kpi.formula), el("p", "", K.rangeLabel(result.range)));
      const inspect = button("Voir les données", "button small", () => openBlockData(block, inspect), "table");
      data.append(label, select, periodLabel, period, info, inspect);
      renderTargetSettings(inspectorSection(inspector, "target", "Objectif"), block, result);
    }
    if (metric || block.type === "table") {
      const sourceData = dataModel.source(metric ? K.definition(block.kpiId).table : block.sourceId, metricPeriod(block));
      const table = sourceData.table;
      I.filterEditor(inspectorSection(inspector, "filters", "Filtres", true), table, block.filters || [], (filters) => {
        block.filters = filters; renderCanvas(); renderInspector();
        notify(filters.length ? "Filtres appliqués au bloc. Enregistrez le tableau pour les conserver." : "Filtres retirés.");
      }, null, sourceData.rows);
    }
    if (block.type === "chart") {
      const presentation = inspectorSection(inspector, "presentation", "Présentation");
      const label = el("label", "field-label", "Présentation");
      label.htmlFor = "chart-kind";
      const select = el("select", "field");
      select.id = "chart-kind";
      for (const [value, text] of C.KINDS) {
        const option = el("option", "", text);
        option.value = value;
        if (value === "donut" && !K.definition(block.kpiId).additive) option.disabled = true;
        select.append(option);
      }
      select.value = block.chartKind;
      select.addEventListener("change", () => { block.chartKind = select.value; renderCanvas(); renderInspector(); focusInspector("chart-kind"); });
      presentation.append(label, select);
      if (!K.definition(block.kpiId).additive) presentation.append(el("p", "hint", "Anneau réservé aux montants et comptages. Pour ce KPI, utilisez les barres horizontales."));
      if (C.categorical(block.chartKind)) {
        const table = K.tableDefinition(K.definition(block.kpiId).table);
        const groupLabel = el("label", "field-label", "Répartir par"); groupLabel.htmlFor = "chart-group";
        const group = el("select", "field"); group.id = "chart-group";
        for (const column of C.dimensions(table)) {
          const option = el("option", "", column.label); option.value = column.key; group.append(option);
        }
        group.value = C.dimension(table, block.groupBy)?.key || ""; group.disabled = !group.options.length;
        group.addEventListener("change", () => { block.groupBy = group.value; renderCanvas(); });
        presentation.append(groupLabel, group, el("p", "hint", "Calcul sur les lignes filtrées. Jusqu’à 7 catégories principales et un groupe Autres ; le total reste celui du bloc."));
      }
    }
    const layout = inspectorSection(inspector, "layout", "Disposition");
    layout.append(el("div", "field-label", "Largeur du bloc · colonnes"));
    const widths = el("div", "width-controls");
    widths.setAttribute("role", "group");
    widths.setAttribute("aria-label", "Largeur en colonnes");
    const free = L.availableSpan(blocks, block.row, block.col, block.id);
    for (let span = 1; span <= L.COLS; span++) {
      const choice = button(String(span), "width-option", () => {
        if (span > L.availableSpan(blocks, block.row, block.col, block.id)) return;
        block.span = span;
        renderCanvas();
        renderInspector();
        notify(`Largeur : ${span} colonne${span > 1 ? "s" : ""}.`);
        focusInspector($("inspector").querySelector(`[data-span="${span}"]`));
      });
      choice.dataset.span = span;
      choice.disabled = span > free;
      choice.classList.toggle("active", span === block.span);
      choice.setAttribute("aria-pressed", String(span === block.span));
      choice.setAttribute("aria-label", `${span} colonne${span > 1 ? "s" : ""}`);
      choice.title = span > free ? "Pas assez de place à droite sur cette ligne" : `Occuper ${span} colonne(s)`;
      widths.append(choice);
    }
    layout.append(widths, el("p", "width-help", `Ligne ${block.row + 1} · Colonne ${block.col + 1}. Jusqu’à ${free} colonne(s) disponibles à cet emplacement.`));
    const actions = el("div", "block-actions");
    actions.append(button("Dupliquer", "button small", () => {
      const position = L.duplicatePlacement(blocks, block);
      if (!position) return notify("La grille est pleine : aucune place pour cette copie.", true);
      const copy = {...clone(block), id: crypto.randomUUID(), ...position};
      blocks.push(copy);
      rows = Math.min(L.MAX_ROWS, Math.max(rows, copy.row + 2));
      selectedId = copy.id;
      pending = dragging = null;
      renderCanvas(); renderPalette(); renderInspector();
      focusInspector("block-content");
      notify("Bloc dupliqué. Vous pouvez modifier sa copie indépendamment.");
    }, "copy"));
    actions.append(button("Déplacer", "button small", () => arm({id: block.id}), "move"),
      button("Supprimer", "button small danger", () => {
        blocks = blocks.filter((item) => item.id !== block.id);
        selectedId = pending = null;
        renderCanvas(); renderPalette(); renderInspector();
        notify("Bloc supprimé. Annuler permet de revenir à la version enregistrée.");
      }, "trash"));
    layout.append(actions);
  }

  function renderTargetSettings(inspector, block, result) {
    const target = block.target || T.normalize(null, result.kpi);
    block.target = target;
    const settings = el("div", "target-settings");
    const year = Number(dataModel.referenceDate.slice(0, 4));
    const additive = result.kpi.targetMode === "prorata";
    const units = {money: "€ HT", integer: "nombre", percent: "%", rating: "note / 5", hours: "heures"};
    const tabs = el("div", "target-tabs");
    tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Mode de calcul de l’objectif");
    const panels = {}, tabButtons = {}, modes = [["simple", "Simple"], ["monthly", "Avancé"]];
    modes.forEach(([mode, text], index) => {
      const tab = button(text, "target-tab", () => switchMode(mode));
      tab.id = `target-tab-${mode}`;
      tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", `target-panel-${mode}`);
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = 1 - index;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = modes.length - 1;
        if (next === undefined) return;
        event.preventDefault(); switchMode(modes[next][0]);
      });
      const panel = el("div", "target-panel"); panel.id = `target-panel-${mode}`;
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id);
      tabs.append(tab); tabButtons[mode] = tab; panels[mode] = panel;
    });
    const modeHelp = el("p", "width-help", "L’onglet sélectionné définit le mode de calcul actif. Vos saisies sont conservées quand vous changez de mode.");

    function decimalInput(id) {
      const field = el("input", "field");
      field.id = id; field.type = "text"; field.inputMode = "decimal"; field.maxLength = 32;
      field.autocomplete = "off";
      field.setAttribute("aria-describedby", "block-target-error block-target-preview");
      return field;
    }
    const label = el("label", "field-label", `Valeur de l’objectif (${units[result.kpi.format]})`);
    label.htmlFor = "block-target-value";
    const input = decimalInput("block-target-value");
    input.placeholder = "Sans objectif";
    const error = el("p", "target-error"); error.id = "block-target-error"; error.setAttribute("role", "alert");
    const periodLabel = el("label", "field-label", "Période de l’objectif");
    periodLabel.htmlFor = "block-target-period";
    const select = el("select", "field"); select.id = "block-target-period";
    for (const item of T.PERIODS) {
      const option = el("option", "", item.label); option.value = item.id; select.append(option);
    }
    select.value = target.period;
    panels.simple.append(label, input, periodLabel, select,
      el("p", "width-help", additive ? "La base est mensuelle par défaut. Un montant annuel est divisé par 12, semestriel par 6 et trimestriel par 3 pour obtenir la base mensuelle." : "La période indique l’horizon de votre cible. Ce KPI garde un seuil fixe, sans multiplication par le nombre de mois."));

    const monthlyHelp = el("p", "width-help", `Objectifs de janvier à décembre, reconduits chaque année. Renseignez les 12 mois${additive ? " (0 pour un mois sans objectif)" : ""}, ou laissez-les tous vides pour ne pas afficher d’objectif.`);
    monthlyHelp.id = "block-target-monthly-help";
    const monthlyUnit = el("p", "field-label", `Chaque mois en ${units[result.kpi.format]}`);
    const monthGrid = el("div", "target-month-grid"), monthInputs = [];
    T.MONTHS.forEach((month, index) => {
      const cell = el("div", "target-month-field");
      const monthLabel = el("label", "field-label", month);
      const field = decimalInput(`block-target-month-${index}`);
      field.placeholder = "À renseigner";
      field.setAttribute("aria-describedby", "block-target-monthly-help block-target-error block-target-preview");
      monthLabel.htmlFor = field.id;
      field.addEventListener("input", () => {
        target.monthlyValues[index] = field.value;
        update(); renderCanvas();
      });
      cell.append(monthLabel, field); monthGrid.append(cell); monthInputs.push(field);
    });
    const copySimple = button("Reprendre l’objectif simple", "button small", () => {
      target.monthlyValues = T.monthlyDefaults(target, result.kpi, year);
      syncInputs(); update(); renderCanvas();
      focusInspector(monthInputs[0]);
    });
    panels.monthly.append(monthlyHelp, monthlyUnit, monthGrid, copySimple);

    const directionLabel = el("label", "field-label", "Sens de l’objectif");
    directionLabel.htmlFor = "block-target-direction";
    const direction = el("select", "field"); direction.id = "block-target-direction";
    for (const [id, text] of [["at_least", "Minimum à atteindre"], ["at_most", "Plafond à respecter"]]) {
      const option = el("option", "", text); option.value = id; direction.append(option);
    }
    direction.value = target.direction;
    const preview = el("p", "target-preview"); preview.id = "block-target-preview"; preview.setAttribute("aria-live", "polite");
    const projection = el("p", "target-projection");
    const help = el("p", "width-help", T.policyText(result.kpi));

    function syncInputs() {
      const display = (value) => value == null ? "" : String(value).replace(".", ",");
      input.value = display(target.value);
      monthInputs.forEach((field, index) => { field.value = display(target.monthlyValues[index]); });
    }
    function syncMode() {
      for (const [mode] of modes) {
        const active = mode === target.mode;
        tabButtons[mode].classList.toggle("active", active);
        tabButtons[mode].setAttribute("aria-selected", String(active));
        tabButtons[mode].tabIndex = active ? 0 : -1;
        panels[mode].hidden = !active;
      }
    }
    function switchMode(mode) {
      if (mode === "monthly" && !T.hasValue({...target, mode})) {
        target.monthlyValues = T.monthlyDefaults(target, result.kpi, year);
      }
      target.mode = mode;
      syncInputs(); syncMode(); update(); renderCanvas();
      focusInspector(tabButtons[mode]);
    }
    function update() {
      const message = T.validationError(target, result.kpi);
      error.textContent = message; error.hidden = !message;
      input.setAttribute("aria-invalid", String(target.mode === "simple" && Boolean(message)));
      const needsMonths = target.mode === "monthly" && T.hasValue(target);
      monthInputs.forEach((field, index) => {
        const value = target.monthlyValues[index];
        field.setAttribute("aria-invalid", String(needsMonths && (T.parseValue(value) === null || Boolean(T.valueError(value, result.kpi)))));
      });
      const simple = {...target, mode: "simple"};
      copySimple.disabled = !T.hasValue(simple) || Boolean(T.validationError(simple, result.kpi));
      copySimple.title = copySimple.disabled ? "Renseignez d’abord une valeur valide dans l’onglet Simple." : "Remplacer les 12 valeurs par la répartition de l’objectif simple.";
      const comparison = T.evaluate(target, result);
      preview.textContent = message ? "Complétez ou corrigez les valeurs pour afficher l’objectif." : comparison ?
        `Objectif du rapport : ${T.formatValue(comparison.value, result.kpi)}. ${K.rangeLabel(result.range)}. ${T.description(comparison, result.kpi)}.` :
        "Aucun objectif pour ce bloc.";
      projection.hidden = !comparison;
      if (comparison) {
        const spec = T.periodDefinition(target.period);
        if (additive && target.mode === "simple" && spec.months) {
          const monthly = comparison.target.value / spec.months;
          projection.textContent = `Base mensuelle : ${T.formatValue(monthly, result.kpi)}. Sur 6 mois complets : ${T.formatValue(monthly * 6, result.kpi)}. Sur 12 mois complets : ${T.formatValue(monthly * 12, result.kpi)}.`;
        } else {
          const annual = T.valueForRange(comparison.target, result.kpi, {start: `${year}-01-01`, end: `${year}-12-31`});
          projection.textContent = `${additive ? "Objectif annuel complet" : target.mode === "monthly" ? `Cible moyenne annuelle (${year})` : "Cible fixe"} : ${T.formatValue(annual, result.kpi)}.`;
        }
      }
    }
    input.addEventListener("input", () => { target.value = input.value; update(); renderCanvas(); });
    select.addEventListener("change", () => { target.period = select.value; update(); renderCanvas(); });
    direction.addEventListener("change", () => { target.direction = direction.value; update(); renderCanvas(); });
    const clear = button("Retirer l’objectif", "button small", () => {
      target.value = null; target.monthlyValues = T.MONTHS.map(() => null);
      syncInputs(); update(); renderCanvas();
      focusInspector(target.mode === "monthly" ? monthInputs[0] : input);
    });
    settings.append(tabs, modeHelp, panels.simple, panels.monthly, error, directionLabel, direction, projection, preview, help, clear);
    inspector.append(settings);
    syncInputs(); syncMode(); update();
  }

  function openBlockData(block, trigger) {
    detail = {data: metricResult(block), title: block.content || K.definition(block.kpiId).label, source: false};
    showDataPanel(trigger);
  }
  function openCategoryData(block, result, group, trigger) {
    const rows = [...group.rows].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    detail = {data: {...result,rows,value:result.kpi.calculate(rows)},
      title: (block.content || result.kpi.label)+" · "+group.label, source:false,
      context:"Catégorie sélectionnée : "+group.label+" · "+group.rows.length+" lignes"};
    showDataPanel(trigger);
  }

  function openSources(event) {
    detail = {data: dataModel.source("sales", "rolling12"), title: "Tables de démonstration", source: true};
    showDataPanel(event?.currentTarget);
  }

  function showDataPanel(trigger) {
    detailReturnFocus = trigger || document.activeElement;
    dataPage = 0;
    root.classList.add("data-open");
    $("data-panel").hidden = false;
    $("close-data").textContent = detail.source ? "← Retour aux tableaux de bord" : editing ? "← Retour à l’édition" : "← Retour au tableau de bord";
    renderDataPanel();
    $("data-title").focus();
    $("data-panel").scrollIntoView({block: "start"});
    notify("");
  }

  function closeDataPanel() {
    detail = null;
    $("data-panel").hidden = true;
    root.classList.remove("data-open");
    if (detailReturnFocus?.isConnected) detailReturnFocus.focus();
    detailReturnFocus = null;
  }

  function renderDataPanel() {
    if (!detail) return;
    const {data} = detail;
    $("data-title").textContent = detail.title;
    $("data-description").textContent = `${data.table.label} · ${data.table.grain} · ${K.rangeLabel(data.range)}`;
    if (data.filters?.length) $("data-description").textContent += " · " + F.describe(data.filters, data.table);
    if (detail.context) $("data-description").textContent += " · " + detail.context;
    $("source-controls").hidden = !detail.source;
    $("source-table").value = data.table.id;
    $("source-period").value = data.range.period;
    const summary = $("data-summary");
    summary.replaceChildren();
    if (data.kpi) {
      const value = el("div", "data-kpi");
      value.append(el("span", "", data.kpi.label), el("strong", "", K.formatValue(data.value, data.kpi)));
      const calculation = el("div", "data-calculation");
      calculation.append(el("strong", "", "Calcul du KPI"), el("p", "", data.kpi.formula),
        el("p", "", "La table ci-dessous contient les lignes sources retenues pour ce calcul et cette période."));
      summary.append(value, calculation);
    } else {
      summary.append(el("p", "", "Trois tables fictives alimentent les KPI des graphiques et des cartes. Choisissez une table et une période pour explorer les lignes disponibles."));
    }
    renderDataRows();
  }

  function renderDataRows() {
    if (!detail) return;
    const {data} = detail, total = data.rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    dataPage = Math.min(Math.max(0, dataPage), pages - 1);
    const start = dataPage * PAGE_SIZE, end = Math.min(total, start + PAGE_SIZE);
    $("data-count").textContent = `${total.toLocaleString("fr-FR")} ligne${total > 1 ? "s" : ""} retenue${total > 1 ? "s" : ""}${total ? ` · Affichage de ${start + 1} à ${end}` : ""} · Dates les plus récentes en premier`;
    $("data-page").textContent = `Page ${dataPage + 1} sur ${pages}`;
    $("data-prev").disabled = dataPage === 0;
    $("data-next").disabled = dataPage >= pages - 1;
    const table = $("raw-table");
    table.replaceChildren();
    table.append(el("caption", "sr-only", `${data.table.label} : données brutes, ${K.rangeLabel(data.range)}`));
    const head = el("thead"), headings = el("tr"), body = el("tbody");
    for (const column of data.table.columns) {
      const cell = el("th", column.kind === "number" ? "numeric" : "", column.label);
      cell.scope = "col";
      headings.append(cell);
    }
    head.append(headings);
    for (const row of data.rows.slice(start, end)) {
      const line = el("tr");
      for (const column of data.table.columns) {
        const value = row[column.key];
        const display = value == null ? "—" : column.kind === "date" ? K.formatDate(value) :
          typeof value === "number" ? value.toLocaleString("fr-FR", {maximumFractionDigits: 2}) : String(value);
        line.append(el("td", column.kind === "number" ? "numeric" : "", display));
      }
      body.append(line);
    }
    if (!total) {
      const line = el("tr"), cell = el("td", "empty-data", "Aucune ligne pour cette période.");
      cell.colSpan = data.table.columns.length;
      line.append(cell); body.append(line);
    }
    table.append(head, body);
    $("download-csv").textContent = `Télécharger en CSV (${total.toLocaleString("fr-FR")} lignes)`;
    $("download-csv").disabled = !total;
    table.parentElement.scrollTop = 0;
  }

  function updateSource() {
    if (!detail?.source) return;
    detail.data = dataModel.source($("source-table").value, $("source-period").value);
    dataPage = 0;
    renderDataPanel();
  }

  function downloadCsv() {
    if (!detail || !detail.data.rows.length) return;
    const {data} = detail;
    let url;
    const link = el("a");
    try {
      const blob = new Blob([K.toCsv(data.table, data.rows)], {type: "text/csv;charset=utf-8;"});
      url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `kpi-card-${data.kpi?.id || data.table.id}-${data.range.start}_${data.range.end}.csv`;
      link.hidden = true;
      document.body.append(link);
      link.click();
      notify(`Export CSV préparé : ${data.rows.length.toLocaleString("fr-FR")} lignes, toutes les pages incluses.`);
    } catch (_) {
      notify("Le navigateur n’a pas pu préparer l’export CSV. Réessayez depuis cette table.", true);
    } finally {
      link.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  function targetPlacement(payload, row, col) {
    if (!payload) return null;
    const existing = payload.id ? blockById(payload.id) : null;
    if (payload.id && !existing) return null;
    const definition = definitions[payload.type];
    if (!existing && !definition) return null;
    return L.placement(blocks, row, col, existing?.span || definition.span, existing?.id);
  }

  function place(payload, row, col) {
    if (!editing) return;
    if (!payload) return notify("Choisissez d’abord un type de bloc dans le panneau.");
    const position = targetPlacement(payload, row, col);
    if (!position) return notify("Cet emplacement est occupé. Choisissez une case libre.", true);
    const existing = payload.id ? blockById(payload.id) : null;
    const wanted = existing?.span || definitions[payload.type].span;
    if (existing) Object.assign(existing, position);
    else {
      blocks.push({id: crypto.randomUUID(), type: payload.type, ...position,
        content: definitions[payload.type].content, chartKind: "bar",
        ...B.normalize({type: payload.type}),
        ...(["chart", "card"].includes(payload.type) ? {kpiId: "revenue", period: "inherit"} : {})});
    }
    selectedId = existing?.id || blocks[blocks.length - 1].id;
    pending = dragging = null;
    rows = Math.min(L.MAX_ROWS, Math.max(rows, row + 2));
    renderCanvas(); renderPalette(); renderInspector();
    notify(`Bloc ${existing ? "déplacé" : "ajouté"}, ligne ${row + 1}, colonne ${col + 1}.${position.span < wanted ? ` Largeur ajustée à ${position.span} colonne(s), selon la place disponible.` : ""}`);
    focusInspector("block-content");
  }

  function attachDrag(node, payload) {
    node.addEventListener("dragstart", (event) => {
      if (!editing) return event.preventDefault();
      dragging = payload;
      pending = null;
      event.dataTransfer.effectAllowed = payload.id ? "move" : "copy";
      event.dataTransfer.setData("text/plain", "kpi-card-block");
      if (payload.id) node.closest(".block").classList.add("moving");
      notify("Déposez le bloc sur la grille. Sa largeur s’adapte à l’espace libre.");
    });
    node.addEventListener("dragend", () => {
      dragging = null;
      clearPreview();
      canvas.querySelectorAll(".moving").forEach((card) => card.classList.remove("moving"));
    });
  }

  function gridTarget(event) {
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX >= rect.right) return null;
    const gap = parseFloat(getComputedStyle(canvas).columnGap) || 0;
    const col = Math.min(5, Math.max(0, Math.floor((event.clientX - rect.left + gap / 2) / ((rect.width + gap) / 6))));
    const cell = event.target.closest("[data-row]");
    if (cell && canvas.contains(cell)) return {row: Number(cell.dataset.row), col};
    for (const item of canvas.querySelectorAll("[data-row]")) {
      const box = item.getBoundingClientRect();
      if (event.clientY >= box.top && event.clientY <= box.bottom) return {row: Number(item.dataset.row), col};
    }
    return null;
  }

  function clearPreview() { canvas.querySelector(".drop-preview")?.remove(); }

  function showPreview(payload, position) {
    const next = targetPlacement(payload, position.row, position.col);
    if (!next) { clearPreview(); return; }
    let preview = canvas.querySelector(".drop-preview");
    if (!preview) { preview = el("div", "drop-preview"); canvas.append(preview); }
    gridPosition(preview, next.row, next.col, next.span);
    preview.textContent = `${next.span} colonne${next.span > 1 ? "s" : ""}`;
  }

  canvas.addEventListener("dragover", (event) => {
    if (!editing || !dragging) return;
    event.preventDefault();
    const target = gridTarget(event);
    const valid = target && targetPlacement(dragging, target.row, target.col);
    event.dataTransfer.dropEffect = valid ? (dragging.id ? "move" : "copy") : "none";
    if (target) showPreview(dragging, target); else clearPreview();
  });
  canvas.addEventListener("drop", (event) => {
    if (!editing || !dragging) return;
    event.preventDefault();
    const target = gridTarget(event);
    clearPreview();
    if (target) place(dragging, target.row, target.col);
  });
  canvas.addEventListener("dragleave", (event) => {
    if (!canvas.contains(event.relatedTarget)) clearPreview();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!editing || !pending) return;
    const target = gridTarget(event);
    if (target) showPreview(pending, target); else clearPreview();
  });
  canvas.addEventListener("pointerleave", () => { if (!dragging) clearPreview(); });
  document.addEventListener("keydown", (event) => {
    if (catalogueMode) return;
    if (event.key === "Escape" && detail) {
      event.preventDefault();
      closeDataPanel();
      return;
    }
    if (event.key === "Escape" && view === "hub" && !$("create-panel").hidden) {
      $("create-panel").hidden = true;
      $("create-dashboard").focus();
    }
    if (event.key === "Escape" && editing && activePayload()) {
      pending = dragging = null;
      clearPreview(); renderCanvas(); renderPalette();
      notify("Placement annulé.");
    }
  });
  $("create-form").addEventListener("submit", createDashboard);
  $("close-create").addEventListener("click", () => {
    $("create-panel").hidden = true;
    $("create-dashboard").focus();
  });
  $("close-data").addEventListener("click", closeDataPanel);
  $("download-csv").addEventListener("click", downloadCsv);
  $("data-prev").addEventListener("click", () => {
    dataPage--; renderDataRows();
    if ($("data-prev").disabled) $("data-next").focus({preventScroll: true});
  });
  $("data-next").addEventListener("click", () => {
    dataPage++; renderDataRows();
    if ($("data-next").disabled) $("data-prev").focus({preventScroll: true});
  });
  for (const table of K.TABLES) {
    const option = el("option", "", table.label);
    option.value = table.id;
    $("source-table").append(option);
  }
  fillPeriods($("source-period"), "rolling12");
  $("source-table").addEventListener("change", updateSource);
  $("source-period").addEventListener("change", updateSource);
  $("dashboard-period").addEventListener("change", (event) => setBoardPeriod(event.target.value));
  $("view-period").addEventListener("change", (event) => setBoardPeriod(event.target.value));
  $("dashboard-search").addEventListener("input", renderHub);
  $("dashboard-name").addEventListener("input", () => {
    if (!draftBoard) return;
    draftBoard.name = $("dashboard-name").value;
    $("page-title").textContent = draftBoard.name || "Nouveau tableau";
  });
  $("dashboard-description").addEventListener("input", () => {
    if (draftBoard) draftBoard.description = $("dashboard-description").value;
  });
  const blankOption = el("option", "", "Un tableau vierge");
  blankOption.value = "";
  $("new-template").append(blankOption);
  for (const template of D.examples().dashboards) {
    const option = el("option", "", template.name);
    option.value = template.id;
    $("new-template").append(option);
  }
  $("add-row").addEventListener("click", () => {
    if (editing && rows < L.MAX_ROWS) {
      rows++;
      renderCanvas();
      $("add-row").disabled = rows >= L.MAX_ROWS;
      notify(`Ligne ${rows} ajoutée.`);
    }
  });
  for (let col = 1; col <= 6; col++) $("column-guides").append(el("span", "", String(col).padStart(2, "0")));

  function initialize(args) {
    if (initialized) return;
    initialized = true;
    if (args.page === "catalogue") {
      catalogueMode = true;
      root.hidden = true;
      $("catalogue").hidden = false;
      document.title = "Catalogue KPI · KPI-Card";
      window.KPICatalogue.mount($("catalogue"), dataModel, {dialect: args.sql_dialect});
      return;
    }
    storageKey = args.storage_key || "kpi-card:dashboards:v2";
    let stored = null, storageError = false;
    let legacy = L.normalize(args.legacy), hasCurrentStorage = false;
    try {
      const raw = localStorage.getItem(storageKey);
      hasCurrentStorage = raw !== null;
      if (raw !== null) { stored = D.normalize(JSON.parse(raw)); storageError = !stored; }
      // Migration du premier POC, quelle que soit son ancienne identité visuelle.
      if (!hasCurrentStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.endsWith(":home-editor:poc:v1")) {
            const candidate = L.normalize(JSON.parse(localStorage.getItem(key)));
            if (candidate) { legacy = candidate; break; }
          }
        }
      }
    } catch (_) { storageError = true; }
    collection = stored || D.normalize(args.initial);
    if (!collection) {
      collection = D.examples();
      const imported = D.fromLegacy(legacy);
      if (imported && !hasCurrentStorage) collection = D.upsert(collection, imported);
    }
    render();
    if (storageError) {
      notify("La collection locale n’a pas pu être chargée. Les tableaux affichés restent utilisables pour cette session.", true);
    } else {
      persistCollection();
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.data?.type !== "streamlit:render") return;
    initialize(event.data.args || {});
    resizeFrame();
  });
  new ResizeObserver(resizeFrame).observe(root);
  new ResizeObserver(resizeFrame).observe($("catalogue"));
  send("streamlit:componentReady", {apiVersion: 1});
  if (window.parent === window) initialize({});
})();
