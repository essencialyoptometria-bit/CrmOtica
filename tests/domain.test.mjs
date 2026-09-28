import test from 'node:test';import assert from 'node:assert/strict';
import {activeCount,alertsFor,metrics,weekStart,dayBR,dailyGoal} from '../public/domain.js';
import {makeSession,validSession} from '../server/auth.mjs';
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
test('sessão rejeita adulteração e expiração',()=>{const key='a'.repeat(64),token=makeSession(key,1000);assert.ok(validSession(token,key,2000));assert.equal(validSession(token+'x',key,2000),false);assert.equal(validSession(token,key,1000+12*3600000),false);assert.equal(validSession(token,'wrong',2000),false);});
