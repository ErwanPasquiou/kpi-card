/* Géométrie des séries : ne pas relier les observations manquantes. */
(function(root) {
  "use strict";
  const KINDS = [["bar","Barres"],["line","Courbe"],["area","Aire"],["step","Paliers"],["dots","Points"],["donut","Anneau"],["horizontal","Barres horizontales"]];
  const normalize = (kind) => KINDS.some(([id]) => id === kind) ? kind : "bar";
  const categorical = (kind) => ["donut", "horizontal"].includes(kind);
  const dimensions = (table) => table.columns.filter((column) => column.kind === "text");
  function dimension(table, key) {
    const columns = dimensions(table);
    return columns.find((column) => column.key === key) || columns.find((column) => !column.key.endsWith("_id")) || columns[0];
  }
  function distribution(result, key, limit = 8) {
    const column = dimension(result.table, key);
    if (!column) return {column: null, groups: [], ring: false};
    const buckets = new Map();
    for (const row of result.rows) {
      const value = row[column.key];
      const bucket = value == null || value === "" ? null : String(value);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(row);
    }
    let groups = [...buckets].map(([key, rows]) => ({label: key === null ? "Non renseigné" : key,
      value: result.kpi.calculate(rows), count: rows.length, rows}));
    const eligible = groups.every((group) => Number.isFinite(group.value) && group.value >= 0);
    groups.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.label.localeCompare(b.label, "fr"));
    if (groups.length > limit) {
      const rest = groups.slice(limit - 1), rows = rest.flatMap((group) => group.rows);
      groups = [...groups.slice(0, limit - 1), {label: "Autres (" + rest.length + " catégories)",
        value: result.kpi.calculate(rows), count: rows.length, rows}];
    }
    const ring = result.kpi.additive === true && eligible && groups.length > 0 &&
      groups.every((group) => Number.isFinite(group.value) && group.value >= 0) && result.value > 0;
    return {column, groups, ring};
  }
  function paths(series, kind, xAt, yAt, baseline) {
    const segments = [];
    let segment = [];
    for (let index = 0; index < series.length; index++) {
      const value = series[index].value;
      if (!Number.isFinite(value)) { if (segment.length) segments.push(segment); segment = []; }
      else segment.push({x:xAt(index), y:yAt(value)});
    }
    if (segment.length) segments.push(segment);
    return segments.map((points) => {
      const first=points[0], last=points[points.length-1];
      const stroke=points.map((point,index) => index ?
        kind === "step" ? `H${point.x} V${point.y}` : `L${point.x} ${point.y}` :
        `M${point.x} ${point.y}`).join(" ");
      return {stroke, area: `${stroke} L${last.x} ${baseline} L${first.x} ${baseline} Z`};
    });
  }
  const api={KINDS,normalize,paths,categorical,dimensions,dimension,distribution};
  if(typeof module !== "undefined" && module.exports) module.exports=api;
  else root.ChartStyles=api;
})(globalThis);
