/* Répartition par dimension, sur les lignes effectivement retenues par le KPI. */
(function(root) {
  "use strict";
  const K=root.KPIData, C=root.ChartStyles;
  const colors=["#247db0","#23826e","#b87622","#7754a5","#d05b69","#367d88","#84743b","#8095a7"];
  function el(tag,cls="",text=null) {
    const node=document.createElement(tag); node.className=cls;
    if(text!==null) node.textContent=text;
    return node;
  }
  function svg(tag,attrs,text=null) {
    const node=document.createElementNS("http://www.w3.org/2000/svg",tag);
    for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value));
    if(text!==null) node.textContent=text;
    return node;
  }
  function render(block,result,onExplore) {
    function explore(node,group) {
      if(!onExplore) return;
      node.setAttribute("role","button"); node.setAttribute("tabindex","0");
      node.setAttribute("aria-label","Explorer "+group.label+" · "+K.formatValue(group.value,result.kpi));
      node.classList.add("category-explore");
      node.addEventListener("click",event=>{event.stopPropagation(); onExplore(group,node);});
      node.addEventListener("keydown",event=>{
        event.stopPropagation();
        if(["Enter"," "].includes(event.key)){event.preventDefault();onExplore(group,node);}
      });
    }
    const wrap=el("div","category-chart"), data=C.distribution(result,block.groupBy);
    if(!data.column) { wrap.append(el("p","hint","Aucune colonne de catégorie disponible dans cette source.")); return wrap; }
    wrap.append(el("p","category-heading","Répartition par "+data.column.label));
    if(!data.groups.length) { wrap.append(el("p","hint","Aucune donnée à répartir.")); return wrap; }
    const ring=block.chartKind==="donut" && data.ring;
    if(block.chartKind==="donut" && !ring) wrap.append(el("p","hint",
      "Anneau disponible uniquement pour un montant ou un comptage positif, sans catégorie négative. Comparaison en barres ci-dessous."));
    if(ring) {
      const figure=svg("svg",{viewBox:"0 0 240 240",class:"donut-chart",role:"group",
        "aria-label":result.kpi.label+" par "+data.column.label+". Valeurs détaillées dans la légende."});
      let offset=0;
      data.groups.forEach((group,index)=>{
        const share=group.value/result.value*100;
        if(share>0) {
          const arc=svg("circle",{cx:120,cy:120,r:83,fill:"none",stroke:colors[index%colors.length],
            "stroke-width":32,pathLength:100,"stroke-dasharray":share+" "+(100-share),
            "stroke-dashoffset":-offset,transform:"rotate(-90 120 120)"});
          arc.append(svg("title",{},group.label+" : "+K.formatValue(group.value,result.kpi)+" · "+share.toLocaleString("fr-FR",{maximumFractionDigits:1})+" %"));
          explore(arc,group);
          figure.append(arc); offset+=share;
        }
      });
      figure.append(svg("text",{x:120,y:119,"text-anchor":"middle",class:"donut-total"},K.formatValue(result.value,result.kpi,true)),
        svg("text",{x:120,y:142,"text-anchor":"middle",class:"donut-caption"},"Total filtré"));
      wrap.append(figure);
    }
    const list=el("ul","category-list");
    const numbers=data.groups.map(group=>group.value).filter(Number.isFinite);
    const min=Math.min(0,...numbers), max=Math.max(0,...numbers), range=max-min || 1;
    for(const [index,group] of data.groups.entries()) {
      const item=el("li"), row=el("div","category-row"), heading=el("div","category-row-heading");
      explore(row,group);
      const label=el("span","category-label");
      const swatch=el("span","category-swatch"); swatch.style.background=colors[index%colors.length]; swatch.setAttribute("aria-hidden","true");
      label.append(swatch,el("span","",group.label));
      const value=K.formatValue(group.value,result.kpi);
      heading.append(label,el("strong","",value+(ring ? " · "+(group.value/result.value*100).toLocaleString("fr-FR",{maximumFractionDigits:1})+" %" : "")));
      row.append(heading);
      if(!ring && Number.isFinite(group.value)) {
        const track=el("div","category-track"); track.setAttribute("aria-hidden","true");
        const zero=el("span","category-zero"); zero.style.left=(-min/range*100)+"%";
        const bar=el("span","category-bar");
        bar.style.left=((Math.min(0,group.value)-min)/range*100)+"%"; bar.style.width=(Math.abs(group.value)/range*100)+"%"; bar.style.background=colors[index%colors.length];
        track.append(bar,zero); row.append(track);
      }
      row.append(el("span","category-count",group.count.toLocaleString("fr-FR")+" lignes · Cliquer pour explorer")); item.append(row); list.append(item);
    }
    wrap.append(list);
    if(!result.kpi.additive) wrap.append(el("p","hint","Chaque catégorie est recalculée sur ses lignes. Les taux, moyennes et nombres distincts ne s’additionnent pas."));
    return wrap;
  }
  root.CategoryCharts={render};
})(globalThis);
