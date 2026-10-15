const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../components/home_editor_frontend/report-blocks.js');
const L = require('../components/home_editor_frontend/layout.js');
const D = require('../components/home_editor_frontend/dashboards.js');

test('repli des sections sans mutation, y compris sections consécutives et vides', () => {
  const blocks = [{id:'intro',type:'text',row:0}, {id:'a',type:'section',row:1},
    {id:'action',type:'actionPlan',row:2}, {id:'b',type:'section',row:4},
    {id:'c',type:'section',row:5}, {id:'chart',type:'chart',row:6}, {id:'empty',type:'section',row:7}];
  const saved = JSON.stringify(blocks);
  assert.deepEqual([...R.visibleRows(blocks, b => b.id === 'a')], [[0,0],[1,1],[4,2],[5,3],[6,4],[7,5]]);
  assert.equal(R.visibleRows(blocks, () => false).size, 8);
  assert.equal(JSON.stringify(blocks), saved);
  assert.equal(R.visibleRows(blocks.filter(b=>b.id!=='a'), () => false).has(2), true);
});

test('actions : statuts, dates réelles, limites et identifiants uniques', () => {
  const action = {id:'one',title:'Valider',owner:'Équipe',due:'2028-02-29',status:'doing',priority:'normal'};
  assert.deepEqual(R.normalize({type:'actionPlan',actions:[action]}).actions,[{...action,columnId:"doing",details:"",tone:"info"}]);
  assert.equal(R.normalize({type:'actionPlan',actions:[{...action,due:'2026-02-29'}]}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:[action,action]}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:Array.from({length:51},(_,i)=>({...action,id:String(i)}))}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:[{...action,status:'unknown'}]}).actions[0].status,'todo');
  assert.deepEqual(R.normalize({type:'actionPlan'}),{columns:[{id:'todo',title:'À faire'},{id:'doing',title:'En cours'}],actions:[]});
});

test('nouveaux blocs : sauvegarde, duplication indépendante et dimensions', () => {
  const section={id:'s',type:'section',row:0,col:0,span:6,content:'Décisions',subtitle:'Sous-titre',collapsed:true};
  const action={id:'p',type:'actionPlan',row:1,col:0,span:3,actions:[{id:'a',title:'Action',owner:'Projet',due:'',status:'done'}]};
  const divider={id:'v',type:'verticalSeparator',row:1,col:3,span:1,lineStyle:'dotted'};
  const layout=L.normalize({version:1,blocks:[section,action,divider]});
  assert.ok(layout);
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(layout))),layout);
  assert.equal(L.normalize({version:1,blocks:[{...section,span:3}]}),null);
  assert.equal(L.normalize({version:1,blocks:[{...divider,span:2}]}),null);
  assert.equal(L.duplicatePlacement(layout.blocks,section).col,0);
  const copy=JSON.parse(JSON.stringify(layout.blocks[1])); copy.actions[0].status='todo';
  assert.equal(layout.blocks[1].actions[0].status,'done');
  for(const board of D.examples().dashboards) assert.ok(D.normalizeBoard(board));
});


test('priorités héritées, retards et filtres combinés sans changer la progression globale', () => {
  const actions = R.normalize({type:'actionPlan',actions:[
    {id:'a',due:'2026-10-14',owner:'Projet',status:'doing',priority:'high'},
    {id:'b',due:'2026-10-14',owner:'Projet',status:'done'},
    {id:'c',due:'2026-10-15',owner:'Ventes',status:'todo',priority:'bad'}
  ]}).actions;
  assert.equal(actions[2].priority,'normal');
  assert.deepEqual(R.filterActions(actions,{late:true},'2026-10-15').map(a=>a.id),['a']);
  assert.equal(R.filterActions(actions,{owner:'Projet',status:'done'},'2026-10-15').length,1);
  assert.equal(R.filterActions(actions,{priority:'high',owner:'Ventes'}).length,0);
  assert.equal(R.overdue(actions[2],'2026-10-15'),false);
});

