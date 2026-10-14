const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../components/home_editor_frontend/filters.js");
const K = require("../components/home_editor_frontend/data.js");
const L = require("../components/home_editor_frontend/layout.js");
const model = K.createModel("2026-10-14");
const sales = K.tableDefinition("sales");

test("répartition filtrée par région et produit : conservation des montants", () => {
  const C=require("../components/home_editor_frontend/chart-styles.js");
  const result=model.evaluate("revenue","months3",[filter("quantite","gte",3)]);
  for(const key of ["region","produit"]) {
    const split=C.distribution(result,key);
    assert.equal(split.column.key,key);
    assert.ok(split.ring);
    assert.ok(Math.abs(split.groups.reduce((sum,g)=>sum+g.value,0)-result.value)<0.000001);
    for(const group of split.groups) assert.equal(group.value,result.rows.filter(r=>r[key]===group.label).reduce((sum,r)=>sum+r.montant_ht,0));
  }
});
test("répartition non additive : taux et distincts recalculés par équipe", () => {
  const C=require("../components/home_editor_frontend/chart-styles.js");
  for(const id of ["on_time","projects_count"]) {
    const result=model.evaluate(id,"months3");
    const split=C.distribution(result,"equipe");
    assert.equal(split.ring,false);
    for(const group of split.groups) assert.equal(group.value,result.kpi.calculate(result.rows.filter(r=>r.equipe===group.label)));
  }
});
test("Autres recalcule sa moyenne, et les anneaux refusent négatifs, vides et zéros", () => {
  const C=require("../components/home_editor_frontend/chart-styles.js");
  const table={columns:[{key:"g",kind:"text",label:"Groupe"}]};
  const rows=[{g:"A",v:100},{g:"B",v:40},{g:"C",v:20},{g:"C",v:0},{g:null,v:0}];
  const kpi={calculate:rs=>rs.length?rs.reduce((n,r)=>n+r.v,0)/rs.length:null};
  const split=C.distribution({table,rows,kpi,value:32},"g",2);
  assert.equal(split.groups[1].value,15);
  assert.equal(split.groups[1].count,4);
  const sum={additive:true,calculate:rs=>rs.reduce((n,r)=>n+r.v,0)};
  assert.equal(C.distribution({table,rows:[],kpi:sum,value:0},"g").ring,false);
  assert.equal(C.distribution({table,rows:[{g:"A",v:0}],kpi:sum,value:0},"g").ring,false);
  assert.equal(C.distribution({table,rows:[{g:"A",v:10},{g:"B",v:-2}],kpi:sum,value:8},"g").ring,false);
  assert.equal(C.distribution({table,rows:[{g:"A",v:10}],kpi:sum,value:10},"g").ring,true);
});
test("dimension enregistrée, migration et changement de source sûrs", () => {
  const make=(extra)=>L.normalize({version:1,blocks:[{id:"split",type:"chart",row:0,col:0,span:3,kpiId:"revenue",chartKind:"donut",groupBy:"region",...extra}]});
  const saved=make({});
  assert.equal(saved.blocks[0].groupBy,"region");
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(saved))),saved);
  assert.notEqual(make({kpiId:"on_time",chartKind:"horizontal"}).blocks[0].groupBy,"region");
  assert.ok(make({groupBy:undefined}));
});

test("sélection multiple : OU entre valeurs, ET entre colonnes et cache distinct", () => {
  const selection=[filter("region","in",["Bretagne","Occitanie"]),filter("quantite","gte",3)];
  const expected=model.source("sales","months3").rows.filter(r=>["Bretagne","Occitanie"].includes(r.region)&&r.quantite>=3&&r.statut==="Gagnée");
  const result=model.evaluate("revenue","months3",selection);
  assert.deepEqual(result.rows,expected);
  assert.equal(result.value,expected.reduce((total,row)=>total+row.montant_ht,0));
  assert.notEqual(result,model.evaluate("revenue","months3",[filter("region","in",["Bretagne"])]));
  const saved=L.normalize({version:1,blocks:[{id:"multi",type:"card",row:0,col:0,span:2,kpiId:"revenue",filters:selection}]});
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(saved))),saved);
  assert.deepEqual(F.normalize([filter("quantite","in",["2","3,5"])],sales)[0].value,[2,3.5]);
  for(const value of [[],null,["Bretagne",null],Array(501).fill("Bretagne")])
    assert.equal(F.normalize([filter("region","in",value)],sales),null);
  assert.deepEqual(F.apply([{region:null},{region:"Bretagne"},{region:"Occitanie"}],[filter("region","notIn",["bretagne"])],sales),[{region:"Occitanie"}]);
});
test("détection indépendante des noms et priorité au schéma explicite", () => {
  const rows=[{prix:2,jour:"2026-10-14",code:"001",mix:3,vide:null},{prix:10,jour:"2026-10-13",code:"002",mix:"n/a",vide:""}];
  const inferred=F.resolveTable({id:"nouvelle"},rows);
  assert.deepEqual(inferred.columns.map(c=>[c.key,c.kind]),[["prix","number"],["jour","date"],["code","text"],["mix","text"],["vide","text"]]);
  assert.equal(F.inferKind(["2026-02-30"]),"text");
  assert.equal(F.inferKind([NaN,Infinity]),"text");
  assert.equal(F.resolveTable({columns:[{key:"jour",kind:"text"}]},rows).columns[0].kind,"text");
  assert.deepEqual(F.apply(rows,[filter("prix","in",[2])],inferred),[rows[0]]);
  assert.ok(F.operators(inferred.columns[1]).includes("gte"));
  assert.ok(!F.operators(inferred.columns[0]).includes("contains"));
  assert.deepEqual(F.values(rows,inferred.columns[0]),[2,10]);
  assert.deepEqual(F.values([{code:"Équipe"},{code:"equipe"},{code:null},{code:"Autre"}],{key:"code",kind:"text"}),["Autre","equipe"]);
});
test("source sans type déclaré : détection active dans le modèle et les calculs", () => {
  const column=sales.columns.find(c=>c.key==="quantite"), previous=column.kind;
  try {
    delete column.kind;
    assert.equal(model.source("sales","week1").table.columns.find(c=>c.key==="quantite").kind,"number");
    assert.equal(K.tableDefinition("sales").columns.find(c=>c.key==="quantite").kind,"number");
    const filtered=model.evaluate("sales_count","week1",[filter("quantite","in",[2,3])]);
    assert.ok(filtered.rows.every(row=>[2,3].includes(row.quantite)));
  } finally { column.kind=previous; }
});
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
