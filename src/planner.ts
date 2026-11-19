import { calculateBudget } from './budget.ts';
import type { MealSlot, Recipe, Ingredient, DietaryProfile, PriceSnapshot, PantryItem, ExtraPurchase, MealPlan, MealAssignment } from './types.ts';
import { validateCatalog, validateInputs, validateRecipes, positiveInteger } from './validation.ts';

export class NoFeasiblePlanError extends Error { constructor(message: string) { super(message); this.name = 'NoFeasiblePlanError'; } }
export function recipeAllowed(recipe: Recipe, profile: DietaryProfile, ingredients: readonly Ingredient[]): boolean {
  const forbidden = new Set(profile.forbiddenIngredients.map(x => x.toLowerCase()));
  const allergens = new Set(profile.forbiddenAllergens.map(x => x.toLowerCase()));
  const equipment = new Set(profile.availableEquipment.map(x => x.toLowerCase()));
  const ingredientMap = new Map(ingredients.map(i=>[i.id,i]));
  if(recipe.equipment.some(x=>!equipment.has(x.toLowerCase()))) return false;
  if(recipe.allergens.some(x=>allergens.has(x.toLowerCase()))) return false;
  for(const part of recipe.ingredients){
    if (forbidden.has(part.ingredientId.toLowerCase())) return false;
    const ingredient=ingredientMap.get(part.ingredientId);
    if(!ingredient || ingredient.allergens.some(x=>allergens.has(x.toLowerCase()))) return false;
  }
  return true;
}
/** Deterministic, bounded beam search. This is a heuristic, not proof of global optimality. */
export function planMenu(input: {
  slots: readonly MealSlot[]; recipes: readonly Recipe[]; ingredients: readonly Ingredient[];
  prices: PriceSnapshot; profile: DietaryProfile; pantry?: readonly PantryItem[];
  extras?: readonly ExtraPurchase[]; budgetKopecks: number; reserveKopecks?: number;
  beamWidth?: number; maxRepeatsPerRecipe?: number;
}): MealPlan {
  const {slots,recipes,ingredients,prices,profile,budgetKopecks}=input;
  const extras=input.extras??[]; const pantry=input.pantry??[]; const reserveKopecks=input.reserveKopecks??0;
  validateCatalog(ingredients,prices); validateRecipes(recipes,ingredients);
  validateInputs(slots,pantry,extras,budgetKopecks,reserveKopecks);
  const beamWidth=input.beamWidth??24, maxRepeats=input.maxRepeatsPerRecipe??7;
  positiveInteger(beamWidth,'beamWidth'); positiveInteger(maxRepeats,'maxRepeatsPerRecipe');
  if(!slots.length) throw new NoFeasiblePlanError('No meals requested');
  if(extras.reduce((s,e)=>s+e.priceKopecks,reserveKopecks)>budgetKopecks) throw new NoFeasiblePlanError('Budget below mandatory extras and reserve');
  const candidates=slots.map(slot=>recipes.filter(r=>r.mealTypes.includes(slot.mealType)&&recipeAllowed(r,profile,ingredients)).sort((a,b)=>a.id.localeCompare(b.id)));
  for(let i=0;i<candidates.length;i++) if(!candidates[i]?.length) throw new NoFeasiblePlanError(`No allowed recipes for slot ${slots[i]!.id}`);
  type State={assignments:MealAssignment[]; score:number; cost:number; signature:string};
  let beam: State[]=[{assignments:[],score:0,cost:0,signature:''}];
  let missingPrice=false;
  for(let i=0;i<slots.length;i++){
    const slot=slots[i]!; const next:State[]=[];
    for(const state of beam){
      for(const recipe of candidates[i]!){
        const count=state.assignments.filter(a=>a.recipe.id===recipe.id).length;
        if(count>=maxRepeats)continue;
        const assignments=[...state.assignments,{slot,recipe}];
        let budget;
        try { budget=calculateBudget({assignments,ingredients,prices,pantry,extras,budgetKopecks,reserveKopecks}); }
        catch(e){ if(e instanceof Error && e.message==='Missing package prices'){missingPrice=true;continue;} throw e; }
        if(!budget.withinBudget) continue;
        const liked=recipe.tags.filter(t=>profile.preferredTags.includes(t)).length;
        const score=state.score+(liked*2)-(count*1.75)-(budget.totalWithReserveKopecks-state.cost)/Math.max(1,budgetKopecks);
        next.push({assignments,score,cost:budget.totalWithReserveKopecks,signature:state.signature+'/'+recipe.id});
      }
    }
    if(!next.length) throw new NoFeasiblePlanError(`No feasible plan at slot ${slot.id}: ${missingPrice?'missing regional prices, ':''}budget, repetition or dietary constraints`);
    next.sort((a,b)=>b.score-a.score || a.cost-b.cost || a.signature.localeCompare(b.signature));
    beam=next.slice(0,beamWidth);
  }
  const winner=beam[0]!;
  const budget=calculateBudget({assignments:winner.assignments,ingredients,prices,pantry,extras,budgetKopecks,reserveKopecks});
  return {assignments:winner.assignments,budget,score:winner.score};
}
