/* Vue du catalogue : même registre et mêmes calculs que les blocs du hub. */
(function (root) {
  "use strict";
  const K = root.KPIData, C = root.KPICatalogueModel;
  const T = root.KPITargets;
  const el = (tag, className = "", text = null) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  };
  function button(text, className, action) {
    const node = el("button", className, text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function selectField(id, label, choices, value, action) {
    const wrapper = el("label", "catalogue-filter", label);
    wrapper.htmlFor = id;
    const select = el("select", "field");
    select.id = id;
    for (const [key, text] of choices) {
      const option = el("option", "", text);
      option.value = key;
      select.append(option);
    }
    select.value = value;
    select.addEventListener("change", () => action(select.value));
    wrapper.append(select);
    return wrapper;
  }
  function section(title, text = "") {
    const node = el("section", "catalogue-section");
    node.append(el("h3", "", title));
    if (text) node.append(el("p", "", text));
    return node;
  }
  function facts(items) {
    const list = el("dl", "catalogue-facts");
    for (const [label, value] of items) {
      const item = el("div");
      item.append(el("dt", "", label), el("dd", "", value));
      list.append(item);
    }
    return list;
  }
  const searchable = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

  function mount(container, dataModel, options = {}) {
    const entries = C.entries();
    let selectedId = entries.some(entry => entry.id === options.selectedId) ? options.selectedId : entries[0]?.id, source = "", query = "", period = "rolling12", activeTab = "business";
    let dialect = ["standard", "databricks", "postgresql"].includes(options.dialect) ? options.dialect : "standard";
    let sqlMode = "value";
    container.replaceChildren();
    if (options.selectedId && !entries.some(entry => entry.id === options.selectedId)) container.append(el("p", "hint", "Cet indicateur est inconnu. Retrouvez les indicateurs disponibles ci-dessous."));
    const intro = el("header", "catalogue-intro");
    const heading = el("div");
    heading.append(el("div", "eyebrow", "VOTRE RÉFÉRENTIEL MÉTIER ET TECHNIQUE"), el("h1", "", "Catalogue KPI"),
      el("p", "catalogue-lead", "Comprendre un indicateur, retrouver ses données et partager sa méthode de calcul."));
    const stats = el("div", "catalogue-stats");
    for (const [value, text] of [[entries.length, "KPI documentés"], [K.TABLES.length, "tables sources"]]) {
      const stat = el("div");
      stat.append(el("strong", "", String(value)), el("span", "", text));
      stats.append(stat);
    }
    intro.append(heading, stats);
    const filters = el("div", "catalogue-filters");
    const searchLabel = el("label", "catalogue-filter catalogue-search", "Rechercher un indicateur");
    const search = el("input", "field");
    search.id = "catalogue-search"; search.type = "search"; search.autocomplete = "off";
    search.placeholder = "Nom, définition, table, colonne…";
    searchLabel.htmlFor = search.id;
    searchLabel.append(search);
    const sourceField = selectField("catalogue-source", "Source de données", [["", "Toutes les sources"], ...K.TABLES.map((table) => [table.id, table.label])], source,
      (value) => { source = value; renderResults(); });
    const periodField = selectField("catalogue-period", "Période de l’exemple et du SQL", K.PERIODS.map((item) => [item.id, item.label]), period,
      (value) => { period = value; renderSheet(); });
    search.addEventListener("input", () => { query = search.value; renderResults(); });
    filters.append(searchLabel, sourceField, periodField);
    const content = el("div", "catalogue-layout"), sidebar = el("aside", "catalogue-index");
    sidebar.setAttribute("aria-label", "Liste des KPI");
    const count = el("p", "catalogue-count");
    count.setAttribute("role", "status"); count.setAttribute("aria-live", "polite");
    const list = el("ul", "catalogue-list");
    sidebar.append(count, list);
    const sheet = el("article", "catalogue-detail");
    sheet.setAttribute("aria-label", "Fiche du KPI sélectionné");
    content.append(sidebar, sheet);
    const status = el("p", "status");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    container.append(intro, filters, content, status);

    function matches() {
      const term = searchable(query.trim());
      return entries.filter((entry) => (!source || entry.table === source) && searchable([
        entry.id, entry.label, entry.formula, entry.purpose, entry.question, entry.usage,
        entry.source.label, entry.table, entry.schema.domain,
        ...entry.source.columns.map((column) => `${column.key} ${column.label}`),
      ].join(" ")).includes(term));
    }
    function renderList(items) {
      count.textContent = `${items.length} indicateur${items.length > 1 ? "s" : ""} sur ${entries.length}`;
      list.replaceChildren();
      for (const entry of items) {
        const li = el("li");
        const item = button("", `catalogue-list-item${entry.id === selectedId ? " selected" : ""}`, () => {
          selectedId = entry.id;
          status.textContent = "";
          renderList(matches()); renderSheet();
          list.querySelector(`[data-kpi="${entry.id}"]`).focus({preventScroll: true});
        });
        item.dataset.kpi = entry.id;
        item.setAttribute("aria-pressed", String(entry.id === selectedId));
        item.append(el("span", "catalogue-list-source", entry.schema.domain), el("strong", "", entry.label),
          el("span", "catalogue-list-meta", `${entry.aggregation} · ${entry.unit}`));
        li.append(item); list.append(li);
      }
    }
    function renderResults() {
      const items = matches();
      if (!items.some((entry) => entry.id === selectedId)) selectedId = items[0]?.id;
      renderList(items); renderSheet();
    }
    function renderSheet() {
      sheet.replaceChildren();
      const entry = entries.find((item) => item.id === selectedId);
      if (!entry) {
        const empty = el("div", "catalogue-empty");
        empty.append(el("h2", "", "Aucun KPI ne correspond à votre recherche."),
          el("p", "", "Essayez un autre terme ou une autre source de données."),
          button("Réinitialiser les filtres", "button", () => {
            query = source = ""; search.value = "";
            sourceField.querySelector("select").value = "";
            renderResults(); search.focus();
          }));
        sheet.append(empty); return;
      }
      const result = dataModel.evaluate(entry.id, period);
      const head = el("header", "catalogue-sheet-header");
      const labels = el("div", "catalogue-tags");
      labels.append(el("span", "catalogue-tag", entry.schema.domain), el("code", "catalogue-id", entry.id), el("span", "catalogue-demo", "Démonstration"));
      head.append(labels, el("h2", "", entry.label), el("p", "", entry.purpose));
      const snapshot = el("div", "catalogue-snapshot");
      const metric = el("div");
      metric.append(el("span", "catalogue-snapshot-label", "VALEUR DE DÉMONSTRATION"), el("strong", "", K.formatValue(result.value, entry)));
      const context = el("div");
      context.append(el("p", "", `${result.range.label} · ${K.rangeLabel(result.range)}`),
        el("p", "", `${result.rows.length.toLocaleString("fr-FR")} lignes retenues · Source : ${entry.source.label}`),
        el("p", "catalogue-snapshot-note", "Calcul partagé avec les blocs Carte et Graphique."));
      snapshot.append(metric, context);
      const tabs = el("div", "catalogue-tabs");
      tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Sections de la fiche KPI");
      const tabOptions = [["business", "Définition métier"], ["data", "Données & règles"], ["sql", "SQL & implémentation"]];
      tabOptions.forEach(([id, text], index) => {
        const tab = button(text, `catalogue-tab${id === activeTab ? " active" : ""}`, () => {
          activeTab = id; renderSheet();
          sheet.querySelector(`#catalogue-tab-${id}`).focus({preventScroll: true});
        });
        tab.id = `catalogue-tab-${id}`;
        tab.setAttribute("role", "tab"); tab.setAttribute("aria-selected", String(id === activeTab));
        tab.setAttribute("aria-controls", "catalogue-panel"); tab.tabIndex = id === activeTab ? 0 : -1;
        tab.addEventListener("keydown", (event) => {
          let next;
          if (event.key === "ArrowRight") next = (index + 1) % tabOptions.length;
          if (event.key === "ArrowLeft") next = (index + tabOptions.length - 1) % tabOptions.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = tabOptions.length - 1;
          if (next === undefined) return;
          event.preventDefault();
          activeTab = tabOptions[next][0]; renderSheet();
          sheet.querySelector(`#catalogue-tab-${activeTab}`).focus({preventScroll: true});
        });
        tabs.append(tab);
      });
      const panel = el("div", "catalogue-panel"); panel.id = "catalogue-panel";
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", `catalogue-tab-${activeTab}`);
      panel.tabIndex = 0;
      if (activeTab === "business") renderBusiness(panel, entry);
      if (activeTab === "data") renderData(panel, entry, result);
      if (activeTab === "sql") renderSql(panel, entry, result);
      sheet.append(head, snapshot, tabs, panel);
    }
    function renderBusiness(panel, entry) {
      const question = section("La question à laquelle il répond", entry.question);
      question.classList.add("catalogue-question");
      const formula = section("Méthode de calcul", entry.formula);
      formula.classList.add("catalogue-formula");
      const grid = el("div", "catalogue-section-grid");
      grid.append(section("Usage métier", entry.usage), section("Comment le lire", entry.interpretation));
      const identity = section("Repères de l’indicateur");
      identity.append(facts([["Unité", entry.unit], ["Agrégation", entry.aggregation], ["Interprétation de la tendance", entry.direction],
        ["Sans donnée / dénominateur nul", entry.empty], ["Responsable métier", "À renseigner"],
        ["Objectif / plafond", "Valeur, période et sens configurables dans chaque bloc Carte ou Graphique"]]));
      const limits = section("Limites d’interprétation");
      const bullets = el("ul");
      for (const text of entry.limits) bullets.append(el("li", "", text));
      limits.append(bullets);
      const targets = section("Comparaison à un objectif", T.policyText(entry));
      targets.append(el("p", "", "L’objectif est mensuel par défaut. Le mode simple propose aussi une période annuelle, semestrielle, trimestrielle ou hebdomadaire. Pour les montants et comptages, une cible annuelle est divisée par 12 pour obtenir sa base mensuelle, une cible sur 6 mois par 6 et sur 3 mois par 3."),
        el("p", "", "L’onglet Avancé permet de saisir 12 objectifs distincts, de janvier à décembre, reconduits chaque année. Chaque bloc possède sa propre cible, avec un minimum à atteindre ou un plafond à respecter. La période du rapport détermine les mois et fractions de mois utilisés ; l’année en cours s’arrête à aujourd’hui."),
        el("p", "", "L’écart correspond au réalisé moins l’objectif adapté au rapport. L’écart relatif divise cette différence par l’objectif ; il n’est pas calculé quand celui-ci vaut zéro. Pour un taux ou une note, l’écart absolu est exprimé en points."));
      panel.append(question, formula, grid, identity, targets, limits, periodsSection());
    }
    function periodsSection() {
      const node = section("Règles de temps et de restitution");
      node.append(facts([
        ["12 mois glissants / 6 mois / 3 mois / 1 mois", "Du lendemain de la date située 12, 6, 3 ou 1 mois auparavant jusqu’à aujourd’hui inclus. Le jour est ramené à la fin du mois si nécessaire."],
        ["Année en cours", "Du 1er janvier jusqu’à aujourd’hui inclus."],
        ["1 semaine", "Aujourd’hui et les six jours précédents."],
        ["Date de référence", "Jour du chargement, fuseau Europe/Paris. Les comparaisons utilisent des dates civiles, sans heure."],
        ["Graphiques", "Regroupement par jour pour 1 mois et 1 semaine, par mois calendaire pour les périodes plus longues. Les mois aux bornes peuvent être partiels."],
        ["Cartes et total", "Calcul sur toutes les lignes retenues. Les ratios, moyennes et nombres distincts sont recalculés sur la période complète."],
      ]));
      return node;
    }
    function renderData(panel, entry, result) {
      const lineage = section("Source et périmètre");
      lineage.append(facts([["Table logique", entry.table], ["Nom métier", entry.source.label], ["Granularité", entry.source.grain],
        ["Clé de la ligne", entry.schema.key], ["Champ temporel", "date, bornes de période incluses"],
        ["Filtre métier", entry.sqlFilter ? entry.sqlFilter((name) => name) : "Toutes les lignes de la période"],
        ["Jointures", "Aucune : un KPI utilise une seule table"], ["Actualisation", "Données fictives régénérées au chargement, sur environ 18 mois"]]));
      const fields = section("Dictionnaire des données");
      fields.append(el("p", "catalogue-muted", "Types SQL cibles documentés pour les tables du POC. Les champs de contexte sont disponibles dans les données brutes."));
      const wrapper = el("div", "table-scroll catalogue-table-wrap");
      wrapper.tabIndex = 0; wrapper.setAttribute("role", "region"); wrapper.setAttribute("aria-label", "Colonnes de la table source");
      const table = el("table", "raw-table catalogue-fields-table");
      table.append(el("caption", "sr-only", `Dictionnaire de ${entry.table}`));
      const head = el("thead"), headings = el("tr"), body = el("tbody");
      for (const title of ["Colonne", "Type SQL / null", "Rôle dans le KPI", "Définition"]) {
        const th = el("th", "", title); th.scope = "col"; headings.append(th);
      }
      head.append(headings);
      for (const column of entry.source.columns) {
        const [type, description, nullable] = entry.schema.columns[column.key];
        const row = el("tr"), name = el("td");
        name.append(el("code", "", column.key), el("small", "", column.label));
        const role = entry.fields[column.key] || (column.key === entry.schema.key ? "Identifiant de ligne / traçabilité" : "Contexte, hors calcul");
        row.append(name, el("td", "", `${type}\n${nullable ? "NULL autorisé" : "Non nul"}`),
          el("td", entry.fields[column.key] ? "catalogue-used-field" : "catalogue-muted", role), el("td", "", description));
        body.append(row);
      }
      table.append(head, body); wrapper.append(table); fields.append(wrapper);
      const quality = section("Règles sur les données");
      quality.append(el("p", "", `La clé ${entry.schema.key} est unique dans la table fictive. Les champs utilisés par ce KPI sont renseignés ; les dates, montants, notes et statuts respectent le dictionnaire ci-dessus.`),
        el("p", "", "Le calcul n’applique aucun dédoublonnage ni nettoyage automatique. L’équivalence SQL suppose ces mêmes contraintes : les agrégats SQL ignorent certaines valeurs NULL, alors que le modèle du POC attend des valeurs renseignées."));
      const sample = section("Extrait des lignes réellement retenues");
      sample.append(el("p", "catalogue-muted", `Les ${Math.min(5, result.rows.length)} premières lignes parmi ${result.rows.length.toLocaleString("fr-FR")} retenues, de la date la plus récente à la plus ancienne.`));
      const sampleWrapper = el("div", "table-scroll catalogue-table-wrap");
      sampleWrapper.tabIndex = 0; sampleWrapper.setAttribute("role", "region"); sampleWrapper.setAttribute("aria-label", "Extrait des données du KPI");
      const sampleTable = el("table", "raw-table");
      const sampleHead = el("thead"), sampleHeadRow = el("tr"), sampleBody = el("tbody");
      for (const column of entry.source.columns) {
        const th = el("th", "", column.label); th.scope = "col"; sampleHeadRow.append(th);
      }
      sampleHead.append(sampleHeadRow);
      for (const value of result.rows.slice(0, 5)) {
        const row = el("tr");
        for (const column of entry.source.columns) {
          const raw = value[column.key];
          const display = raw == null ? "—" : column.kind === "date" ? K.formatDate(raw) : typeof raw === "number" ? raw.toLocaleString("fr-FR") : raw;
          row.append(el("td", column.kind === "number" ? "numeric" : "", display));
        }
        sampleBody.append(row);
      }
      sampleTable.append(sampleHead, sampleBody); sampleWrapper.append(sampleTable); sample.append(sampleWrapper);
      panel.append(lineage, fields, quality, sample);
    }
    function codeBlock(title, code, language) {
      const block = el("section", "catalogue-code");
      const heading = el("div", "catalogue-code-heading"), pre = el("pre"), content = el("code", `language-${language}`, code);
      pre.tabIndex = 0; pre.setAttribute("aria-label", title); pre.append(content);
      const copy = button("Copier", "button small", async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponible");
          await navigator.clipboard.writeText(code);
          status.textContent = "Code copié dans le presse-papiers.";
        } catch (_) {
          const selection = window.getSelection(), range = document.createRange();
          range.selectNodeContents(content); selection.removeAllRanges(); selection.addRange(range);
          pre.focus({preventScroll: true});
          status.textContent = "Copie automatique indisponible. Le code est sélectionné : utilisez Ctrl+C (ou Cmd+C).";
        }
      });
      copy.setAttribute("aria-label", `Copier : ${title}`);
      heading.append(el("h3", "", title), copy); block.append(heading, pre);
      return block;
    }
    function renderSql(panel, entry, result) {
      const note = el("div", "catalogue-sql-note");
      note.append(el("strong", "", "SQL de référence"), el("p", "", "Ces requêtes documentent l’équivalent du calcul actuel. Le POC applique le JavaScript ci-dessous à ses données fictives ; il n’exécute pas ces requêtes SQL."));
      const controls = el("div", "catalogue-sql-controls");
      const sqlContainer = el("div");
      function renderQuery() {
        sqlContainer.replaceChildren(codeBlock(sqlMode === "rows" ? "Lignes sources du KPI" : "Valeur du KPI sur la période", C.sqlFor(entry, result.range, dialect, sqlMode), "sql"));
      }
      controls.append(
        selectField("catalogue-dialect", "Dialecte SQL", [["standard", "SQL standard"], ["databricks", "Databricks / Spark SQL"], ["postgresql", "PostgreSQL"]], dialect,
          (value) => { dialect = value; renderQuery(); }),
        selectField("catalogue-query-kind", "Requête", [["value", "Calcul du KPI"], ["rows", "Données sources retenues"]], sqlMode,
          (value) => { sqlMode = value; renderQuery(); }));
      renderQuery();
      const parameters = section("Conditions d’application");
      parameters.append(facts([["Dates de la requête", `${result.range.start} à ${result.range.end}, incluses. Modifiez la période en haut de page pour actualiser ces dates.`],
        ["Raccordement", `La table ${entry.table} est le nom logique du POC. À remplacer par le nom qualifié de votre table, avec les colonnes et types documentés.`],
        ["Périmètre du code", "Le calcul SQL retourne la valeur de la période complète, sans arrondi d’affichage. La seconde requête retourne les lignes qui alimentent ce calcul."],
        ["Résultats sans donnée", entry.empty],
        ["Hypothèse d’équivalence", "Une ligne par identifiant source, valeurs du calcul non nulles et statuts conformes au dictionnaire des données."]]));
      const implementation = el("details", "catalogue-implementation");
      implementation.append(el("summary", "", "Voir le JavaScript appliqué dans le POC"), codeBlock("Implémentation active du calcul", C.javascriptFor(entry), "javascript"));
      panel.append(note, controls, sqlContainer, parameters, implementation);
    }
    renderResults();
  }
  root.KPICatalogue = {mount};
})(window);
