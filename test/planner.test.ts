import assert from 'node:assert/strict';
import test from 'node:test';
import { planMenu, NoFeasiblePlanError } from '../src/planner.ts';
import type { Ingredient, Recipe, PriceSnapshot, DietaryProfile, MealSlot } from '../src/types.ts';
const ingredients:Ingredient[]=[
 {id:'rice',name:'Rice',unit:'g',allergens:[]},
 {id:'peanut',name:'Peanut',unit:'g',allergens:['nuts']},
 {id:'oats',name:'Oats',unit:'g',allergens:[]}
];
const recipes:Recipe[]=[
 {id:'rice',version:1,name:'Rice',mealTypes:['lunch','dinner'],ingredients:[{ingredientId:'rice',amount:300}],equipment:['stove'],allergens:[],tags:['simple']},
 {id:'peanut',version:1,name:'Peanut rice',mealTypes:['lunch','dinner'],ingredients:[{ingredientId:'rice',amount:200},{ingredientId:'peanut',amount:40}],equipment:['stove'],allergens:[],tags:['tasty']},
 {id:'oats',version:1,name:'Oatmeal',mealTypes:['breakfast'],ingredients:[{ingredientId:'oats',amount:80}],equipment:['stove'],allergens:[],tags:['porridge']}
];
const prices:PriceSnapshot={id:'test',region:'X',observedOn:'2026-11-19',packs:[
 {id:'r',ingredientId:'rice',quantity:1000,priceKopecks:10000,source:'estimate'},
 {id:'p',ingredientId:'peanut',quantity:100,priceKopecks:5000,source:'estimate'},
 {id:'o',ingredientId:'oats',quantity:500,priceKopecks:6000,source:'estimate'}
]};
const slots:MealSlot[]=[{id:'breakfast',mealType:'breakfast',portions:2},{id:'lunch',mealType:'lunch',portions:2},{id:'dinner',mealType:'dinner',portions:2}];
const profile:DietaryProfile={forbiddenIngredients:[],forbiddenAllergens:['nuts'],availableEquipment:['stove'],preferredTags:['tasty']};
test('never selects forbidden ingredient allergen, even if recipe does not declare it',()=>{
 const result=planMenu({slots,recipes,ingredients,prices,profile,budgetKopecks:50000});
 assert.deepEqual(result.assignments.map(a=>a.recipe.id),['oats','rice','rice']);
 assert.equal(result.budget.withinBudget,true);
});
test('equipment rule is strict',()=>{
 assert.throws(()=>planMenu({slots,recipes,ingredients,prices,profile:{...profile,availableEquipment:[]},budgetKopecks:50000}),NoFeasiblePlanError);
});
test('impossible budget is explicit failure',()=>{
 assert.throws(()=>planMenu({slots,recipes,ingredients,prices,profile,budgetKopecks:1000}),NoFeasiblePlanError);
});
test('extras and reserve can make otherwise feasible plan impossible',()=>{
 assert.throws(()=>planMenu({slots,recipes,ingredients,prices,profile,budgetKopecks:15000,reserveKopecks:5000,extras:[{id:'cake',name:'Cake',priceKopecks:11000}]}),NoFeasiblePlanError);
});
test('results are deterministic and catalog version is preserved',()=>{
 const params={slots,recipes,ingredients,prices,profile,budgetKopecks:50000};
 const a=planMenu(params),b=planMenu(params);
 assert.deepEqual(a,b); assert.equal(a.budget.priceSnapshotId,'test');
});
test('missing regional price never becomes a free ingredient',()=>{
 const p={...prices,packs:prices.packs.filter(x=>x.ingredientId!=='oats')};
 assert.throws(()=>planMenu({slots,recipes,ingredients,prices:p,profile,budgetKopecks:50000}),/missing regional prices/);
});
