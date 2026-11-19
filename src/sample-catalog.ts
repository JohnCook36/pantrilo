/** Local demonstration catalog. All prices below are invented and MUST NOT be shown as current regional prices. */
import type { Ingredient, MealSlot, PriceSnapshot, Recipe, MealType, ExtraPurchase, PantryItem, DietaryProfile, MealPlan } from './types.ts';
import { planMenu } from './planner.ts';

export const DEMO_PRICE_NOTICE = 'Тестовые цены для демонстрации. Это не статистика Росстата и не стоимость корзины в магазине.';
export const DEMO_DATE = '2026-11-19';
export const DAYS = [
  { id: 'mon', label: 'Понедельник' }, { id: 'tue', label: 'Вторник' },
  { id: 'wed', label: 'Среда' }, { id: 'thu', label: 'Четверг' },
  { id: 'fri', label: 'Пятница' }, { id: 'sat', label: 'Суббота' },
  { id: 'sun', label: 'Воскресенье' }
] as const;
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус'
};
export const INGREDIENTS: readonly Ingredient[] = [
  {id:'oats',name:'Овсяные хлопья',unit:'g',allergens:[]},
  {id:'milk',name:'Молоко',unit:'ml',allergens:['milk']},
  {id:'banana',name:'Бананы',unit:'g',allergens:[]},
  {id:'apple',name:'Яблоки',unit:'g',allergens:[]},
  {id:'egg',name:'Яйца',unit:'each',allergens:['egg']},
  {id:'bread',name:'Хлеб',unit:'g',allergens:['gluten']},
  {id:'cheese',name:'Сыр',unit:'g',allergens:['milk']},
  {id:'buckwheat',name:'Гречка',unit:'g',allergens:[]},
  {id:'rice',name:'Рис',unit:'g',allergens:[]},
  {id:'pasta',name:'Макароны',unit:'g',allergens:['gluten']},
  {id:'chicken',name:'Куриное филе',unit:'g',allergens:[]},
  {id:'ground-beef',name:'Говяжий фарш',unit:'g',allergens:[]},
  {id:'fish',name:'Рыба',unit:'g',allergens:['fish']},
  {id:'potato',name:'Картофель',unit:'g',allergens:[]},
  {id:'carrot',name:'Морковь',unit:'g',allergens:[]},
  {id:'onion',name:'Лук',unit:'g',allergens:[]},
  {id:'tomato',name:'Помидоры',unit:'g',allergens:[]},
  {id:'cucumber',name:'Огурцы',unit:'g',allergens:[]},
  {id:'cabbage',name:'Капуста',unit:'g',allergens:[]},
  {id:'yogurt',name:'Йогурт',unit:'g',allergens:['milk']},
  {id:'oil',name:'Масло растительное',unit:'ml',allergens:[]},
  {id:'beans',name:'Фасоль',unit:'g',allergens:[]},
];
/** An illustrative purchase-price table, NOT averaged regional observations. */
const PACKS: ReadonlyArray<readonly [string, number, number]> = [
  ['oats',400,75], ['milk',1000,125], ['banana',1000,170], ['apple',1000,150],
  ['egg',10,130], ['bread',400,75], ['cheese',200,220], ['buckwheat',800,88],
  ['rice',900,125], ['pasta',450,95], ['chicken',1000,420], ['ground-beef',500,400],
  ['fish',800,480], ['potato',2000,130], ['carrot',1000,95], ['onion',1000,90],
  ['tomato',500,150], ['cucumber',500,130], ['cabbage',1000,100], ['yogurt',400,150],
  ['oil',1000,190], ['beans',400,130]
];
export const PRICES: PriceSnapshot = {
  id: 'DEMO-fixtures-v1', region: 'DEMO – не реальные региональные цены', observedOn: DEMO_DATE,
  packs: PACKS.map(([ingredientId,quantity,rubles])=>({
    id:`${ingredientId}-${quantity}`, ingredientId, quantity,
    priceKopecks: rubles * 100, source:'estimate' as const
  }))
};
function r(id: string, name: string, mealTypes: MealType[], parts: ReadonlyArray<readonly [string,number]>,
    tags: string[], equipment: string[] = ['stove']): Recipe {
  return {id,version:1,name,mealTypes,ingredients:parts.map(([ingredientId,amount])=>({ingredientId,amount})),
    equipment,allergens:[],tags};
}
export const RECIPES: readonly Recipe[] = [
  r('oats-banana','Овсянка с бананом',['breakfast'],[['oats',65],['milk',150],['banana',100]],['porridge','fruit']),
  r('oats-apple','Овсянка с яблоком',['breakfast'],[['oats',65],['milk',120],['apple',100]],['porridge','fruit']),
  r('eggs-toast','Яйца с тостами',['breakfast'],[['egg',2],['bread',70],['tomato',80]],['eggs']),
  r('cheese-toast','Тосты с сыром',['breakfast'],[['bread',85],['cheese',45],['cucumber',90]],['cheese'],[]),
  r('rice-milk','Рисовая каша',['breakfast'],[['rice',70],['milk',200]],['porridge']),
  r('yogurt-fruit','Йогурт с фруктами',['breakfast'],[['yogurt',200],['banana',100],['apple',100]],['fruit'],[]),
  r('buckwheat-egg','Гречка с яйцом',['breakfast'],[['buckwheat',75],['egg',1],['oil',5]],['eggs','porridge']),
  r('chicken-rice','Курица с рисом',['lunch','dinner'],[['chicken',160],['rice',80],['carrot',65],['oil',10]],['chicken']),
  r('chicken-buckwheat','Курица с гречкой',['lunch','dinner'],[['chicken',160],['buckwheat',85],['onion',30]],['chicken']),
  r('chicken-soup','Куриный суп',['lunch','dinner'],[['chicken',115],['potato',160],['carrot',55],['onion',40]],['chicken','soup']),
  r('beef-pasta','Макароны с мясным соусом',['lunch','dinner'],[['ground-beef',130],['pasta',90],['tomato',130],['onion',40]],['beef']),
  r('beef-potato','Говядина с картофелем',['lunch','dinner'],[['ground-beef',130],['potato',200],['onion',40]],['beef']),
  r('fish-rice','Рыба с рисом',['lunch','dinner'],[['fish',170],['rice',80],['carrot',80]],['fish']),
  r('fish-potato','Рыба с картофелем',['lunch','dinner'],[['fish',165],['potato',210],['oil',8]],['fish'],['oven']),
  r('vegetable-rice','Рис с овощами',['lunch','dinner'],[['rice',90],['carrot',100],['onion',50],['tomato',110]],['vegetables']),
  r('beans-cabbage','Тушёная фасоль с капустой',['lunch','dinner'],[['beans',100],['cabbage',180],['onion',45],['tomato',90]],['vegetables','beans']),
  r('potato-egg','Картофель с яйцом',['lunch','dinner'],[['potato',240],['egg',2],['onion',30]],['eggs']),
  r('chicken-salad','Салат с курицей',['lunch','dinner'],[['chicken',140],['cucumber',120],['tomato',120],['oil',10]],['chicken','vegetables']),
  r('buckwheat-mushroomless','Гречка с овощами',['lunch','dinner'],[['buckwheat',95],['carrot',100],['onion',45],['oil',10]],['vegetables']),
  r('pasta-cheese','Макароны с сыром',['lunch','dinner'],[['pasta',95],['cheese',45],['tomato',100]],['cheese']),
  r('fruit-snack','Фруктовая тарелка',['snack'],[['apple',130],['banana',100]],['fruit'],[]),
  r('yogurt-snack','Йогурт с яблоком',['snack'],[['yogurt',180],['apple',100]],['fruit'],[]),
  r('cheese-snack','Сыр и хлебцы',['snack'],[['cheese',45],['bread',65]],['cheese'],[]),
];
export const EXTRAS = [
  {id:'chocolate',name:'Шоколад',priceKopecks:15000},
  {id:'juice',name:'Сок',priceKopecks:13000},
  {id:'cookies',name:'Печенье',priceKopecks:12000}
] satisfies ExtraPurchase[];
export const LIKE_TAGS = [
  {id:'chicken',label:'Курица'}, {id:'fish',label:'Рыба'}, {id:'beef',label:'Говядина'},
  {id:'vegetables',label:'Овощи'}, {id:'porridge',label:'Каши'}, {id:'fruit',label:'Фрукты'}
] as const;
export const ALLERGENS = [
  {id:'milk',label:'Молоко'}, {id:'egg',label:'Яйца'},
  {id:'fish',label:'Рыба'}, {id:'gluten',label:'Глютен'}
] as const;
export const DISLIKED = [
  {id:'chicken',label:'Курица'}, {id:'fish',label:'Рыба'},
  {id:'egg',label:'Яйца'}, {id:'milk',label:'Молоко'},
  {id:'onion',label:'Лук'}, {id:'tomato',label:'Помидоры'}
] as const;
export const REGIONS = ['Воронежская область','Москва','Московская область','Санкт-Петербург','Ленинградская область'] as const;
export interface DemoPreferences {
  region: string;
  budgetRub: number;
  adults: number;
  children: number;
  forbiddenIngredients: string[];
  forbiddenAllergens: string[];
  preferredTags: string[];
  availableEquipment: string[];
  extras: string[];
  pantryBuckwheat: boolean;
  withSnack: boolean;
}
export const DEFAULT_PREFERENCES: DemoPreferences = {
  region:'Воронежская область',budgetRub:7000,adults:2,children:0,
  forbiddenIngredients:[],forbiddenAllergens:[],preferredTags:['chicken','vegetables'],
  availableEquipment:['stove','oven'],extras:['chocolate'],pantryBuckwheat:false,withSnack:false
};
export function createDemoSlots(p: DemoPreferences): MealSlot[] {
  const portions=p.adults+p.children;
  if (!Number.isSafeInteger(portions) || portions<1 || portions>12) throw new Error('Количество порций должно быть от 1 до 12');
  return DAYS.flatMap(({id})=>(p.withSnack?['breakfast','lunch','dinner','snack']:['breakfast','lunch','dinner']).map(type=>({
    id:`${id}-${type}`, mealType:type as MealType, portions
  })));
}
export function buildDemoPlan(p: DemoPreferences): MealPlan {
  if (!Number.isSafeInteger(p.budgetRub) || p.budgetRub<100 || p.budgetRub>100000) throw new Error('Введите бюджет от 100 до 100 000 ₽');
  const profile: DietaryProfile={forbiddenIngredients:p.forbiddenIngredients,forbiddenAllergens:p.forbiddenAllergens,
    availableEquipment:p.availableEquipment,preferredTags:p.preferredTags};
  const pantry: PantryItem[]=p.pantryBuckwheat?[{ingredientId:'buckwheat',quantity:500}]:[];
  return planMenu({
    slots:createDemoSlots(p),recipes:RECIPES,ingredients:INGREDIENTS,prices:PRICES,profile,
    pantry,extras:EXTRAS.filter(e=>p.extras.includes(e.id)),
    budgetKopecks:p.budgetRub*100,reserveKopecks:p.budgetRub*10,
    beamWidth:8,maxRepeatsPerRecipe:5
  });
}
