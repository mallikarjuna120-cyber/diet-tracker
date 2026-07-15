import type { Meal, DayPlan, MealType, UserProfile } from './types';
import { MEAL_DATABASE, DEFAULT_PROFILE } from './types';
import { format, parseISO, startOfWeek, endOfWeek, addDays, isSameDay, differenceInDays } from 'date-fns';

// Calculate BMR using Mifflin-St Jeor equation
export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Calculate TDEE
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9,
  };
  return Math.round(bmr * multipliers[profile.activityLevel]);
}

// Calculate targets
export function calculateTargets(profile: UserProfile): { calories: number; protein: number } {
  const tdee = calculateTDEE(profile);
  const calories = Math.round(tdee - 500); // 500 kcal deficit
  const protein = Math.round(profile.weight * 1.4); // 1.4g/kg
  return { calories: Math.max(1200, calories), protein };
}

// Check if a date is a veg day
export function isVegDay(date: Date, vegDays: number[]): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
  return vegDays.includes(dayOfWeek);
}

function getMealDBKey(mealType: MealType, isVeg: boolean): string {
  const prefix = isVeg ? 'veg' : 'nonveg';
  return `${prefix}-${mealType}`;
}

// Get available meals for a meal type and diet type
export function getAvailableMeals(mealType: MealType, isVeg: boolean): Meal[] {
  const key = getMealDBKey(mealType, isVeg);
  return MEAL_DATABASE[key] || [];
}

// Generate a day plan for a specific date
export function generateDayPlan(date: Date, profile: UserProfile): DayPlan {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay();
  const isVeg = isVegDay(date, profile.vegDays);
  
  // Simple rotation based on day of year
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  
  const breakfast = getAvailableMeals('breakfast', isVeg)[dayOfYear % getAvailableMeals('breakfast', isVeg).length];
  const lunch = getAvailableMeals('lunch', isVeg)[dayOfYear % getAvailableMeals('lunch', isVeg).length];
  const snack = getAvailableMeals('snack', isVeg)[dayOfYear % getAvailableMeals('snack', isVeg).length];
  const dinner = getAvailableMeals('dinner', isVeg)[dayOfYear % getAvailableMeals('dinner', isVeg).length];

  return {
    date: dateStr,
    dayOfWeek,
    isVegDay: isVeg,
    meals: { breakfast, lunch, snack, dinner },
    completed: { breakfast: false, lunch: false, snack: false, dinner: false },
  };
}

// Generate week plan
export function generateWeekPlan(startDate: Date, profile: UserProfile): DayPlan[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    plans.push(generateDayPlan(date, profile));
  }
  return plans;
}

// Calculate day totals
export function calculateDayTotals(plan: DayPlan): { calories: number; protein: number } {
  let calories = 0;
  let protein = 0;
  
  for (const meal of Object.values(plan.meals)) {
    if (meal) {
      calories += meal.calories;
      protein += meal.protein;
    }
  }
  
  return { calories, protein };
}

// Calculate week stats
export function calculateWeekStats(plans: DayPlan[]): {
  avgCalories: number;
  avgProtein: number;
  completionRate: number;
  totalMeals: number;
  completedMeals: number;
} {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalMeals = 0;
  let completedMeals = 0;
  
  for (const plan of plans) {
    const totals = calculateDayTotals(plan);
    totalCalories += totals.calories;
    totalProtein += totals.protein;
    
    for (const completed of Object.values(plan.completed)) {
      totalMeals++;
      if (completed) completedMeals++;
    }
  }
  
  return {
    avgCalories: plans.length > 0 ? Math.round(totalCalories / plans.length) : 0,
    avgProtein: plans.length > 0 ? Math.round(totalProtein / plans.length) : 0,
    completionRate: totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0,
    totalMeals,
    completedMeals,
  };
}

// Format date for display
export function formatDateDisplay(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'EEE, MMM d');
}

// Get day name
export function getDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek];
}

