import type { Ingredient, Recipe, PriceSnapshot, MealSlot, PantryItem, ExtraPurchase } from './types.ts';
export function nonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
}
export function positiveInteger(value: number, label: string): void {
  nonNegativeInteger(value, label);
  if (value === 0) throw new Error(`${label} must be positive`);
}
export function assertUnique(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label}`);
}
export function validateCatalog(ingredients: readonly Ingredient[], snapshot: PriceSnapshot): void {
  assertUnique(ingredients.map(i => i.id), 'ingredient ID');
  assertUnique(snapshot.packs.map(p => p.id), 'pack ID');
  const ids = new Set(ingredients.map(i => i.id));
  for (const pack of snapshot.packs) {
    if (!ids.has(pack.ingredientId)) throw new Error(`Unknown ingredient in pack ${pack.id}`);
    positiveInteger(pack.quantity, `pack ${pack.id} quantity`);
    positiveInteger(pack.priceKopecks, `pack ${pack.id} price`);
  }
  if (!snapshot.id || !snapshot.region || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.observedOn)) {
    throw new Error('Invalid price snapshot metadata');
  }
}
export function validateRecipes(recipes: readonly Recipe[], ingredients: readonly Ingredient[]): void {
  assertUnique(recipes.map(r => r.id), 'recipe ID');
  const ids = new Set(ingredients.map(i => i.id));
  for (const recipe of recipes) {
    if (!recipe.id || !recipe.mealTypes.length || !recipe.ingredients.length) throw new Error(`Incomplete recipe ${recipe.id}`);
    positiveInteger(recipe.version, `recipe ${recipe.id} version`);
    assertUnique(recipe.ingredients.map(i => i.ingredientId), `ingredient in ${recipe.id}`);
    for (const part of recipe.ingredients) {
      if (!ids.has(part.ingredientId)) throw new Error(`Unknown ingredient ${part.ingredientId} in ${recipe.id}`);
      positiveInteger(part.amount, `recipe ${recipe.id} amount`);
    }
  }
}
export function validateInputs(slots: readonly MealSlot[], pantry: readonly PantryItem[], extras: readonly ExtraPurchase[], budgetKopecks: number, reserveKopecks: number): void {
  nonNegativeInteger(budgetKopecks, 'budget');
  nonNegativeInteger(reserveKopecks, 'reserve');
  assertUnique(slots.map(s => s.id), 'slot ID');
  for (const slot of slots) positiveInteger(slot.portions, `slot ${slot.id} portions`);
  assertUnique(pantry.map(p => p.ingredientId), 'pantry ingredient');
  for (const item of pantry) nonNegativeInteger(item.quantity, `pantry ${item.ingredientId}`);
  assertUnique(extras.map(e => e.id), 'extra ID');
  for (const extra of extras) nonNegativeInteger(extra.priceKopecks, `extra ${extra.id} price`);
}
