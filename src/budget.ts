import type { MealAssignment, Recipe, Ingredient, PriceSnapshot, PantryItem, ExtraPurchase, BudgetResult, ShoppingLine, PackPrice } from './types.ts';
import { nonNegativeInteger, validateCatalog } from './validation.ts';

function gcd(a: number, b: number): number { while (b) [a, b] = [b, a % b]; return a; }
/** Complete unbounded-pack knapsack: minimise spend for >= required quantity.
 * Integerised by gcd(pack sizes). Ties: less surplus, then fewer packs.
 * Throws for oversized states; never silently switches to an incorrect heuristic.
 */
export function cheapestPacks(required: number, packs: readonly PackPrice[]): { bought: number; cost: number; counts: readonly {packId:string;count:number}[] } {
  nonNegativeInteger(required, 'required quantity');
  if (required === 0) return { bought: 0, cost: 0, counts: [] };
  if (!packs.length) throw new Error('Missing package prices');
  for (const p of packs) {
    if (!Number.isSafeInteger(p.quantity) || p.quantity <= 0 || !Number.isSafeInteger(p.priceKopecks) || p.priceKopecks <= 0) throw new Error(`Invalid pack ${p.id}`);
  }
  const sorted = [...packs].sort((a,b) => a.id.localeCompare(b.id));
  const step = sorted.reduce((v,p) => gcd(v,p.quantity), sorted[0]!.quantity);
  const maxUnits = Math.ceil((required + Math.max(...sorted.map(p=>p.quantity)) - 1) / step);
  if (maxUnits > 200_000) throw new Error('Package optimisation input too large');
  const costs = new Array<number>(maxUnits + 1).fill(Infinity);
  const nums = new Array<number>(maxUnits + 1).fill(Infinity);
  const prev = new Array<number>(maxUnits + 1).fill(-1);
  const last = new Array<number>(maxUnits + 1).fill(-1);
  costs[0] = 0; nums[0] = 0;
  for (let q=1;q<=maxUnits;q++) {
    for (let i=0;i<sorted.length;i++) {
      const p = sorted[i]!; const size = p.quantity / step;
      if (q < size || !Number.isFinite(costs[q-size])) continue;
      const cost = costs[q-size]! + p.priceKopecks; const count = nums[q-size]! + 1;
      if (!Number.isSafeInteger(cost)) throw new Error('Price overflow');
      if (cost < costs[q]! || (cost === costs[q] && count < nums[q]!)) {
        costs[q] = cost; nums[q] = count; prev[q] = q-size; last[q] = i;
      }
    }
  }
  let best = -1;
  for (let q=Math.ceil(required/step);q<=maxUnits;q++) {
    if (!Number.isFinite(costs[q])) continue;
    if (best === -1 || costs[q]! < costs[best]! || (costs[q]===costs[best] && (q < best || (q===best && nums[q]! < nums[best]!)))) best=q;
  }
  if (best < 0) throw new Error('No affordable package combination available');
  const counts = new Map<string,number>();
  for (let q=best;q>0;) {
    const i=last[q]!; if (i<0) throw new Error('Broken package path');
    const p=sorted[i]!; counts.set(p.id,(counts.get(p.id)??0)+1); q=prev[q]!;
  }
  return { bought: best*step, cost: costs[best]!, counts: [...counts].map(([packId,count])=>({packId,count})).sort((a,b)=>a.packId.localeCompare(b.packId)) };
}
export function calculateBudget(options: {
  assignments: readonly MealAssignment[];
  ingredients: readonly Ingredient[];
  prices: PriceSnapshot;
  pantry?: readonly PantryItem[];
  extras?: readonly ExtraPurchase[];
  budgetKopecks: number;
  reserveKopecks?: number;
}): BudgetResult {
  const {assignments, ingredients, prices, budgetKopecks}=options;
  const reserveKopecks=options.reserveKopecks ?? 0;
  nonNegativeInteger(budgetKopecks,'budget'); nonNegativeInteger(reserveKopecks,'reserve');
  validateCatalog(ingredients,prices);
  const known=new Set(ingredients.map(i=>i.id));
  const stock=new Map<string,number>();
  for(const item of options.pantry??[]){
    nonNegativeInteger(item.quantity,`pantry ${item.ingredientId}`);
    if (!known.has(item.ingredientId) || stock.has(item.ingredientId)) throw new Error(`Invalid pantry item ${item.ingredientId}`);
    stock.set(item.ingredientId,item.quantity);
  }
  const needed=new Map<string,number>();
  for(const {slot,recipe} of assignments){
    if (!Number.isSafeInteger(slot.portions) || slot.portions<=0) throw new Error('Invalid portion count');
    for(const ingredient of recipe.ingredients){
      if(!known.has(ingredient.ingredientId)) throw new Error(`Unknown ingredient ${ingredient.ingredientId}`);
      if(!Number.isSafeInteger(ingredient.amount) || ingredient.amount<=0) throw new Error(`Invalid recipe amount ${ingredient.ingredientId}`);
      const qty=(needed.get(ingredient.ingredientId)??0)+ingredient.amount*slot.portions;
      if(!Number.isSafeInteger(qty)) throw new Error('Ingredient quantity overflow');
      needed.set(ingredient.ingredientId,qty);
    }
  }
  const lines: ShoppingLine[]=[];
  for(const [ingredientId,required] of [...needed].sort(([a],[b])=>a.localeCompare(b))){
    const fromPantry=Math.min(required,stock.get(ingredientId)??0);
    const toBuy=required-fromPantry;
    const match=prices.packs.filter(p=>p.ingredientId===ingredientId);
    const best=cheapestPacks(toBuy,match);
    lines.push({ingredientId,required,fromPantry,toBuy,bought:best.bought,packCounts:best.counts,priceKopecks:best.cost});
  }
  let ingredientsCostKopecks=0; for(const line of lines) ingredientsCostKopecks+=line.priceKopecks;
  let extrasCostKopecks=0; for(const extra of options.extras??[]){nonNegativeInteger(extra.priceKopecks,`extra ${extra.id}`);extrasCostKopecks+=extra.priceKopecks;}
  const totalWithReserveKopecks=ingredientsCostKopecks+extrasCostKopecks+reserveKopecks;
  if (![ingredientsCostKopecks,extrasCostKopecks,totalWithReserveKopecks].every(Number.isSafeInteger)) throw new Error('Budget sum overflow');
  return {lines,ingredientsCostKopecks,extrasCostKopecks,reserveKopecks,totalWithReserveKopecks,budgetKopecks,withinBudget:totalWithReserveKopecks<=budgetKopecks,priceSnapshotId:prices.id};
}
