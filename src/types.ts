/** Domain amounts use integer grams, millilitres, or pieces. Money is integer kopecks. */
export type Unit = 'g' | 'ml' | 'each';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  allergens: readonly string[];
}
export interface RecipeIngredient { ingredientId: string; amount: number }
export interface Recipe {
  id: string;
  version: number;
  name: string;
  mealTypes: readonly MealType[];
  /** Ingredients per one standard portion, in units from Ingredient. */
  ingredients: readonly RecipeIngredient[];
  equipment: readonly string[];
  allergens: readonly string[];
  tags: readonly string[];
}
export interface PackPrice {
  id: string;
  ingredientId: string;
  quantity: number;
  priceKopecks: number;
  /** Price comes from an observation/estimate, not an online shelf-price claim. */
  source: 'regional' | 'estimate' | 'user';
}
export interface PriceSnapshot {
  id: string;
  region: string;
  observedOn: string;
  packs: readonly PackPrice[];
}
export interface PantryItem { ingredientId: string; quantity: number }
export interface ExtraPurchase { id: string; name: string; priceKopecks: number }
export interface MealSlot { id: string; mealType: MealType; portions: number }
export interface DietaryProfile {
  forbiddenIngredients: readonly string[];
  forbiddenAllergens: readonly string[];
  availableEquipment: readonly string[];
  preferredTags: readonly string[];
}
export interface ShoppingLine {
  ingredientId: string;
  required: number;
  fromPantry: number;
  toBuy: number;
  bought: number;
  packCounts: readonly { packId: string; count: number }[];
  priceKopecks: number;
}
export interface BudgetResult {
  lines: readonly ShoppingLine[];
  ingredientsCostKopecks: number;
  extrasCostKopecks: number;
  reserveKopecks: number;
  totalWithReserveKopecks: number;
  budgetKopecks: number;
  withinBudget: boolean;
  priceSnapshotId: string;
}
export interface MealAssignment { slot: MealSlot; recipe: Recipe }
export interface MealPlan { assignments: readonly MealAssignment[]; budget: BudgetResult; score: number }
