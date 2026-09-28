import test from 'node:test';import assert from 'node:assert/strict';
import {activeCount,alertsFor,metrics,weekStart,dayBR,dailyGoal} from '../public/domain.js';
import {seal,unseal} from '../server/auth.mjs';
const make=()=>({clients:[],contacts:[],tasks:[],sales:[],appointments:[],investments:[],settings:{hour:18},goals:['Nova Olímpia','Tapira'].map(store=>({store,effective:'2026-09-01',createdAt:'2026-09-01T12:00:00Z',daily:10}))});
test('meta deduplica por cliente, dia e loja; anúncios e fim de semana ficam fora',()=>{
 const contacts=[{clientId:'a',store:'Tapira',date:'2026-09-21',source:'Prospecção ativa'},{clientId:'a',store:'Tapira',date:'2026-09-21',source:'Prospecção ativa'},{clientId:'a',store:'Tapira',date:'2026-09-22',source:'Prospecção ativa'},{clientId:'b',store:'Tapira',date:'2026-09-21',source:'Anúncio patrocinado'},{clientId:'c',store:'Tapira',date:'2026-09-26',source:'Prospecção ativa'},{clientId:'d',store:'Nova Olímpia',date:'2026-09-21',source:'Prospecção ativa'}];
 assert.equal(activeCount(contacts,'Tapira','2026-09-21','2026-09-27'),2);assert.equal(activeCount(contacts,'','2026-09-21','2026-09-27'),3);
});
test('alerta usa últimos 3 dias úteis fechados e preserva metas históricas',()=>{
 const d=make();assert.deepEqual(alertsFor(d,'2026-09-28',10)[0].days,['2026-09-23','2026-09-24','2026-09-25']);
 d.goals.push({store:'Tapira',effective:'2026-09-29',createdAt:'2026-09-28T20:00:00Z',daily:20});assert.equal(dailyGoal(d,'Tapira','2026-09-25'),10);assert.equal(dailyGoal(d,'Tapira','2026-09-29'),20);
 for(let i=0;i<10;i++)d.contacts.push({clientId:String(i),store:'Tapira',date:'2026-09-25',source:'Prospecção ativa'});
 assert.equal(alertsFor(d,'2026-09-28',10).length,1);
});
test('não dispara alerta retroativo antes da implantação',()=>{const d=make();d.goals.forEach(g=>g.effective='2026-09-28');assert.equal(alertsFor(d,'2026-09-29',20).length,0);assert.equal(alertsFor(d,'2026-09-30',20).length,2);});
test('receitas são exclusivas por origem e investimento é rateado',()=>{
 const d=make();d.sales=[{store:'Tapira',date:'2026-09-22',source:'Anúncio patrocinado',value:600},{store:'Tapira',date:'2026-09-23',source:'Prospecção ativa',value:400},{store:'Nova Olímpia',date:'2026-09-22',source:'Anúncio patrocinado',value:999}];
 d.investments=[{store:'Tapira',start:'2026-09-21',end:'2026-09-30',value:1000}];
 const m=metrics(d,'Tapira','2026-09-21','2026-09-25','2026-09-25');assert.equal(m.revenue,1000);assert.equal(m.spend,500);assert.equal(m.roas,1.2);assert.equal(m.activeRevenue,400);assert.equal(m.adsRevenue,600);
});
test('datas usam Brasília e semana começa na segunda',()=>{assert.equal(dayBR(new Date('2026-09-28T01:30:00Z')),'2026-09-27');assert.equal(weekStart('2026-09-27'),'2026-09-21');});
test('sessão é cifrada, rejeita adulteração e expira',()=>{const key='a'.repeat(64),token=seal({access_token:'access-secreto',refresh_token:'refresh-secreto',expires_at:9999},key,10000);assert.equal(unseal(token,key,2000).access_token,'access-secreto');assert.equal(token.includes('access-secreto'),false);assert.equal(unseal(token.slice(0,-4)+'abcd',key,2000),null);assert.equal(unseal(token,key,10000),null);assert.equal(unseal(token,'wrong',2000),null);});
test('filtro por data é inclusivo, combinado com loja e funciona para último óculos',async()=>{const {filterClients}=await import('../public/domain.js');const clients=[{id:'1',name:'Ana',phone:'1',store:'Tapira',acquired:'2026-09-01',lastGlasses:'2024-01-10'},{id:'2',name:'Bia',phone:'2',store:'Nova Olímpia',acquired:'2026-09-15',lastGlasses:null},{id:'3',name:'Clara',phone:'3',store:'Tapira',acquired:'2026-09-28',lastGlasses:'2025-04-01'}];assert.deepEqual(filterClients(clients,{dateField:'acquired',from:'2026-09-15',to:'2026-09-28'}).map(c=>c.id),['2','3']);assert.deepEqual(filterClients(clients,{store:'Tapira',dateField:'lastGlasses',to:'2024-12-31'}).map(c=>c.id),['1']);assert.equal(filterClients(clients,{dateField:'lastGlasses',from:'2020-01-01'}).length,2);assert.equal(filterClients(clients).length,3);});
