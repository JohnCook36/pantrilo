import assert from 'node:assert/strict';
import test from 'node:test';
import { cheapestPacks, calculateBudget } from '../src/budget.ts';
import type { Ingredient, Recipe, MealAssignment, PriceSnapshot } from '../src/types.ts';
const ingredients:Ingredient[]=[{id:'rice',name:'Рис',unit:'g',allergens:[]}];
const recipe:Recipe={id:'rice',version:1,name:'Рис',mealTypes:['lunch'],ingredients:[{ingredientId:'rice',amount:350}],equipment:['stove'],allergens:[],tags:[]};
const prices:PriceSnapshot={id:'test',region:'X',observedOn:'2026-11-19',packs:[{id:'800',ingredientId:'rice',quantity:800,priceKopecks:8800,source:'estimate'},{id:'1000',ingredientId:'rice',quantity:1000,priceKopecks:11000,source:'estimate'}]};
const assignments:MealAssignment[]=[{slot:{id:'mon',mealType:'lunch',portions:2},recipe}];
test('chooses cheapest whole package, not required-gram cost',()=>{
 const p=cheapestPacks(500,prices.packs); assert.equal(p.bought,800); assert.equal(p.cost,8800);
});
test('finds non-greedy optimal package combination',()=>{
 const p=cheapestPacks(1100,[{id:'a',ingredientId:'rice',quantity:600,priceKopecks:5000,source:'estimate'},{id:'b',ingredientId:'rice',quantity:1000,priceKopecks:9000,source:'estimate'}]);
 assert.equal(p.bought,1200); assert.equal(p.cost,10000);
});
test('aggregates ingredients, pantry, extras and reserve',()=>{
 const result=calculateBudget({assignments,ingredients,prices,pantry:[{ingredientId:'rice',quantity:200}],extras:[{id:'choc',name:'Chocolate',priceKopecks:12000}],budgetKopecks:30000,reserveKopecks:3000});
 assert.deepEqual(result.lines.map(x=>[x.required,x.fromPantry,x.toBuy,x.bought,x.priceKopecks]),[[700,200,500,800,8800]]);
 assert.equal(result.totalWithReserveKopecks,23800); assert.equal(result.withinBudget,true);
});
test('flags overspending instead of claiming success',()=>{
 const result=calculateBudget({assignments,ingredients,prices,budgetKopecks:5000}); assert.equal(result.withinBudget,false);
});
test('missing prices throw instead of silently costing zero',()=>{
 assert.throws(()=>calculateBudget({assignments,ingredients,prices:{...prices,packs:[]},budgetKopecks:100000}),/Missing package prices/);
});
test('validates negative and duplicate pantry amounts',()=>{
 assert.throws(()=>calculateBudget({assignments,ingredients,prices,pantry:[{ingredientId:'rice',quantity:-3}],budgetKopecks:100000}),/non-negative/);
 assert.throws(()=>calculateBudget({assignments,ingredients,prices,pantry:[{ingredientId:'rice',quantity:3},{ingredientId:'rice',quantity:4}],budgetKopecks:100000}),/Invalid pantry/);
});
test('using pantry can eliminate all purchases',()=>{
 const result=calculateBudget({assignments,ingredients,prices,pantry:[{ingredientId:'rice',quantity:800}],budgetKopecks:0});
 assert.equal(result.ingredientsCostKopecks,0); assert.equal(result.lines[0]?.bought,0);
});