// Get meal type display name
export function getMealDisplayName(mealType: MealType): string {
  const names = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };
  return names[mealType];
}

// Export data as JSON
export function exportData(data: any): string {
  return JSON.stringify(data, null, 2);
}

// Import data from JSON
export function importData(jsonStr: string): any {
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON data');
  }
}

// Calculate remaining macros
export function calculateRemaining(
  plan: DayPlan,
  targets: { calories: number; protein: number }
): { calories: number; protein: number; caloriesPercent: number; proteinPercent: number } {
  const totals = calculateDayTotals(plan);
  const caloriesRemaining = targets.calories - totals.calories;
  const proteinRemaining = targets.protein - totals.protein;
  
  return {
    calories: caloriesRemaining,
    protein: proteinRemaining,
    caloriesPercent: targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0,
    proteinPercent: targets.protein > 0 ? Math.round((totals.protein / targets.protein) * 100) : 0,
  };
}

// ============================================================
// MEAL DATABASE - 14 options per meal type per diet type
// ============================================================

export const MEAL_DATABASE: Record<string, Meal[]> = {
  'veg-breakfast': [
    { id: 'v-b-1', name: 'Moong Dal Cheela (2) + Green Chutney + 1 cup Curd', calories: 380, protein: 22, isVeg: true },
    { id: 'v-b-2', name: 'Oats Upma (40g) + Veggies + 1 cup Milk', calories: 390, protein: 18, isVeg: true },
    { id: 'v-b-3', name: 'Besan Cheela (2) + Mint Chutney + 1 cup Greek Yogurt', calories: 380, protein: 24, isVeg: true },
    { id: 'v-b-4', name: 'Dalia Upma + Veggies + 1 cup Curd', calories: 370, protein: 16, isVeg: true },
    { id: 'v-b-5', name: 'Poha (60g) + Peanuts + Veggies + 1 cup Curd', calories: 380, protein: 18, isVeg: true },
    { id: 'v-b-6', name: 'Idli (3) + Sambar + Coconut Chutney + 1 cup Curd', calories: 360, protein: 14, isVeg: true },
    { id: 'v-b-7', name: 'Paneer Bhurji (80g) + 2 Whole Wheat Toast + Green Tea', calories: 390, protein: 26, isVeg: true },
    { id: 'v-b-8', name: 'Ragi Dosa (2) + Sambar + Chutney + 1 cup Curd', calories: 370, protein: 15, isVeg: true },
    { id: 'v-b-9', name: 'Sprouted Moong Salad (1 cup) + 2 Boiled Eggs* + Curd', calories: 380, protein: 28, isVeg: true },
    { id: 'v-b-10', name: 'Multigrain Paratha (1) + Curd + Pickle + Green Tea', calories: 360, protein: 14, isVeg: true },
    { id: 'v-b-11', name: 'Quinoa Porridge (40g) + Milk + Nuts + Seeds', calories: 390, protein: 16, isVeg: true },
    { id: 'v-b-12', name: 'Vegetable Uttapam (2) + Sambar + Chutney + Curd', calories: 380, protein: 16, isVeg: true },
    { id: 'v-b-13', name: 'Chilla Roll: Besan Cheela + Paneer + Veggies + Curd', calories: 400, protein: 26, isVeg: true },
    { id: 'v-b-14', name: 'Milk + Muesli (40g) + Fruit + Chia Seeds', calories: 370, protein: 15, isVeg: true },
  ],
  'veg-lunch': [
    { id: 'v-l-1', name: 'Rajma (1 cup) + Brown Rice (60g raw) + Mix Veg Sabzi + Curd (1 cup)', calories: 520, protein: 24, isVeg: true },
    { id: 'v-l-2', name: 'Chole (1 cup) + Quinoa (60g raw) + Bhindi Sabzi + Buttermilk (1 cup)', calories: 500, protein: 22, isVeg: true },
    { id: 'v-l-3', name: 'Lobia + Brown Rice + Lauki Sabzi + Curd', calories: 510, protein: 23, isVeg: true },
    { id: 'v-l-4', name: 'Chana Masala + Quinoa + Gajar-Matar + Curd', calories: 500, protein: 21, isVeg: true },
    { id: 'v-l-5', name: 'Rajma + Brown Rice + Palak Sabzi + Curd', calories: 520, protein: 24, isVeg: true },
    { id: 'v-l-6', name: 'Sprouted Moong Salad (1 cup) + 2 Roti + Mix Veg + Curd', calories: 480, protein: 20, isVeg: true },
    { id: 'v-l-7', name: 'Paneer Butter Masala (100g) + 2 Roti + Jeera Rice (50g) + Salad', calories: 530, protein: 28, isVeg: true },
    { id: 'v-l-8', name: 'Soya Chunk Curry (60g dry) + Brown Rice + Mix Veg + Curd', calories: 500, protein: 30, isVeg: true },
    { id: 'v-l-9', name: 'Dal Makhani (light, 1 cup) + 2 Roti + Cauliflower Sabzi + Curd', calories: 510, protein: 20, isVeg: true },
    { id: 'v-l-10', name: 'Kadhi Pakora + Brown Rice + Steamed Veggies + Salad', calories: 490, protein: 18, isVeg: true },
    { id: 'v-l-11', name: 'Chana Dal + Quinoa + Bhindi + Curd', calories: 500, protein: 22, isVeg: true },
    { id: 'v-l-12', name: 'Mixed Dal (1 cup) + Brown Rice + Aloo-Gobi + Curd', calories: 510, protein: 21, isVeg: true },
    { id: 'v-l-13', name: 'Paneer Tikka Masala (100g) + 2 Roti + Jeera Rice + Salad', calories: 540, protein: 28, isVeg: true },
    { id: 'v-l-14', name: 'Tofu Stir-fry (120g) + Quinoa + Broccoli-Carrot + Curd', calories: 480, protein: 26, isVeg: true },
  ],
  'veg-snack': [
    { id: 'v-s-1', name: '1 Apple + 10 Almonds', calories: 150, protein: 4, isVeg: true },
    { id: 'v-s-2', name: '1 Orange + 10 Walnuts', calories: 160, protein: 4, isVeg: true },
    { id: 'v-s-3', name: '1 cup Greek Yogurt (0%) + 1 tbsp Chia Seeds', calories: 170, protein: 20, isVeg: true },
    { id: 'v-s-4', name: '1 Pear + 10 Almonds', calories: 150, protein: 4, isVeg: true },
    { id: 'v-s-5', name: 'Roasted Chana (30g) + Green Tea', calories: 120, protein: 6, isVeg: true },
    { id: 'v-s-6', name: '1 Banana + 1 tbsp Peanut Butter', calories: 180, protein: 5, isVeg: true },
    { id: 'v-s-7', name: 'Cucumber-Carrot Sticks + 2 tbsp Hummus', calories: 100, protein: 4, isVeg: true },
    { id: 'v-s-8', name: '1 Guava + 10 Pistachios', calories: 130, protein: 4, isVeg: true },
    { id: 'v-s-9', name: 'Buttermilk (1 cup) + Roasted Makhana (20g)', calories: 110, protein: 5, isVeg: true },
    { id: 'v-s-10', name: '2 Boiled Egg Whites* + 1 Fruit', calories: 100, protein: 14, isVeg: true },
    { id: 'v-s-11', name: 'Homemade Protein Laddoo (besan+ghee+jaggery, 30g)', calories: 140, protein: 5, isVeg: true },
    { id: 'v-s-12', name: 'Sattu Drink (2 tbsp) + Lemon + Salt', calories: 80, protein: 6, isVeg: true },
    { id: 'v-s-13', name: 'Carrot-Beetroot Salad + Lemon + 5 Almonds', calories: 90, protein: 3, isVeg: true },
    { id: 'v-s-14', name: 'Green Smoothie (spinach+apple+curd+chia)', calories: 130, protein: 8, isVeg: true },
  ],
  'veg-dinner': [
    { id: 'v-d-1', name: 'Paneer Tikka (120g) + 2 Roti + Palak Sabzi + Salad', calories: 460, protein: 30, isVeg: true },
    { id: 'v-d-2', name: 'Soya Chunk Curry (60g dry) + 2 Roti + Methi Aloo + Salad', calories: 450, protein: 28, isVeg: true },
    { id: 'v-d-3', name: 'Tofu Stir-fry (120g) + 2 Roti + Mix Veg + Cucumber Salad', calories: 440, protein: 26, isVeg: true },
    { id: 'v-d-4', name: 'Moong Dal (1 cup) + 2 Roti + Bhindi + Salad', calories: 430, protein: 22, isVeg: true },
    { id: 'v-d-5', name: 'Chana Dal + 2 Roti + Lauki + Salad', calories: 440, protein: 20, isVeg: true },
    { id: 'v-d-6', name: 'Paneer Bhurji (100g) + 2 Roti + Baingan Bharta + Salad', calories: 470, protein: 30, isVeg: true },
    { id: 'v-d-7', name: 'Kadhi Pakora + 2 Roti + Steamed Veggies + Salad', calories: 450, protein: 18, isVeg: true },
    { id: 'v-d-8', name: 'Rajma (3/4 cup) + 2 Roti + Gajar-Matar + Salad', calories: 440, protein: 20, isVeg: true },
    { id: 'v-d-9', name: 'Palak Paneer (80g paneer) + 2 Roti + Jeera Aloo + Salad', calories: 460, protein: 26, isVeg: true },
    { id: 'v-d-10', name: 'Dal Tadka (1 cup) + 2 Roti + Cabbage Sabzi + Salad', calories: 420, protein: 18, isVeg: true },
    { id: 'v-d-11', name: 'Chole (3/4 cup) + 2 Roti + Pickled Onions + Salad', calories: 430, protein: 18, isVeg: true },
    { id: 'v-d-12', name: 'Sprouted Moong Cheela (2) + Curd + Salad', calories: 400, protein: 24, isVeg: true },
    { id: 'v-d-13', name: 'Vegetable Khichdi (dal+rice+veg, 1.5 cup) + Curd + Salad', calories: 420, protein: 18, isVeg: true },
    { id: 'v-d-14', name: 'Paneer + Spinach Stuffed Roti (2) + Curd + Salad', calories: 480, protein: 28, isVeg: true },
  ],
  'nonveg-breakfast': [
    { id: 'nv-b-1', name: '2 Boiled Eggs + 1 Whole Wheat Toast + 1/2 Avocado + Black Coffee', calories: 380, protein: 24, isVeg: false },
    { id: 'nv-b-2', name: '3 Egg Whites + 1 Whole Egg Scramble + 2 Toast + Black Coffee', calories: 360, protein: 28, isVeg: false },
    { id: 'nv-b-3', name: 'Oats (40g) + Milk + Banana + Chia + 2 Boiled Egg Whites', calories: 390, protein: 22, isVeg: false },
    { id: 'nv-b-4', name: '2 Moong Dal Cheela + 2 Egg Whites + Green Chutney + Tea', calories: 370, protein: 24, isVeg: false },
    { id: 'nv-b-5', name: 'Dalia Upma + 2 Boiled Eggs + Curd', calories: 380, protein: 24, isVeg: false },
    { id: 'nv-b-6', name: 'Besan Cheela + 2 Egg Whites + Curd + Green Tea', calories: 360, protein: 22, isVeg: false },
    { id: 'nv-b-7', name: '3 Egg Whites + 1 Whole Egg + 2 Toast + Avocado + Coffee', calories: 400, protein: 30, isVeg: false },
    { id: 'nv-b-8', name: 'Chicken Sausage (2) + 2 Toast + Eggs + Fruit', calories: 420, protein: 32, isVeg: false },
    { id: 'nv-b-9', name: 'Egg Bhurji (3 eggs) + 2 Roti + Green Tea', calories: 400, protein: 26, isVeg: false },
    { id: 'nv-b-10', name: 'Greek Yogurt + Whey (1 scoop) + Berries + Nuts', calories: 380, protein: 35, isVeg: false },
    { id: 'nv-b-11', name: 'Leftover Chicken (50g) + Egg Scramble + Toast', calories: 390, protein: 30, isVeg: false },
    { id: 'nv-b-12', name: 'Fish Fillet (50g) + Eggs + Toast + Veggies', calories: 380, protein: 28, isVeg: false },
    { id: 'nv-b-13', name: 'Egg White Omelette (5 whites) + Spinach + Toast', calories: 340, protein: 30, isVeg: false },
    { id: 'nv-b-14', name: 'Protein Pancakes (oats+egg+cottage cheese) + Berries', calories: 370, protein: 28, isVeg: false },
  ],
  'nonveg-lunch': [
    { id: 'nv-l-1', name: 'Grilled Chicken (150g) + Brown Rice (60g) + Mix Veg + Curd (1 cup)', calories: 520, protein: 42, isVeg: false },
    { id: 'nv-l-2', name: 'Fish Curry (150g) + Quinoa (60g) + Bhindi + Buttermilk', calories: 500, protein: 38, isVeg: false },
    { id: 'nv-l-3', name: 'Chicken Curry (150g) + Brown Rice + Lauki + Curd', calories: 530, protein: 40, isVeg: false },
    { id: 'nv-l-4', name: 'Grilled Fish (150g) + Quinoa + Palak + Curd', calories: 490, protein: 36, isVeg: false },
    { id: 'nv-l-5', name: 'Chicken Kebab (150g) + 2 Roti + Mix Veg + Curd', calories: 510, protein: 40, isVeg: false },
    { id: 'nv-l-6', name: 'Egg Curry (3 eggs) + Brown Rice + Gajar-Matar + Curd', calories: 500, protein: 30, isVeg: false },
    { id: 'nv-l-7', name: 'Chicken Biryani (controlled oil, 150g chicken) + Raita + Salad', calories: 540, protein: 38, isVeg: false },
    { id: 'nv-l-8', name: 'Tandoori Chicken (150g) + 2 Roti + Mint Chutney + Salad + Curd', calories: 500, protein: 40, isVeg: false },
    { id: 'nv-l-9', name: 'Fish Fry (shallow, 150g) + Quinoa + Mix Veg + Curd', calories: 510, protein: 36, isVeg: false },
    { id: 'nv-l-10', name: 'Chicken Stir-fry (150g) + Brown Rice + Broccoli + Curd', calories: 500, protein: 40, isVeg: false },
    { id: 'nv-l-11', name: 'Mutton Curry (lean, 100g) + Brown Rice + Lauki + Curd', calories: 530, protein: 32, isVeg: false },
    { id: 'nv-l-12', name: 'Egg Biryani (3 eggs) + Raita + Salad', calories: 510, protein: 28, isVeg: false },
    { id: 'nv-l-13', name: 'Chicken Salad (150g) + Quinoa + Olive Oil Dressing + Curd', calories: 480, protein: 42, isVeg: false },
    { id: 'nv-l-14', name: 'Prawn Curry (150g) + Brown Rice + Bhindi + Curd', calories: 500, protein: 36, isVeg: false },
  ],
  'nonveg-snack': [
    { id: 'nv-s-1', name: '1 Apple + 10 Almonds', calories: 150, protein: 4, isVeg: false },
    { id: 'nv-s-2', name: '1 Orange + 10 Walnuts', calories: 160, protein: 4, isVeg: false },
    { id: 'nv-s-3', name: '1 cup Greek Yogurt + 1 tbsp Flaxseeds', calories: 170, protein: 20, isVeg: false },
    { id: 'nv-s-4', name: '1 Pear + 10 Almonds', calories: 150, protein: 4, isVeg: false },
    { id: 'nv-s-5', name: '2 Boiled Egg Whites + Green Tea', calories: 70, protein: 14, isVeg: false },
    { id: 'nv-s-6', name: '1 Boiled Egg + 1 Fruit', calories: 150, protein: 10, isVeg: false },
    { id: 'nv-s-7', name: 'Roasted Chana (30g) + 1 Egg White', calories: 130, protein: 10, isVeg: false },
    { id: 'nv-s-8', name: 'Chicken Salami (30g) + Cucumber', calories: 120, protein: 12, isVeg: false },
    { id: 'nv-s-9', name: 'Tuna (50g canned) + Crackers', calories: 130, protein: 18, isVeg: false },
    { id: 'nv-s-10', name: 'Whey Protein Shake (1 scoop) + Water', calories: 120, protein: 24, isVeg: false },
    { id: 'nv-s-11', name: 'Boiled Chicken Cubes (50g) + Veggies', calories: 110, protein: 20, isVeg: false },
    { id: 'nv-s-12', name: 'Egg White Bites (3) + Salsa', calories: 100, protein: 18, isVeg: false },
    { id: 'nv-s-13', name: 'Greek Yogurt + Protein Powder (1/2 scoop)', calories: 150, protein: 25, isVeg: false },
    { id: 'nv-s-14', name: 'Beef Jerky (20g) + Nuts', calories: 140, protein: 15, isVeg: false },
  ],
  'nonveg-dinner': [
    { id: 'nv-d-1', name: 'Grilled Chicken (150g) + 2 Roti + Bhindi + Salad', calories: 460, protein: 42, isVeg: false },
    { id: 'nv-d-2', name: 'Fish Fry (shallow, 150g) + 2 Roti + Methi Aloo + Salad', calories: 480, protein: 38, isVeg: false },
    { id: 'nv-d-3', name: 'Chicken Curry (150g) + 2 Roti + Palak + Salad', calories: 470, protein: 40, isVeg: false },
    { id: 'nv-d-4', name: 'Grilled Fish (150g) + 2 Roti + Tinda + Salad', calories: 450, protein: 36, isVeg: false },
    { id: 'nv-d-5', name: 'Egg Bhurji (3 eggs) + 2 Roti + Mix Veg + Salad', calories: 460, protein: 30, isVeg: false },
    { id: 'nv-d-6', name: 'Chicken Tikka (150g) + 2 Roti + Baingan Bharta + Salad', calories: 470, protein: 40, isVeg: false },
    { id: 'nv-d-7', name: 'Mutton Curry (lean, 100g) + 2 Roti + Lauki + Salad', calories: 480, protein: 32, isVeg: false },
    { id: 'nv-d-8', name: 'Tandoori Fish (150g) + 2 Roti + Mint Chutney + Salad', calories: 450, protein: 36, isVeg: false },
    { id: 'nv-d-9', name: 'Chicken Keema (100g) + 2 Roti + Peas + Salad', calories: 460, protein: 35, isVeg: false },
    { id: 'nv-d-10', name: 'Fish Curry (150g) + 2 Roti + Steamed Veggies + Salad', calories: 450, protein: 36, isVeg: false },
    { id: 'nv-d-11', name: 'Chicken Soup (150g) + 2 Roti + Salad + Egg', calories: 440, protein: 38, isVeg: false },
    { id: 'nv-d-12', name: 'Prawn Stir-fry (150g) + 2 Roti + Mix Veg + Salad', calories: 450, protein: 36, isVeg: false },
    { id: 'nv-d-13', name: 'Egg Curry (2 eggs) + 2 Roti + Bhindi + Salad', calories: 430, protein: 24, isVeg: false },
    { id: 'nv-d-14', name: 'Chicken Salad (150g) + 1 Roti + Olive Oil + Curd', calories: 420, protein: 40, isVeg: false },
  ],
};