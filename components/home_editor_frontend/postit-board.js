/* Tableau de post-it : colonnes configurables, déplacements et édition locale. */
(function(root) {
  "use strict";
  const TONES = {info: "Information", warning: "Vigilance", success: "Décision"};
  const PRIORITIES = {high: "Haute", normal: "Normale", low: "Basse"};
  function fit(block, count = Math.min(block.columns.length, block.span || 3)) {
    count = Math.max(1, Math.min(block.span || 3, count));
    const columns = block.columns.slice(0, count).map(c => ({...c}));
    for (let i = columns.length; i < count; i++) {
      let id = "column-" + (i + 1); while (columns.some(c => c.id === id)) id += "-new";
      columns.push({id, title: "Colonne " + (i + 1)});
    }
    const ids = new Set(columns.map(c => c.id));
    return {columns, actions: block.actions.map(a => ({...a, columnId: ids.has(a.columnId) ? a.columnId : columns.at(-1).id}))};
  }
  function normalize(raw, actions) {
    let columns = raw.columns;
    if (columns === undefined) {
      columns = [{id: "todo", title: "À faire"}, {id: "doing", title: "En cours"}];
      if (actions.some(a => a.status === "done") && (raw.span || 3) >= 3) columns.push({id: "done", title: "Terminé"});
    }
    if (!Array.isArray(columns) || !columns.length || columns.length > 6) return null;
    const ids = new Set();
    for (const c of columns) {
      if (!c || typeof c.id !== "string" || !c.id || c.id.length > 100 || ids.has(c.id)) return null;
      ids.add(c.id);
    }
    columns = columns.map((c,i) => ({id:c.id, title: String(c.title ?? "").trim().slice(0,80) || "Colonne " + (i+1)}));
    return fit({span:raw.span, columns, actions:actions.map(a => ({...a,
      columnId: ids.has(a.columnId) ? a.columnId : ids.has(a.status) ? a.status : columns[0].id}))});
  }
  function move(block, id, columnId) {
    if (!block.columns.some(c => c.id === columnId) || !block.actions.some(a => a.id === id)) return null;
    return block.actions.map(a => a.id === id ? {...a, columnId} : {...a});
  }
  let seq = 0;
  function render(block, body, {el, editable, update, validDate, filters = {}, undo = null}) {
    const actions = block.actions || [], columns = block.columns;
    function button(label, fn) { const b=el("button","button small",label); b.type="button"; b.addEventListener("click",fn); return b; }
    function redraw(nextUndo = null, focusId = null) {
      body.replaceChildren(); render(block,body,{el,editable,update,validDate,filters,undo:nextUndo});
      const note=[...body.querySelectorAll("[data-note-id]")].find(n=>n.dataset.noteId===focusId);
      (note?.querySelector(".postit-open") || body.querySelector(".postit-add"))?.focus({preventScroll:true});
    }
    function commit(next, nextUndo = null, focusId = null) {
      if(update({actions:next})===false) return false;
      redraw(nextUndo,focusId); return true;
    }
    function edit(action = null, columnId = columns[0].id) {
      body.replaceChildren(); const form=el("form","action-form");
      form.append(el("h3","chart-heading",action ? "Modifier le post-it" : "Nouveau post-it"));
      const prefix="postit-"+(++seq);
      function field(label,key,value,type="text",max=240) {
        const caption=el("label","field-label",label);caption.htmlFor=prefix+key;
        const input=el(type==="textarea"?"textarea":"input","field");input.id=caption.htmlFor;
        if(type!=="textarea") input.type=type; else input.rows=4;
        input.value=value||"";input.maxLength=max;form.append(caption,input);return input;
      }
      function select(label,key,choices,value) {
        const caption=el("label","field-label",label);caption.htmlFor=prefix+key;
        const input=el("select","field");input.id=caption.htmlFor;
        for(const [id,name] of choices) {const o=el("option","",name);o.value=id;input.append(o);}
        input.value=value;form.append(caption,input);return input;
      }
      const title=field("Titre de la note","title",action?.title);title.required=true;
      const details=field("Votre note","details",action?.details,"textarea",5000);
      const tone=select("Badge","tone",Object.entries(TONES),action?.tone||"info");
      const column=select("Colonne","column",columns.map(c=>[c.id,c.title]),action?.columnId||columnId);
      const priority=select("Priorité","priority",Object.entries(PRIORITIES),action?.priority||"normal");
      const owner=field("Responsable","owner",action?.owner,"text",120);
      const due=field("Échéance","due",action?.due,"date");
      const controls=el("div","action-controls"),save=el("button","button small primary","Enregistrer le post-it");save.type="submit";
      const message=el("p","hint");message.setAttribute("role","status");
      controls.append(save,button("Annuler",()=>redraw(null,action?.id)));
      if(action) controls.append(button("Supprimer le post-it",()=>commit(actions.filter(a=>a.id!==action.id),actions)));
      form.append(controls,message);
      title.addEventListener("input",()=>title.setCustomValidity(""));
      due.addEventListener("input",()=>due.setCustomValidity(""));
      form.addEventListener("submit",e=>{
        e.preventDefault();if(!title.value.trim()){title.setCustomValidity("Saisissez un titre.");title.reportValidity();return;}
        if(due.value&&!validDate(due.value)){due.setCustomValidity("Saisissez une date valide.");due.reportValidity();return;}
        const value={id:action?.id||crypto.randomUUID(),title:title.value.trim(),details:details.value,tone:tone.value,
          columnId:column.value,priority:priority.value,owner:owner.value.trim(),due:due.value,status:action?.status||"todo"};
        if(!commit(action?actions.map(a=>a.id===action.id?value:a):[...actions,value],null,value.id)) message.textContent="Le post-it n’a pas pu être enregistré.";
      });
      form.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();redraw(null,action?.id);}});
      body.append(form);title.focus({preventScroll:true});
    }
    body.append(el("h3","chart-heading",block.content||"Notes et actions"));
    if(editable) {
      const filtersBox=el("details","postit-filters"),summary=el("summary","", "Filtrer les post-it");filtersBox.open=!!filters.open;
      filtersBox.addEventListener("toggle",()=>filters.open=filtersBox.open);filtersBox.append(summary);
      function filter(key,label,choices) {
        const caption=el("label","period-label",label),input=el("select","field");input.dataset.postitFilter=key;
        for(const [id,name] of [["","Tous"],...choices]){const o=el("option","",name);o.value=id;input.append(o);}
        input.value=filters[key]||"";caption.append(input);filtersBox.append(caption);
        input.addEventListener("change",()=>{filters[key]=input.value;redraw(undo);body.querySelector(`[data-postit-filter="${key}"]`)?.focus({preventScroll:true});});
      }
      filter("priority","Priorité",Object.entries(PRIORITIES));
      filter("owner","Responsable",[...new Set([...actions.map(a=>a.owner),filters.owner].filter(Boolean))].map(v=>[v,v]));
      filter("column","Colonne",columns.map(c=>[c.id,c.title]));body.append(filtersBox);
    }
    if(undo&&editable){const notice=el("div","action-undo");notice.setAttribute("role","status");notice.append(el("span","","Post-it supprimé."),button("Annuler la suppression",()=>commit(undo)));body.append(notice);}
    const grid=el("div","postit-board");grid.style.setProperty("--postit-columns",String(columns.length));
    let draggingId=null;
    for(const column of columns) {
      const lane=el("section","postit-column");lane.setAttribute("aria-label","Colonne : "+column.title);lane.dataset.columnId=column.id;
      const all=actions.filter(a=>a.columnId===column.id),shown=all.filter(a=>(!filters.priority||a.priority===filters.priority)&&(!filters.owner||a.owner===filters.owner)&&
        (!filters.column||a.columnId===filters.column));
      lane.append(el("h4","postit-column-title",`${column.title} · ${shown.length}${shown.length!==all.length?" / "+all.length:""}`));
      if(editable){
        lane.addEventListener("dragover",e=>{if(!draggingId)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="move";lane.classList.add("postit-drop");});
        lane.addEventListener("dragleave",e=>{if(!lane.contains(e.relatedTarget))lane.classList.remove("postit-drop");});
        lane.addEventListener("drop",e=>{if(!draggingId)return;e.preventDefault();e.stopPropagation();const id=draggingId;draggingId=null;const next=move(block,id,column.id);if(next)commit(next,null,id);});
      }
      for(const action of shown){
        const note=el("article",`postit tone-${action.tone}`);note.dataset.noteId=action.id;
        const badges=el("div","postit-badges");badges.append(el("span","callout-label",TONES[action.tone]),el("span","action-badge priority-"+action.priority,PRIORITIES[action.priority]));
        note.append(badges,el("strong","postit-title",action.title||"Note sans titre"));
        if(action.details)note.append(el("p","postit-text",action.details));
        if(editable){
          const open=el("div","postit-open");open.tabIndex=0;open.setAttribute("role","button");open.setAttribute("aria-label","Modifier le post-it : "+action.title);
          open.append(...note.childNodes);note.append(open);
          note.addEventListener("click",e=>{if(!e.target.closest("button, select, label"))edit(action);});
          note.addEventListener("keydown",e=>{if(e.target===open&&["Enter"," "].includes(e.key)){e.preventDefault();edit(action);}});
          note.draggable=true;note.addEventListener("dragstart",e=>{draggingId=action.id;e.stopPropagation();e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",action.id);note.classList.add("postit-dragging");});
          note.addEventListener("dragend",()=>{draggingId=null;note.classList.remove("postit-dragging");body.querySelectorAll(".postit-drop").forEach(n=>n.classList.remove("postit-drop"));});

        }
        lane.append(note);
      }
      if(!shown.length)lane.append(el("p","postit-empty",editable?"Déposez un post-it ici":"Aucun post-it"));
      if(editable){const add=button("+ Post-it",()=>edit(null,column.id));add.classList.add("postit-add");add.setAttribute("aria-label","Ajouter un post-it : "+column.title);add.disabled=actions.length>=50;lane.append(add);}
      grid.append(lane);
    }
    body.append(grid);
  }
  function settings(block,container,{el,changed,rebuild,focus}) {
    const label=el("label","field-label","Nombre de colonnes");label.htmlFor="postit-column-count";
    const select=el("select","field");select.id=label.htmlFor;
    for(let i=1;i<=block.span;i++){const o=el("option","",String(i));o.value=i;select.append(o);}select.value=block.columns.length;
    select.addEventListener("change",()=>{Object.assign(block,fit(block,Number(select.value)));changed();rebuild();focus("postit-column-count");});container.append(label,select);
    container.append(el("p","hint","Maximum : largeur du bloc. Réduire regroupe les notes dans la dernière colonne restante."));
    block.columns.forEach((column,i)=>{
      const caption=el("label","field-label","Nom de la colonne "+(i+1));caption.htmlFor="postit-column-"+i;
      const input=el("input","field");input.id=caption.htmlFor;input.value=column.title;input.maxLength=80;
      input.addEventListener("input",()=>{column.title=input.value;changed();});container.append(caption,input);
    });
    container.append(el("p","hint","Enregistrez le rapport pour ajouter, modifier et déplacer les post-it en lecture. La colonne indique l’avancement du post-it."));
  }
  const api={normalize,fit,move,render,settings,TONES};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PostitBoard=api;
})(globalThis);
