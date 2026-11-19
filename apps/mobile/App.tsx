import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateBudget, recipeAllowed } from '../../src/index.ts';
import type { MealAssignment, MealPlan, Recipe } from '../../src/types.ts';
import {
  ALLERGENS, buildDemoPlan, DAYS, DEFAULT_PREFERENCES, DEMO_PRICE_NOTICE,
  DISLIKED, EXTRAS, INGREDIENTS, LIKE_TAGS, MEAL_LABELS, PRICES,
  RECIPES, REGIONS
} from '../../src/sample-catalog.ts';
import type { DemoPreferences } from '../../src/sample-catalog.ts';

type Screen = 'setup' | 'menu' | 'shopping' | 'recipes';
type TextSize = 'normal' | 'large' | 'extra';
const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.18, extra: 1.34 };
const TEXT_SIZE_OPTIONS: ReadonlyArray<{ value: TextSize; label: string }> = [
  { value: 'normal', label: 'Обычный' },
  { value: 'large', label: 'Крупный' },
  { value: 'extra', label: 'Очень крупный' }
];
interface SavedState {
  preferences: DemoPreferences;
  plannedPreferences: DemoPreferences | null;
  plan: MealPlan | null;
  purchased: string[];
  darkMode: boolean;
  textSize: TextSize;
}
const STORAGE_KEY = 'pantrilo:demo:v1';
const fmtMoney = (kopecks: number) => `${(kopecks / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
const nameByIngredient = new Map(INGREDIENTS.map((i) => [i.id, i]));
const nameByRecipe = new Map(RECIPES.map((r) => [r.id, r]));
const qty = (ingredientId: string, amount: number) => {
  const unit = nameByIngredient.get(ingredientId)?.unit;
  return `${amount} ${unit === 'each' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'}`;
};
const COLORS = {
  light: { bg: '#F5F7F2', card: '#FFFFFF', text: '#1B2A22', muted: '#738378',
    line: '#E4EAE2', accent: '#297C58', accentSoft: '#E3F2E9', warning: '#8C5B20',
    warningBg: '#FFF3DE', input: '#F7F9F6' },
  dark: { bg: '#101A17', card: '#192722', text: '#EEF4ED', muted: '#A2B3AA',
    line: '#33453B', accent: '#74D7A5', accentSoft: '#254638', warning: '#EDC486',
    warningBg: '#3D3220', input: '#22352C' }
};
const TABS: ReadonlyArray<{ id: Screen; label: string; icon: string }> = [
  { id: 'setup', label: 'Настройка', icon: '⚙️' }, { id: 'menu', label: 'Меню', icon: '🍽️' },
  { id: 'shopping', label: 'Покупки', icon: '🧺' }, { id: 'recipes', label: 'Рецепты', icon: '📖' }
];
const slotIcon: Record<string, string> = { breakfast: '☀️', lunch: '🍲', dinner: '🌙', snack: '🍎' };
const copyPrefs = (p: DemoPreferences): DemoPreferences => ({
  ...p, forbiddenIngredients: [...p.forbiddenIngredients], forbiddenAllergens: [...p.forbiddenAllergens],
  preferredTags: [...p.preferredTags], availableEquipment: [...p.availableEquipment], extras: [...p.extras]
});

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [preferences, setPreferences] = useState<DemoPreferences>(() => copyPrefs(DEFAULT_PREFERENCES));
  const [budgetInput, setBudgetInput] = useState(String(DEFAULT_PREFERENCES.budgetRub));
  const [plannedPreferences, setPlannedPreferences] = useState<DemoPreferences | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>('large');
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = darkMode ? COLORS.dark : COLORS.light;
  const s = useMemo(() => makeStyles(colors, TEXT_SCALE[textSize]), [darkMode, textSize]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!active || !value) return;
      const saved = JSON.parse(value) as Partial<SavedState>;
      if (saved.preferences && typeof saved.preferences.budgetRub === 'number') {
        setPreferences(saved.preferences); setBudgetInput(String(saved.preferences.budgetRub));
      }
      if (saved.plan && Array.isArray(saved.plan.assignments)) setPlan(saved.plan);
      if (saved.plannedPreferences) setPlannedPreferences(saved.plannedPreferences);
      if (Array.isArray(saved.purchased)) setPurchased(saved.purchased);
      if (typeof saved.darkMode === 'boolean') setDarkMode(saved.darkMode);
      if (saved.textSize === 'normal' || saved.textSize === 'large' || saved.textSize === 'extra') {
        setTextSize(saved.textSize);
      }
    }).catch(() => {
      if (active) setError('Не удалось прочитать локальные данные. Можно продолжить с новыми настройками.');
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const data: SavedState = { preferences, plannedPreferences, plan, purchased, darkMode, textSize };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() =>
      setError('Не удалось сохранить изменения на устройстве.'));
  }, [loaded, preferences, plannedPreferences, plan, purchased, darkMode, textSize]);

  const update = <K extends keyof DemoPreferences>(key: K, value: DemoPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value })); setError(null);
  };
  const toggle = (key: 'forbiddenIngredients' | 'forbiddenAllergens' | 'preferredTags' | 'availableEquipment' | 'extras', id: string) => {
    const current = preferences[key];
    update(key, current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
  };
  const doGenerate = () => {
    const raw = budgetInput.trim();
    const budget = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(budget) || budget < 100 || budget > 100000) {
      setError('Укажи целый недельный бюджет от 100 до 100 000 ₽.'); return;
    }
    const prefs = { ...copyPrefs(preferences), budgetRub: budget };
    setPreferences(prefs); setError(null); setWorking(true);
    // Yield one frame to display the loading state before synchronous local planning.
    requestAnimationFrame(() => {
      try {
        const result = buildDemoPlan(prefs);
        setPlan(result); setPlannedPreferences(prefs); setPurchased([]); setScreen('menu');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось подобрать меню. Попробуй увеличить бюджет или ослабить пожелания.');
      } finally { setWorking(false); }
    });
  };
  const openRecipe = (id: string) => { setSelectedRecipeId(id); setScreen('recipes'); };
  const swap = (selected: MealAssignment) => {
    if (!plan || !plannedPreferences) return;
    const p = plannedPreferences;
    const profile = { forbiddenIngredients: p.forbiddenIngredients, forbiddenAllergens: p.forbiddenAllergens,
      availableEquipment: p.availableEquipment, preferredTags: p.preferredTags };
    const candidates = RECIPES.filter((r) => r.id !== selected.recipe.id &&
      r.mealTypes.includes(selected.slot.mealType) && recipeAllowed(r, profile, INGREDIENTS));
    const results: MealPlan[] = [];
    for (const alternative of candidates) {
      if (plan.assignments.filter((a) => a.recipe.id === alternative.id).length >= 5) continue;
      const assignments = plan.assignments.map((a) => a.slot.id === selected.slot.id ? { ...a, recipe: alternative } : a);
      try {
        const budget = calculateBudget({ assignments, ingredients: INGREDIENTS, prices: PRICES,
          budgetKopecks: p.budgetRub * 100, reserveKopecks: p.budgetRub * 10,
          pantry: p.pantryBuckwheat ? [{ ingredientId: 'buckwheat', quantity: 500 }] : [],
          extras: EXTRAS.filter((e) => p.extras.includes(e.id)) });
        if (budget.withinBudget) results.push({ assignments, budget, score: plan.score });
      } catch { /* Missing package prices or invalid alternative. */ }
    }
    results.sort((a, b) => a.budget.totalWithReserveKopecks - b.budget.totalWithReserveKopecks);
    if (!results.length) { Alert.alert('Нет замены', 'Другого подходящего блюда в рамках бюджета пока нет.'); return; }
    setPlan(results[0]!); setPurchased([]);
  };
  const selectedRecipe = selectedRecipeId && nameByRecipe.get(selectedRecipeId) || null;
  const sourcePrefs = plannedPreferences || preferences;
  const selectedExtras = EXTRAS.filter((e) => sourcePrefs.extras.includes(e.id));
  const basketCount = (plan?.budget.lines.filter((l) => l.toBuy > 0).length || 0) + selectedExtras.length;
  const boughtCount = purchased.length;
  const togglePurchased = (id: string) => setPurchased((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const section = (title: string, subtitle?: string) => <View style={s.sectionIntro}>
    <Text style={s.sectionTitle}>{title}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
  </View>;
  const chip = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label}
    accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={[s.chip, selected ? s.chipActive : null]}>
    <Text style={[s.chipText, selected ? s.chipTextActive : null]}>{selected ? '✓ ' : ''}{label}</Text>
  </Pressable>;
  const stepper = (title: string, value: number, min: number, max: number, onValue: (v: number) => void) =>
    <View style={s.stepperRow}><Text style={s.itemLabel}>{title}</Text><View style={s.stepperControls}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Уменьшить: ${title}`} style={s.stepperButton} onPress={() => onValue(Math.max(min, value - 1))}><Text style={s.stepperText}>−</Text></Pressable>
      <Text style={s.stepperValue}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Увеличить: ${title}`} style={s.stepperButton} onPress={() => onValue(Math.min(max, value + 1))}><Text style={s.stepperText}>+</Text></Pressable>
    </View></View>;
  const fontSizePicker = () => <View style={s.fontSizePicker} accessibilityRole="radiogroup">
    {TEXT_SIZE_OPTIONS.map((option) => <Pressable key={option.value}
      accessibilityRole="radio" accessibilityState={{ checked: textSize === option.value }}
      accessibilityLabel={`Размер текста: ${option.label}`}
      onPress={() => setTextSize(option.value)}
      style={[s.fontSizeOption, textSize === option.value ? s.fontSizeOptionActive : null]}>
      <Text style={[s.fontSizeOptionText, textSize === option.value ? s.fontSizeOptionTextActive : null]}>
        {option.label}
      </Text>
    </Pressable>)}
  </View>;
  const banner = <View style={s.warningCard}><Text style={s.warningText}>ⓘ {DEMO_PRICE_NOTICE}</Text></View>;

  const renderSetup = () => <View style={s.content}>
    <View style={s.hero}><Text style={s.heroEyebrow}>ПЛАНИРОВАНИЕ НА 7 ДНЕЙ</Text>
      <Text style={s.heroTitle}>Вкусная неделя без лишних трат</Text>
      <Text style={s.heroDesc}>Укажи бюджет и предпочтения – Pantrilo рассчитает меню и общую продуктовую корзину.</Text></View>
    {banner}
    <View style={s.card}>{section('Размер текста', 'Выбери удобный размер для всех экранов.')}
      {fontSizePicker()}</View>
    {section('Регион', 'Выбор сохраняется для подключения реальных региональных прайс-листов.')}
    <View style={s.chips}>{REGIONS.map((region) => chip(region, preferences.region === region, () => update('region', region)))}</View>
    <View style={s.card}>{section('Бюджет на неделю, ₽')}
      <TextInput style={s.budgetInput} value={budgetInput} onChangeText={setBudgetInput}
        keyboardType="number-pad" placeholder="7000" placeholderTextColor={colors.muted} accessibilityLabel="Бюджет в рублях" />
      <Text style={s.muted}>Расчёт включает резерв 10% и выбранные дополнительные покупки.</Text></View>
    <View style={s.card}>{section('Состав семьи')}
      {stepper('Взрослых',preferences.adults,0,8,(v)=>update('adults',v))}
      {stepper('Детей',preferences.children,0,4,(v)=>update('children',v))}
      {preferences.children > 0 ? <Text style={s.warningText}>⚠️ В этой демоверсии ребёнок считается как одна стандартная взрослая порция. Возрастные нормы питания пока не реализованы.</Text> : null}
    </View>
    {section('Что нравится', 'Алгоритм старается чаще выбирать блюда с этими продуктами.')}
    <View style={s.chips}>{LIKE_TAGS.map((t) => chip(t.label, preferences.preferredTags.includes(t.id), () => toggle('preferredTags',t.id)))}</View>
    {section('Аллергены – строгий запрет', 'Проверяются фактические ингредиенты, а не только теги рецептов.')}
    <View style={s.chips}>{ALLERGENS.map((t) => chip(t.label, preferences.forbiddenAllergens.includes(t.id), () => toggle('forbiddenAllergens',t.id)))}</View>
    {section('Исключить ингредиенты')}
    <View style={s.chips}>{DISLIKED.map((t) => chip(t.label, preferences.forbiddenIngredients.includes(t.id), () => toggle('forbiddenIngredients',t.id)))}</View>
    {section('Доступная техника')}
    <View style={s.chips}>{chip('Плита',preferences.availableEquipment.includes('stove'),()=>toggle('availableEquipment','stove'))}
      {chip('Духовка',preferences.availableEquipment.includes('oven'),()=>toggle('availableEquipment','oven'))}</View>
    {section('Дополнительные покупки','Резервируются в бюджете до подбора блюд.')}
    <View style={s.chips}>{EXTRAS.map((extra) => chip(`${extra.name} · ${fmtMoney(extra.priceKopecks)}`,
      preferences.extras.includes(extra.id),() => toggle('extras',extra.id)))}</View>
    <View style={s.card}>{section('Другие настройки')}
      <Pressable style={s.switchRow} onPress={() => update('pantryBuckwheat',!preferences.pantryBuckwheat)}>
        <Text style={s.itemLabel}>Дома есть гречка, 500 г</Text><Text style={s.checkText}>{preferences.pantryBuckwheat ? '☑' : '☐'}</Text></Pressable>
      <View style={s.line}/>
      <Pressable style={s.switchRow} onPress={() => update('withSnack',!preferences.withSnack)}>
        <Text style={s.itemLabel}>Добавить перекус каждый день</Text><Text style={s.checkText}>{preferences.withSnack ? '☑' : '☐'}</Text></Pressable>
    </View>
    {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
    <Pressable style={[s.primaryButton,working ? s.disabled : null]} disabled={working || !loaded} onPress={doGenerate}>
      {working ? <ActivityIndicator color="#FFFFFF"/> : <Text style={s.primaryButtonText}>Составить меню на неделю  →</Text>}
    </Pressable>
    <Text style={s.footerNote}>Каталог тестовый. Медицинские диеты и детское питание без экспертной проверки не поддерживаются.</Text>
  </View>;

  const renderMenu = () => !plan ? <View style={s.empty}><Text style={s.emptyEmoji}>🍽️</Text><Text style={s.sectionTitle}>Пока нет меню</Text>
    <Text style={s.muted}>Заполни настройки и создай первый план.</Text><Pressable style={s.primaryButton} onPress={() => setScreen('setup')}><Text style={s.primaryButtonText}>Перейти к настройкам</Text></Pressable></View>
    : <View style={s.content}><View style={s.hero}>
      <Text style={s.heroEyebrow}>МЕНЮ НА НЕДЕЛЮ · ДЕМО</Text><Text style={s.heroTitle}>{fmtMoney(plan.budget.totalWithReserveKopecks)}</Text>
      <Text style={s.heroDesc}>Из бюджета {fmtMoney(plan.budget.budgetKopecks)} · включая дополнительные покупки и резерв</Text>
      <View style={s.progressOuter}><View style={[s.progressInner,{width:`${Math.min(100,plan.budget.totalWithReserveKopecks / Math.max(1,plan.budget.budgetKopecks)*100)}%`}]}/></View>
      <Text style={s.heroDesc}>Остаток по расчёту: {fmtMoney(plan.budget.budgetKopecks-plan.budget.totalWithReserveKopecks)}</Text>
    </View>{banner}
    {DAYS.map((day) => <View key={day.id} style={s.card}>
      <Text style={s.dayTitle}>{day.label}</Text>
      {plan.assignments.filter((a) => a.slot.id.startsWith(`${day.id}-`)).map((assignment) =>
        <View key={assignment.slot.id} style={s.mealRow}><Text style={s.mealEmoji}>{slotIcon[assignment.slot.mealType]}</Text>
          <View style={s.mealCopy}><Text style={s.caption}>{MEAL_LABELS[assignment.slot.mealType]}</Text>
            <Text style={s.itemLabel}>{assignment.recipe.name}</Text>
            <Text style={s.muted}>{assignment.slot.portions} стандартных порций</Text>
            <View style={s.mealActions}>
              <Pressable onPress={() => openRecipe(assignment.recipe.id)}><Text style={s.link}>Рецепт</Text></Pressable>
              <Pressable onPress={() => swap(assignment)}><Text style={s.link}>Заменить ↻</Text></Pressable>
            </View></View></View>)}
    </View>)}
    <Text style={s.footerNote}>Стоимость относится ко всей корзине; цена конкретного блюда отдельно не списывается.</Text>
  </View>;

  const renderShopping = () => !plan ? <View style={s.empty}><Text style={s.emptyEmoji}>🧺</Text>
    <Text style={s.sectionTitle}>Корзина появится после расчёта меню</Text></View>
    : <View style={s.content}>{banner}<View style={s.card}>
      {section('Список покупок',`${boughtCount} из ${basketCount} позиций отмечено`)}
      <View style={s.summaryRow}><Text style={s.muted}>Продукты</Text><Text style={s.money}>{fmtMoney(plan.budget.ingredientsCostKopecks)}</Text></View>
      <View style={s.summaryRow}><Text style={s.muted}>Дополнительные покупки</Text><Text style={s.money}>{fmtMoney(plan.budget.extrasCostKopecks)}</Text></View>
      <View style={s.summaryRow}><Text style={s.muted}>Резерв (10%)</Text><Text style={s.money}>{fmtMoney(plan.budget.reserveKopecks)}</Text></View>
      <View style={s.line}/><View style={s.summaryRow}><Text style={s.itemLabel}>Всего с резервом</Text>
        <Text style={s.total}>{fmtMoney(plan.budget.totalWithReserveKopecks)}</Text></View>
    </View>
      {plan.budget.lines.filter((l) => l.toBuy > 0).map((line) => <Pressable key={line.ingredientId}
        style={s.shoppingRow} onPress={() => togglePurchased(line.ingredientId)} accessibilityRole="checkbox"
        accessibilityState={{checked:purchased.includes(line.ingredientId)}}>
        <Text style={s.checkText}>{purchased.includes(line.ingredientId) ? '☑' : '☐'}</Text>
        <View style={s.shoppingText}><Text style={[s.itemLabel,purchased.includes(line.ingredientId) ? s.strike : null]}>
          {nameByIngredient.get(line.ingredientId)?.name || line.ingredientId}</Text>
          <Text style={s.caption}>Нужно {qty(line.ingredientId,line.toBuy)} · купить {qty(line.ingredientId,line.bought)}
            {line.fromPantry ? ` · дома ${qty(line.ingredientId,line.fromPantry)}` : ''}</Text>
          <Text style={s.caption}>{line.packCounts.map((p) => `${p.count} × ${p.packId}`).join(', ')}</Text></View>
        <Text style={s.money}>{fmtMoney(line.priceKopecks)}</Text></Pressable>)}
      {selectedExtras.length ? <View style={s.card}>{section('Дополнительные покупки')}
        {selectedExtras.map((e) => <Pressable key={e.id} style={s.summaryRow} onPress={() => togglePurchased(`extra:${e.id}`)}>
          <Text style={s.itemLabel}>{purchased.includes(`extra:${e.id}`) ? '☑' : '☐'} {e.name}</Text>
          <Text style={s.money}>{fmtMoney(e.priceKopecks)}</Text></Pressable>)}</View> : null}
      <Text style={s.footerNote}>Отметки покупок не меняют стоимость. Фактические чеки и списание запасов добавим отдельным этапом.</Text>
    </View>;

  const recipeCard = (recipe: Recipe) => <Pressable key={recipe.id} style={s.recipeRow} onPress={() => setSelectedRecipeId(recipe.id)}>
    <Text style={s.recipeIcon}>🥗</Text><View style={s.mealCopy}>
      <Text style={s.itemLabel}>{recipe.name}</Text><Text style={s.caption}>{recipe.ingredients.length} ингредиентов · {recipe.mealTypes.map(t=>MEAL_LABELS[t]).join(' / ')}</Text>
    </View><Text style={s.arrow}>›</Text></Pressable>;
  const renderRecipes = () => <View style={s.content}>
    {selectedRecipe ? <View style={s.card}>
      <Pressable onPress={() => setSelectedRecipeId(null)} style={s.recipeBack}><Text style={s.link}>← Все рецепты</Text></Pressable>
      <Text style={s.recipeFontLabel}>Размер текста</Text>
      {fontSizePicker()}
      <Text style={s.recipeBigEmoji}>🥘</Text><Text style={s.heroTitleDark}>{selectedRecipe.name}</Text>
      <Text style={s.muted}>Ингредиенты на одну стандартную порцию</Text><View style={s.line}/>
      {selectedRecipe.ingredients.map((part) => <View key={part.ingredientId} style={s.summaryRow}>
        <Text style={[s.itemLabel, s.ingredientName]}>{nameByIngredient.get(part.ingredientId)?.name || part.ingredientId}</Text>
        <Text style={s.money}>{qty(part.ingredientId,part.amount)}</Text></View>)}
      <View style={s.line}/><Text style={s.caption}>Необходимая техника: {selectedRecipe.equipment.length ? selectedRecipe.equipment.map(e => e==='stove'?'плита':'духовка').join(', ') : 'без специальной техники'}</Text>
      <Text style={s.footerNote}>Проверенные пошаговые инструкции, выход готового блюда и пищевая ценность ещё не добавлены. Пока не используйте этот каталог как кулинарное руководство.</Text>
      </View> : <>{section('Каталог рецептов', `${RECIPES.length} тестовых рецептов для разработки алгоритма`)}
        {RECIPES.map(recipeCard)}</>}
    </View>;

  if (!loaded) return <SafeAreaProvider><View style={[s.root,s.loading]}><ActivityIndicator color={colors.accent}/></View></SafeAreaProvider>;
  return <SafeAreaProvider><SafeAreaView style={s.root} edges={['top','bottom']}>
    <StatusBar style={darkMode?'light':'dark'}/>
    <View style={s.header}><View><Text style={s.brand}>pantrilo<Text style={s.brandDot}>.</Text></Text>
      <Text style={s.brandSub}>Семейное питание без лишних трат</Text></View>
      <Pressable onPress={() => setDarkMode(!darkMode)} accessibilityRole="button" accessibilityLabel="Сменить тему" style={s.themeButton}><Text style={s.themeText}>{darkMode?'☀️':'🌙'}</Text></Pressable></View>
    {error && screen!=='setup' ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
    <ScrollView key={screen} style={s.scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scrollContent}>
      {screen==='setup' ? renderSetup() : screen==='menu' ? renderMenu() : screen==='shopping' ? renderShopping() : renderRecipes()}
    </ScrollView>
    <View style={s.tabs}>{TABS.map((tab) => <Pressable key={tab.id} onPress={() => {setScreen(tab.id);setError(null);}} style={s.tab}>
      <Text style={s.tabEmoji}>{tab.icon}</Text><Text style={[s.tabText,screen===tab.id?s.tabTextActive:null]}>{tab.label}</Text>
      {screen===tab.id ? <View style={s.tabIndicator}/> : null}</Pressable>)}</View>
  </SafeAreaView></SafeAreaProvider>;
}

type Palette = typeof COLORS.light;
function makeStyles(c: Palette, scale: number) {
  const fs = (value: number) => Math.round(value * scale);
  return StyleSheet.create({
    root:{flex:1,backgroundColor:c.bg},loading:{justifyContent:'center'},
    header:{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomColor:c.line,borderBottomWidth:1},
    brand:{fontSize:fs(26),fontWeight:'900',letterSpacing:-1,color:c.text},brandDot:{color:c.accent},brandSub:{fontSize:fs(11),color:c.muted},
    themeButton:{backgroundColor:c.card,width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:15},themeText:{fontSize:fs(20)},
    scroller:{flex:1},scrollContent:{paddingBottom:26},content:{padding:16,gap:16},
    hero:{backgroundColor:c.accent,borderRadius:24,padding:22,gap:10},heroEyebrow:{color:'#E3F4E9',letterSpacing:1.4,fontSize:fs(10),fontWeight:'800'},
    heroTitle:{color:'#FFFFFF',fontSize:fs(27),fontWeight:'900',lineHeight:fs(34)},heroTitleDark:{color:c.text,fontSize:fs(24),fontWeight:'800'},
    heroDesc:{color:'#EDF9F2',fontSize:fs(14),lineHeight:fs(21)},
    warningCard:{backgroundColor:c.warningBg,borderRadius:14,padding:13},warningText:{color:c.warning,fontSize:fs(13),lineHeight:fs(21)},
    sectionIntro:{gap:4},sectionTitle:{fontSize:fs(18),fontWeight:'800',color:c.text},muted:{color:c.muted,fontSize:fs(13),lineHeight:fs(21)},
    chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingHorizontal:13,paddingVertical:10,borderRadius:22,borderWidth:1,borderColor:c.line,backgroundColor:c.card},
    chipActive:{backgroundColor:c.accentSoft,borderColor:c.accent},chipText:{color:c.text,fontSize:fs(12),fontWeight:'600'},chipTextActive:{color:c.accent},
    card:{backgroundColor:c.card,borderRadius:20,padding:17,gap:14,borderWidth:1,borderColor:c.line},
    budgetInput:{backgroundColor:c.input,borderColor:c.line,borderWidth:1,borderRadius:13,paddingHorizontal:14,paddingVertical:13,fontSize:fs(24),fontWeight:'800',color:c.text},
    stepperRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},stepperControls:{flexDirection:'row',alignItems:'center',gap:13},
    stepperButton:{width:36,height:36,backgroundColor:c.input,borderColor:c.line,borderWidth:1,borderRadius:11,alignItems:'center',justifyContent:'center'},
    stepperText:{fontSize:fs(23),color:c.accent},stepperValue:{minWidth:20,textAlign:'center',fontSize:fs(17),fontWeight:'800',color:c.text},
    itemLabel:{fontSize:fs(14),fontWeight:'700',color:c.text},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
    checkText:{fontSize:fs(23),color:c.accent},line:{height:1,backgroundColor:c.line},
    primaryButton:{backgroundColor:c.accent,borderRadius:15,padding:17,alignItems:'center',justifyContent:'center',marginTop:4,minHeight:54},
    primaryButtonText:{color:'#FFFFFF',fontSize:fs(15),fontWeight:'800'},disabled:{opacity:.6},
    errorBox:{backgroundColor:c.warningBg,padding:14,borderRadius:12,marginHorizontal:10},errorText:{color:c.warning,fontSize:fs(13),lineHeight:fs(20)},
    footerNote:{fontSize:fs(12),lineHeight:fs(20),color:c.muted},empty:{padding:30,gap:14,alignItems:'center',justifyContent:'center',minHeight:280},emptyEmoji:{fontSize:fs(55)},
    progressOuter:{height:8,borderRadius:8,overflow:'hidden',backgroundColor:'#FFFFFF55'},progressInner:{height:8,backgroundColor:'#DAEFDE',borderRadius:8},
    dayTitle:{fontSize:fs(16),fontWeight:'800',color:c.text,marginBottom:3},mealRow:{flexDirection:'row',gap:12,paddingVertical:9,borderTopColor:c.line,borderTopWidth:1},
    mealEmoji:{fontSize:fs(24),width:34},mealCopy:{flex:1,gap:3},caption:{fontSize:fs(12),color:c.muted,lineHeight:fs(19)},mealActions:{flexDirection:'row',gap:22,marginTop:6},
    link:{fontSize:fs(13),fontWeight:'800',color:c.accent},
    summaryRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},money:{fontSize:fs(13),color:c.text,fontWeight:'700'},total:{fontSize:fs(18),color:c.accent,fontWeight:'900'},
    shoppingRow:{backgroundColor:c.card,borderColor:c.line,borderWidth:1,borderRadius:15,padding:13,flexDirection:'row',gap:10,alignItems:'center'},
    shoppingText:{flex:1,gap:4},strike:{textDecorationLine:'line-through',color:c.muted},
    recipeRow:{backgroundColor:c.card,borderColor:c.line,borderWidth:1,borderRadius:15,padding:14,flexDirection:'row',gap:11,alignItems:'center'},
    recipeIcon:{fontSize:fs(24)},arrow:{fontSize:fs(24),color:c.muted},recipeBigEmoji:{fontSize:fs(55),textAlign:'center',marginTop:14},
    ingredientName:{flex:1,flexShrink:1,marginRight:8},recipeBack:{minHeight:40,justifyContent:'center'},
    recipeFontLabel:{fontSize:fs(13),fontWeight:'700',color:c.text},
    fontSizePicker:{flexDirection:'row',flexWrap:'wrap',gap:8},
    fontSizeOption:{minHeight:44,flexGrow:1,flexBasis:'27%',paddingHorizontal:8,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:c.line,backgroundColor:c.input,alignItems:'center',justifyContent:'center'},
    fontSizeOptionActive:{borderColor:c.accent,backgroundColor:c.accentSoft},
    fontSizeOptionText:{fontSize:fs(12),color:c.text,fontWeight:'700',textAlign:'center'},
    fontSizeOptionTextActive:{color:c.accent},
    tabs:{flexDirection:'row',backgroundColor:c.card,borderTopColor:c.line,borderTopWidth:1,paddingVertical:9,paddingHorizontal:4},
    tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},tabEmoji:{fontSize:fs(19)},tabText:{fontSize:fs(11),color:c.muted,fontWeight:'600',textAlign:'center'},
    tabTextActive:{color:c.accent,fontWeight:'900'},tabIndicator:{position:'absolute',top:-9,left:'33%',right:'33%',height:3,borderBottomLeftRadius:3,borderBottomRightRadius:3,backgroundColor:c.accent}
  });
}
