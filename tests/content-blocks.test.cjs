const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../components/home_editor_frontend/content-blocks.js");
const L = require("../components/home_editor_frontend/layout.js");
const D = require("../components/home_editor_frontend/dashboards.js");
const layout = (...blocks) => L.normalize({version: 1, blocks});
const block = (type, extra = {}) => ({id: "a", type, row: 0, col: 0, span: 3, content: "Contenu personnalisé", ...extra});

test("les anciens titres et textes gardent leur contenu et leur position", () => {
  const title = layout(block("title")).blocks[0];
  assert.equal(title.type, "text");
  assert.equal(title.textStyle, "heading1");
  assert.equal(title.content, "Contenu personnalisé");
  assert.deepEqual([title.row, title.col, title.span], [0, 0, 3]);
  assert.equal(layout(block("text")).blocks[0].textStyle, "paragraph");
  assert.deepEqual(layout(title), {version: 1, blocks: [title]});
});

test("tous les nouveaux réglages survivent à un aller-retour JSON", () => {
  const samples = [
    block("text", {textStyle: "heading2", align: "center"}),
    block("separator", {content: "Section", lineStyle: "dotted", spacing: 40}),
    block("callout", {tone: "warning", heading: "À décider"}),
    block("table", {table: {columns: ["Sujet", "Date"], rows: [["Essai ; =1+1", "Mercredi"]]}}),
  ];
  for (const item of samples) {
    const first = layout(item);
    assert.ok(first);
    assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(first))), first);
  }
});

test("les collections existantes migrent sans changer les KPI, objectifs ou favoris", () => {
  const original = D.examples(123);
  const board = original.dashboards[0];
  board.favorite = true;
  const metric = board.layout.blocks.find((item) => item.type === "card");
  metric.target.value = 150;
  const result = D.normalize(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(result, original);
  assert.equal(result.dashboards[0].favorite, true);
  assert.equal(result.dashboards[0].layout.blocks.find((item) => item.id === metric.id).target.value, 150);
});

test("les tableaux malformés sont rejetés avant sauvegarde", () => {
  for (const table of [
    null, {}, {columns: [], rows: [[]]}, {columns: ["A"], rows: []},
    {columns: ["A"], rows: [["a", "b"]]}, {columns: ["A"], rows: [[42]]},
    {columns: Array(7).fill("A"), rows: [Array(7).fill("")]},
    {columns: ["A"], rows: Array.from({length: 21}, () => [""])},
  ]) assert.equal(layout(block("table", {table})), null);
  assert.ok(layout(block("table", {table: {columns: Array(6).fill("A"), rows: Array.from({length: 20}, () => Array(6).fill(""))}})));
});

test("les valeurs de présentation sont bornées et les cellules limitées", () => {
  assert.deepEqual(B.normalize({type: "text", textStyle: "<script>", align: "evil"}), {textStyle: "paragraph", align: "left"});
  assert.equal(B.normalize({type: "callout", tone: "__proto__", heading: "x".repeat(200)}).tone, "info");
  assert.equal(B.normalize({type: "callout", heading: "x".repeat(200)}).heading.length, 120);
  assert.deepEqual(B.normalize({type: "separator", lineStyle: "url(evil)", spacing: -1}), {lineStyle: "solid", spacing: 24});
  assert.equal(B.normalizeTable({columns: ["A"], rows: [["x".repeat(300)]]}).rows[0][0].length, 240);
});

test("chaque tableau manuel possède ses propres cellules", () => {
  const a = layout(block("manualTable")).blocks[0];
  const b = layout(block("manualTable", {id: "b"})).blocks[0];
  a.table.rows[0][0] = "Personnalisé";
  assert.notEqual(b.table.rows[0][0], a.table.rows[0][0]);
  const copy = layout({...a, id: "copy"}).blocks[0];
  copy.table.rows[0][0] = "Copie modifiée";
  assert.equal(a.table.rows[0][0], "Personnalisé");
});

test("dupliquer cherche une case libre en conservant la largeur, y compris à la limite", () => {
  const source = block("table", {span: 4});
  assert.deepEqual(L.duplicatePlacement([source], source), {row: 1, col: 0, span: 4});
  const last = block("table", {row: 99, span: 6});
  assert.deepEqual(L.duplicatePlacement([last], last), {row: 0, col: 0, span: 6});
  const full = Array.from({length: 100}, (_, row) => block("table", {id: String(row), row, span: 6}));
  assert.equal(L.duplicatePlacement(full, full[0]), null);
});

test("les nouveaux blocs restent soumis aux collisions et aux limites de grille", () => {
  for (const type of ["table", "separator", "callout"]) {
    assert.equal(layout(block(type), block("text", {id: "b", col: 2})), null);
    assert.equal(layout(block(type, {row: 100})), null);
    assert.equal(layout(block(type, {col: 5, span: 2})), null);
  }
});

test("un ancien chiffre exemple personnalisé n'est pas remplacé par une carte", () => {
  const result = D.normalizeBoard({id: "old", name: "Ancien", example: true, layout: {version: 1,
    blocks: [block("text", {id: "overview-volume", content: "Mon commentaire conservé"})]}});
  assert.equal(result.layout.blocks[0].type, "text");
  assert.equal(result.layout.blocks[0].content, "Mon commentaire conservé");
});
