import { planMenu } from './planner.ts';
import type { Ingredient, Recipe, MealSlot, PriceSnapshot } from './types.ts';
const ingredients: Ingredient[] = [
  {id:'buckwheat',name:'Гречка',unit:'g',allergens:[]},
  {id:'chicken',name:'Куриное филе',unit:'g',allergens:[]},
  {id:'oats',name:'Овсянка',unit:'g',allergens:[]}
];
const recipes: Recipe[] = [
  {id:'oatmeal',version:1,name:'Овсяная каша',mealTypes:['breakfast'],ingredients:[{ingredientId:'oats',amount:70}],equipment:['stove'],allergens:[],tags:['porridge']},
  {id:'chicken-buckwheat',version:1,name:'Курица с гречкой',mealTypes:['lunch','dinner'],ingredients:[{ingredientId:'chicken',amount:150},{ingredientId:'buckwheat',amount:70}],equipment:['stove'],allergens:[],tags:['chicken']}
];
const prices: PriceSnapshot={id:'demo-not-real',region:'DEMO',observedOn:'2026-11-19',packs:[
  {id:'buckwheat-800',ingredientId:'buckwheat',quantity:800,priceKopecks:8800,source:'estimate'},
  {id:'chicken-1000',ingredientId:'chicken',quantity:1000,priceKopecks:42000,source:'estimate'},
  {id:'oats-400',ingredientId:'oats',quantity:400,priceKopecks:7500,source:'estimate'}
]};
const slots: MealSlot[]=[
  {id:'mon-breakfast',mealType:'breakfast',portions:2},
  {id:'mon-lunch',mealType:'lunch',portions:2},
  {id:'mon-dinner',mealType:'dinner',portions:2}
];
const result=planMenu({slots,recipes,ingredients,prices,profile:{forbiddenIngredients:[],forbiddenAllergens:[],availableEquipment:['stove'],preferredTags:['chicken']},budgetKopecks:100000,reserveKopecks:5000,pantry:[{ingredientId:'buckwheat',quantity:200}],extras:[{id:'chocolate',name:'Шоколад',priceKopecks:12000}]});
// Example data only; prices are invented for tests/demo, NOT regional estimates.
console.log(JSON.stringify({menu:result.assignments.map(a=>({slot:a.slot.id,recipe:a.recipe.name})),shopping:result.budget.lines,totalKopecks:result.budget.totalWithReserveKopecks},null,2));
