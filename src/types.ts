export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  isVeg: boolean;
}

export interface DayPlan {
  date: string; // ISO date string YYYY-MM-DD
  dayOfWeek: number; // 0=Sun, 1=Mon, etc.
  isVegDay: boolean;
  meals: {
    breakfast: Meal | null;
    lunch: Meal | null;
    snack: Meal | null;
    dinner: Meal | null;
  };
  completed: {
    breakfast: boolean;
    lunch: boolean;
    snack: boolean;
    dinner: boolean;
  };
  weight?: number;
  waist?: number;
  notes?: string;
}

export interface UserProfile {
  name: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  targetCalories: number;
  targetProtein: number;
  vegDays: number[]; // 0=Sun, 1=Mon, etc.
}

export interface HabitEntry {
  date: string;
  water: boolean;
  steps: boolean;
  sleep: boolean;
  workout: boolean;
  proteinHit: boolean;
  veggies: boolean;
  noSugar: boolean;
  mood: number; // 1-10
}

export interface ShoppingItem {
  id: string;
  category: string;
  item: string;
  quantity: string;
  notes: string;
  checked: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
}

export interface AppData {
  profile: UserProfile;
  dayPlans: Record<string, DayPlan>;
  habits: Record<string, HabitEntry>;
  shoppingList: ShoppingItem[];
  version: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  height: 164,
  weight: 93,
  age: 30,
  gender: 'male',
  activityLevel: 'sedentary',
  targetCalories: 1600,
  targetProtein: 130,
  vegDays: [1, 4, 6], // Mon, Fri, Sun
};

export const SHOPPING_CATEGORIES = [
  {
    category: 'Protein (Non-Veg Base)',
    items: [
      { item: 'Chicken Breast / Fish', quantity: '900-1000g', notes: 'VEG: replace with paneer/tofu/soya/extra dal' },
      { item: 'Eggs', quantity: '28-30', notes: 'VEG days: use 4-6/day for protein' },
      { item: 'Mutton (lean, optional)', quantity: '200g', notes: 'Occasional' },
    ],
  },
  {
    category: 'Protein (Vegetarian Base)',
    items: [
      { item: 'Paneer', quantity: '500-600g', notes: 'Non-veg days: reduce to 200g' },
      { item: 'Tofu / Soya Chunks', quantity: '200g dry', notes: 'Soya: 60g dry = 30g protein' },
      { item: 'Greek Yogurt (0%)', quantity: '1.5 kg', notes: 'Daily 1 cup' },
      { item: 'Curd / Dahi (toned)', quantity: '2 kg', notes: 'Lunch + dinner' },
      { item: 'Milk (toned)', quantity: '2 L', notes: 'Breakfast + tea' },
      { item: 'Whey Protein (optional)', quantity: '1 scoop/day', notes: 'If protein short' },
    ],
  },
  {
    category: 'Dals / Legumes (Raw)',
    items: [
      { item: 'Rajma / Chole / Lobia / Chana', quantity: '1.5 kg total', notes: '~30g raw/meal' },
      { item: 'Moong Dal / Toor Dal / Masoor', quantity: '1 kg', notes: 'Daily 30g raw' },
      { item: 'Besan (Chickpea Flour)', quantity: '500g', notes: 'Cheelas, pakoras' },
      { item: 'Sprouting Moong / Chana', quantity: '200g', notes: 'Salads, snacks' },
    ],
  },
  {
    category: 'Grains (Raw)',
    items: [
      { item: 'Brown Rice / Quinoa', quantity: '1.5 kg', notes: '60g raw/meal' },
      { item: 'Whole Wheat Atta', quantity: '2.5 kg', notes: '6-8 rotis/day' },
      { item: 'Oats / Dalia / Ragi Flour', quantity: '1 kg', notes: 'Breakfast rotation' },
      { item: 'Poha / Idli Rava / Semolina', quantity: '500g', notes: 'Variety' },
    ],
  },
  {
    category: 'Vegetables (Weekly)',
    items: [
      { item: 'Spinach / Palak / Methi', quantity: '1.5 kg', notes: 'Daily 1 cup cooked' },
      { item: 'Mixed Veg (carrot, beans, peas, cauliflower)', quantity: '2 kg', notes: 'Lunch sides' },
      { item: 'Bhindi / Lauki / Tinda / Tori', quantity: '2 kg', notes: 'Low-cal staples' },
      { item: 'Onion / Tomato / Potato', quantity: '3 kg', notes: 'Base for all cooking' },
      { item: 'Cucumber / Carrot / Beetroot (salad)', quantity: '1.5 kg', notes: 'Daily salad' },
      { item: 'Ginger / Garlic / Green Chili / Coriander', quantity: '500g', notes: 'Aromatics' },
      { item: 'Lemon', quantity: '14', notes: '2/day' },
    ],
  },
  {
    category: 'Fruits',
    items: [
      { item: 'Apple / Guava / Pear', quantity: '14', notes: '1/day snack' },
      { item: 'Banana', quantity: '7', notes: 'Pre/post workout' },
      { item: 'Orange / Mosambi / Seasonal', quantity: '7', notes: 'Vitamin C' },
      { item: 'Papaya / Watermelon / Berries', quantity: '2 kg', notes: 'Variety' },
    ],
  },
  {
    category: 'Nuts & Seeds',
    items: [
      { item: 'Almonds', quantity: '200g', notes: '10/day' },
      { item: 'Walnuts', quantity: '150g', notes: '10/day alt' },
      { item: 'Chia Seeds', quantity: '150g', notes: '1 tbsp/day' },
      { item: 'Flaxseeds (roasted)', quantity: '150g', notes: '1 tbsp/day' },
      { item: 'Peanuts / Roasted Chana', quantity: '300g', notes: 'Snacks' },
    ],
  },
  {
    category: 'Fats & Condiments',
    items: [
      { item: 'Cooking Oil (olive/rice bran/mustard)', quantity: '200ml', notes: 'MAX 2 tsp/day = 10g' },
      { item: 'Ghee', quantity: '100ml', notes: '1 tsp/day max' },
      { item: 'Spices (turmeric, cumin, coriander, garam masala, etc.)', quantity: 'Stock', notes: 'Check pantry' },
      { item: 'Vinegar / Soy Sauce / Mustard', quantity: 'Stock', notes: 'Low-cal flavor' },
    ],
  },
];