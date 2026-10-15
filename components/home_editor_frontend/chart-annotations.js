/* Commentaires datés, indépendants des calculs et des filtres de données. */
(function (root) {
  "use strict";
  const R = typeof module !== "undefined" && module.exports ? require("./report-blocks.js") : root.ReportBlocks;
  function normalize(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 30) return null;
    const ids = new Set(), result = [];
    for (const item of value) {
      if (!item || typeof item.id !== "string" || !item.id || item.id.length > 100 || ids.has(item.id) || !R.validDate(item.date)) return null;
      ids.add(item.id);
      result.push({id: item.id, date: item.date, text: String(item.text ?? "").slice(0, 1000)});
    }
    return result;
  }
  function markers(annotations, series) {
    return series.map(point => annotations.filter(a => a.date >= point.start && a.date <= point.end));
  }
  let sequence = 0;
  function render(block, host, {el, editable, range, update, refresh, toolbar, focusBack}) {
    const notes = block.annotations || [];
    if (!notes.length && !editable) return;
    const box = el("details", "chart-annotations"); box.setAttribute("aria-label", "Annotations du graphique");
    box.addEventListener("click", event => event.stopPropagation());
    function button(label, fn) { const b = el("button", "button small", label); b.type = "button"; b.addEventListener("click", fn); return b; }
    function commit(next) {
      if (update({annotations: next}) === false) return false;
      const nextHost = refresh();
      const details = nextHost.querySelector(".chart-annotations");
      if (details && next.length) details.open = true;
      return nextHost;
    }
    function edit(note = null) {
      let modal;
      const form = el("form", "annotation-form"), id = "annotation-" + ++sequence;
      const dateLabel = el("label", "field-label", "Date de l’événement"); dateLabel.htmlFor = id + "date";
      const date = el("input", "field"); date.type = "date"; date.id = dateLabel.htmlFor; date.required = true; date.value = note?.date || range.end;
      const textLabel = el("label", "field-label", "Commentaire"); textLabel.htmlFor = id + "text";
      const text = el("textarea", "field"); text.id = textLabel.htmlFor; text.maxLength = 1000; text.required = true; text.rows = 3; text.value = note?.text || "";
      const save = el("button", "button small primary", "Enregistrer l’annotation"); save.type = "submit";
      const controls = el("div", "action-controls"); controls.append(save, button("Annuler", () => modal.close()));
      form.append(dateLabel, date, textLabel, text, controls);
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (!R.validDate(date.value) || !text.value.trim()) { text.setCustomValidity("Saisissez un commentaire et une date valides."); text.reportValidity(); return; }
        const value = {id: note?.id || crypto.randomUUID(), date: date.value, text: text.value.trim()};
        if (commit(note ? notes.map(n => n.id === note.id ? value : n) : [...notes, value])) modal.close();
      });
      text.addEventListener("input", () => text.setCustomValidity("")); date.addEventListener("input", () => text.setCustomValidity(""));
      modal = root.EditDialog.open(note ? "Modifier l’annotation" : "Nouvelle annotation", form,
        focusBack);
    }
    box.append(el("summary", "", `Annotations (${notes.length})`));
    for (const note of [...notes].sort((a,b) => a.date.localeCompare(b.date))) {
      const item = el("div", "annotation-item");
      const outside = note.date < range.start || note.date > range.end;
      item.append(el("strong", "", note.date.split("-").reverse().join("/") + (outside ? " · Hors période affichée" : "")), el("p", "", note.text));
      if (editable) {
        const controls = el("div", "action-controls annotation-controls");
        controls.append(button("Modifier l’annotation", () => edit(note)), button("Supprimer l’annotation", () => {
          const nextHost = commit(notes.filter(n => n.id !== note.id));
          if (nextHost) {
            const undo = button("Annuler la suppression de l’annotation", () => commit(notes));
            const restoredBox = nextHost.querySelector(".chart-annotations");
            if (restoredBox) {restoredBox.hidden = false; restoredBox.open = true; restoredBox.append(undo);}
          }
        })); item.append(controls);
      }
      box.append(item);
    }
    if (editable) { const add = button("", () => edit()); add.setAttribute("aria-label", "Annoter le graphique"); add.title = "Annoter le graphique";
      add.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13l4-4h6M18 14v8m-4-4h8"/></svg>'; add.disabled = notes.length >= 30; add.className = "kpi-info-link annotation-add"; toolbar.append(add); }
    box.hidden = !notes.length; host.append(box);
  }
  const api = {normalize, markers, render};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChartAnnotations = api;
})(globalThis);
