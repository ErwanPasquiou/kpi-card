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
  const action = {id:'one',title:'Valider',owner:'Équipe',due:'2028-02-29',status:'doing'};
  assert.deepEqual(R.normalize({type:'actionPlan',actions:[action]}).actions,[action]);
  assert.equal(R.normalize({type:'actionPlan',actions:[{...action,due:'2026-02-29'}]}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:[action,action]}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:Array.from({length:51},(_,i)=>({...action,id:String(i)}))}),null);
  assert.equal(R.normalize({type:'actionPlan',actions:[{...action,status:'unknown'}]}).actions[0].status,'todo');
  assert.deepEqual(R.normalize({type:'actionPlan'}),{actions:[]});
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
