/** Portable, validated snapshot contract shared by the mobile UI and persistence. */
import type { MealPlan } from '../../src/types.ts';
import type { DemoPreferences } from '../../src/sample-catalog.ts';

export type TextSize = 'normal' | 'large' | 'extra';
export interface SavedState {
  preferences: DemoPreferences;
  plannedPreferences: DemoPreferences | null;
  plan: MealPlan | null;
  purchased: string[];
  darkMode: boolean;
  textSize: TextSize;
}

type PlainRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is PlainRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((part) => typeof part === 'string');

function isPreferences(value: unknown): value is DemoPreferences {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.budgetRub) && (value.budgetRub as number) >= 0 &&
    Number.isSafeInteger(value.adults) && (value.adults as number) >= 0 &&
    Number.isSafeInteger(value.children) && (value.children as number) >= 0 &&
    typeof value.region === 'string' && typeof value.withSnack === 'boolean' &&
    typeof value.pantryBuckwheat === 'boolean' &&
    isStringArray(value.forbiddenIngredients) && isStringArray(value.forbiddenAllergens) &&
    isStringArray(value.preferredTags) && isStringArray(value.availableEquipment) &&
    isStringArray(value.extras);
}

function isMealPlan(value: unknown): value is MealPlan {
  if (!isRecord(value)) return false;
  // A persisted plan is immutable historical data. Never substitute a new plan
  // when its structure is damaged: let the user recover the original storage.
  return Array.isArray(value.assignments) &&
    value.assignments.every((assignment) => isRecord(assignment) &&
      isRecord(assignment.slot) && typeof assignment.slot.id === 'string' &&
      isRecord(assignment.recipe) && typeof assignment.recipe.id === 'string') &&
    isRecord(value.budget) && typeof value.budget.totalWithReserveKopecks === 'number' &&
    Array.isArray(value.budget.lines);
}

/** Backward compatible with legacy AsyncStorage records missing textSize. */
export function decodeSavedState(json: string): SavedState {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new Error('Сохранённые данные повреждены: неверный JSON.'); }
  if (!isRecord(value) || !isPreferences(value.preferences)) {
    throw new Error('Сохранённые данные повреждены: неверные настройки семьи.');
  }
  if (value.plannedPreferences != null && !isPreferences(value.plannedPreferences)) {
    throw new Error('Сохранённые данные повреждены: параметры меню.');
  }
  if (value.plan != null && !isMealPlan(value.plan)) {
    throw new Error('Сохранённые данные повреждены: недельный план.');
  }
  if (!isStringArray(value.purchased)) {
    throw new Error('Сохранённые данные повреждены: отметки покупок.');
  }
  if (typeof value.darkMode !== 'boolean') {
    throw new Error('Сохранённые данные повреждены: настройки интерфейса.');
  }
  const textSize: TextSize = value.textSize === 'normal' || value.textSize === 'extra'
    ? value.textSize : 'large';
  return {
    preferences: value.preferences,
    plannedPreferences: value.plannedPreferences == null ? null : value.plannedPreferences,
    plan: value.plan == null ? null : value.plan,
    purchased: value.purchased,
    darkMode: value.darkMode,
    textSize,
  };
}

export function encodeSavedState(state: SavedState): string {
  const data = JSON.stringify(state);
  decodeSavedState(data); // Validate before touching the database.
  return data;
}
