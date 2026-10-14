/* Périmètre du rapport et comparaison sans division par zéro. */
(function(root) {
  "use strict";
  const K=typeof module!=="undefined"&&module.exports?require("./data.js"):root.KPIData;
  const F=typeof module!=="undefined"&&module.exports?require("./filters.js"):root.KPIFilters;
  function normalizeFilters(raw) {
    if(raw===undefined) return {};
    if(!raw || typeof raw!=="object" || Array.isArray(raw)) return null;
    const result={};
    for(const [id,filters] of Object.entries(raw)) {
      if(!K.TABLES.some(table=>table.id===id)) return null;
      const valid=F.normalize(filters,K.tableDefinition(id));
      if(!valid) return null;
      if(valid.length) result[id]=valid;
    }
    return result;
  }
  function sourceId(block) {
    return ["card","chart"].includes(block.type)?K.definition(block.kpiId).table:block.type==="table"?block.sourceId:null;
  }
  const filtersFor=(board,block)=>board?.globalFilters?.[sourceId(block)] || [];
  function comparison(current,previous) {
    if(!current.rows.length || !previous.rows.length || !Number.isFinite(current.value) || !Number.isFinite(previous.value))
      return {delta:null,percent:null};
    const delta=current.value-previous.value;
    return {delta,percent:previous.value===0?null:100*delta/Math.abs(previous.value)};
  }
  const api={normalizeFilters,sourceId,filtersFor,comparison};
  if(typeof module!=="undefined"&&module.exports) module.exports=api; else root.ReportAnalysis=api;
})(globalThis);
