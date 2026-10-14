const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../components/home_editor_frontend/filters.js");
const K = require("../components/home_editor_frontend/data.js");
const L = require("../components/home_editor_frontend/layout.js");
const model = K.createModel("2026-10-14");
const sales = K.tableDefinition("sales");
const filter = (column, op, value) => ({column, op, value});
test("validation typée et rejet des filtres incohérents", () => {
  assert.deepEqual(F.normalize([filter("montant_ht", "gte", "1 000,50")], sales), [filter("montant_ht", "gte", 1000.5)]);
  for (const item of [filter("unknown", "eq", "a"), filter("date", "eq", "2026-02-30"),
    filter("montant_ht", "contains", "1"), filter("montant_ht", "gte", ""), filter("montant_ht", "eq", Infinity),
    filter("client", "eq", " "), null]) assert.equal(F.normalize([item], sales), null);
  assert.equal(F.normalize(Array(21).fill(filter("client", "eq", "a")), sales), null);
});
test("ET, accents, casse et valeurs manquantes", () => {
  const rows = [{client:"Équipe", montant_ht:20}, {client:"EQUIPE", montant_ht:2}, {client:null, montant_ht:30}];
  assert.deepEqual(F.apply(rows, [filter("client","contains","equi"),filter("montant_ht","gte",10)], sales), [rows[0]]);
  assert.deepEqual(F.apply(rows,[filter("client","empty","")],sales),[rows[2]]);
  assert.equal(F.apply(rows,[filter("client","ne","autre")],sales).length,2);
});
test("calcul, détail, série et CSV partagent le périmètre filtré", () => {
  const filters = [filter("region","eq","Bretagne"), filter("montant_ht","gte",1000)];
  const expected = model.source("sales","months3").rows.filter(r => r.region === "Bretagne" && r.montant_ht >= 1000 && r.statut === "Gagnée");
  const amount = expected.reduce((n,r)=>n+r.montant_ht,0);
  const cost = expected.reduce((n,r)=>n+r.cout_ht,0);
  const revenue = model.evaluate("revenue","months3",filters);
  assert.ok(expected.length);
  assert.deepEqual(revenue.rows,expected);
  assert.equal(revenue.value,amount);
  assert.equal(model.evaluate("sales_count","months3",filters).value,expected.length);
  assert.equal(model.evaluate("average_basket","months3",filters).value,amount/expected.length);
  assert.equal(model.evaluate("margin","months3",filters).value,(amount-cost)/amount*100);
  assert.ok(Math.abs(revenue.series.reduce((n,p)=>n+p.value,0)-amount)<0.000001);
  assert.equal(K.toCsv(revenue.table,revenue.rows).split("\r\n").length,expected.length+2);
  assert.notEqual(model.evaluate("revenue","months3").value,revenue.value);
  assert.strictEqual(model.evaluate("revenue","months3",filters),revenue);
});
test("distincts et ratios restent recalculés, et les résultats vides sont explicites", () => {
  const filters=[filter("equipe","eq","Nord")];
  const rows=model.source("operations","rolling12",filters).rows;
  assert.equal(model.evaluate("projects_count","rolling12",filters).value,new Set(rows.filter(r=>r.statut!=="Annulée").map(r=>r.projet)).size);
  const delivered=rows.filter(r=>r.statut==="Livrée");
  assert.equal(model.evaluate("on_time","rolling12",filters).value,100*delivered.filter(r=>r.date<=r.date_echeance).length/delivered.length);
  const impossible=[filter("client","eq","inexistant")];
  assert.equal(model.evaluate("revenue","week1",impossible).value,0);
  assert.equal(model.evaluate("average_basket","week1",impossible).value,null);
  assert.throws(()=>model.evaluate("revenue","week1",filters),/Filtres invalides/);
});
test("tri numérique stable, non mutatif et pagination après tri", () => {
  const rows=[{montant_ht:10,id:1},{montant_ht:null,id:2},{montant_ht:2,id:3},{montant_ht:10,id:4}];
  assert.deepEqual(F.sorted(rows,{column:"montant_ht",direction:"asc"},sales).map(r=>r.id),[3,1,4,2]);
  assert.deepEqual(F.sorted(rows,{column:"montant_ht",direction:"desc"},sales).map(r=>r.id),[1,4,3,2]);
  assert.deepEqual(rows.map(r=>r.id),[1,2,3,4]);
  const many=Array.from({length:23},(_,i)=>i);
  assert.deepEqual(F.page(many,1,10).rows,many.slice(10,20));
  assert.deepEqual(F.page(many,99,10),{rows:[20,21,22],index:2,pages:3,total:23});
  assert.deepEqual(F.page([],0,10),{rows:[],index:0,pages:1,total:0});
});
test("sauvegarde des réglages et migration des anciennes tables sans perte", () => {
  const block={id:"a",type:"table",row:0,col:0,span:6,content:"Sources",sourceId:"sales",pageSize:25,
    filters:[filter("region","eq","Bretagne")],sort:{column:"montant_ht",direction:"asc"}};
  const layout=L.normalize({version:1,blocks:[block]});
  assert.ok(layout);
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(layout))),layout);
  assert.deepEqual(layout.blocks[0].filters,block.filters);
  assert.equal(layout.blocks[0].pageSize,25);
  const old={...block,sourceId:undefined,table:{columns:["Décision"],rows:[["Préserver"]]}};
  const migrated=L.normalize({version:1,blocks:[old]}).blocks[0];
  assert.equal(migrated.type,"manualTable");
  assert.deepEqual(migrated.table,old.table);
  assert.equal(L.normalize({version:1,blocks:[{...block,filters:[filter("equipe","eq","Nord")]}]}),null);
});
