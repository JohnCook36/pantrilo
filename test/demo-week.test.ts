import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoPlan, DEFAULT_PREFERENCES, DAYS, RECIPES, INGREDIENTS, PRICES } from '../src/sample-catalog.ts';
import { recipeAllowed } from '../src/planner.ts';
import { validateCatalog, validateRecipes } from '../src/validation.ts';

test('fixture catalog is valid', () => {
  validateCatalog(INGREDIENTS,PRICES);
  validateRecipes(RECIPES,INGREDIENTS);
});
test('generates all 21 weekly meals within estimated demo budget', () => {
  const plan=buildDemoPlan({...DEFAULT_PREFERENCES});
  assert.equal(plan.assignments.length,DAYS.length*3);
  assert.equal(plan.budget.withinBudget,true);
  assert.equal(plan.budget.priceSnapshotId,PRICES.id);
  assert.ok(plan.budget.lines.length>0);
});
test('forbidden fish allergen never appears in weekly plan', () => {
  const p={...DEFAULT_PREFERENCES,forbiddenAllergens:['fish']};
  const plan=buildDemoPlan(p);
  for(const a of plan.assignments) assert.equal(recipeAllowed(a.recipe,{
    forbiddenIngredients:p.forbiddenIngredients,forbiddenAllergens:p.forbiddenAllergens,
    availableEquipment:p.availableEquipment,preferredTags:p.preferredTags
  },INGREDIENTS),true);
});
test('snack selection yields 28 slots',()=>{
  const plan=buildDemoPlan({...DEFAULT_PREFERENCES,withSnack:true,budgetRub:12000});
  assert.equal(plan.assignments.length,28);
});
