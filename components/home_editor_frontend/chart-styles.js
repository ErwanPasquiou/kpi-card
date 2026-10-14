/* Géométrie des séries : ne pas relier les observations manquantes. */
(function(root) {
  "use strict";
  const KINDS = [["bar","Barres"],["line","Courbe"],["area","Aire"],["step","Paliers"],["dots","Points"]];
  const normalize = (kind) => KINDS.some(([id]) => id === kind) ? kind : "bar";
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
  const api={KINDS,normalize,paths};
  if(typeof module !== "undefined" && module.exports) module.exports=api;
  else root.ChartStyles=api;
})(globalThis);