test('insérer et déplacer une ligne conserve tous les blocs, les largeurs et la validation', () => {
  const blocks = [{id:'a',type:'text',row:0,col:0,span:2}, {id:'b',type:'text',row:0,col:2,span:4},
    {id:'s',type:'section',row:1,col:0,span:6}, {id:'c',type:'text',row:2,col:0,span:3}];
  const original=JSON.stringify(blocks);
  assert.deepEqual(L.insertRow(blocks,1).map(b=>b.row),[0,0,2,3]);
  const moved=L.moveRow(blocks,0,2);
  assert.deepEqual(moved.map(b=>b.row),[2,2,0,1]);
  assert.ok(L.normalize({version:1,blocks:moved}));
  assert.deepEqual(L.moveRow(moved,2,0),blocks);
  assert.equal(JSON.stringify(blocks),original);
  assert.equal(L.insertRow([{...blocks[0],row:99}],0),null);
  assert.equal(L.moveRow(blocks,0,100),null);
  assert.equal(L.insertRow(blocks,-1),null);
});

test('annotations : validation, bornes temporelles et conservation après sauvegarde', () => {
  const A=require('../components/home_editor_frontend/chart-annotations.js');
  const notes=[{id:'launch',date:'2026-10-14',text:'Lancement <script>'}];
  assert.deepEqual(A.normalize(undefined),[]);
  assert.equal(A.normalize([{...notes[0],date:'2026-02-30'}]),null);
  assert.equal(A.normalize([...notes,...notes]),null);
  assert.equal(A.normalize(Array.from({length:31},(_,i)=>({...notes[0],id:String(i)}))),null);
  assert.deepEqual(A.markers(notes,[{start:'2026-10-01',end:'2026-10-14'},{start:'2026-10-15',end:'2026-10-31'}]),[notes,[]]);
  const saved=L.normalize({version:1,blocks:[{id:'graph',type:'chart',row:0,col:0,span:6,annotations:notes}]});
  assert.deepEqual(saved.blocks[0].annotations,notes);
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(saved))),saved);
});


test('fusion des encadrés : titre, texte et badge préservés, migration idempotente', () => {
  const raw={version:1,blocks:[{id:'old',type:'callout',row:0,col:0,span:1,heading:'Décider',content:'Texte personnalisé\nDeuxième ligne',tone:'warning'}]};
  const saved=L.normalize(raw),block=saved.blocks[0];
  assert.equal(block.type,'actionPlan'); assert.equal(block.columns.length,1);
  assert.equal(block.actions[0].title,'Décider'); assert.equal(block.actions[0].details,raw.blocks[0].content);
  assert.equal(block.actions[0].tone,'warning');assert.deepEqual(L.normalize(saved),saved);
});

test('colonnes bornées à la largeur, réduction sans perte et déplacement indépendant du statut', () => {
  const P=require('../components/home_editor_frontend/postit-board.js');
  const raw={type:'actionPlan',span:3,actions:[{id:'a',title:'A',status:'todo'},{id:'b',title:'B',status:'doing'},{id:'c',title:'C',status:'done'}]};
  const board={...raw,...R.normalize(raw)};
  assert.equal(board.columns.length,3);
  assert.equal(board.actions[2].columnId,'done');
  const reduced=P.fit({...board,span:1});
  assert.equal(reduced.columns.length,1);assert.equal(reduced.actions.length,3);
  assert.ok(reduced.actions.every(a=>a.columnId==='todo'));assert.equal(reduced.actions[2].status,'done');
  assert.equal(P.fit({...board,span:6},6).columns.length,6);
  const moved=P.move(board,'a','doing');assert.equal(moved[0].columnId,'doing');assert.equal(board.actions[0].columnId,'todo');
  assert.equal(P.move(board,'a','unknown'),null);
  assert.equal(R.normalize({...raw,columns:[{id:'a',title:'A'},{id:'a',title:'B'}]}),null);
  assert.equal(R.normalize({...raw,columns:[]}),null);
  assert.equal(R.normalize({...raw,columns:Array.from({length:7},(_,i)=>({id:String(i),title:'X'}))}),null);
});
