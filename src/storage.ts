import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { AppData, DayPlan, HabitEntry, ShoppingItem, UserProfile } from './types';

interface DietTrackerDB extends DBSchema {
  appData: {
    key: string;
    value: AppData;
  };
  dayPlans: {
    key: string;
    value: DayPlan;
    indexes: { 'by-date': string };
  };
  habits: {
    key: string;
    value: HabitEntry;
    indexes: { 'by-date': string };
  };
  shoppingList: {
    key: string;
    value: ShoppingItem;
  };
  profile: {
    key: string;
    value: UserProfile;
  };
}

const DB_NAME = 'diet-tracker-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DietTrackerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<DietTrackerDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<DietTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('appData')) {
        db.createObjectStore('appData');
      }
      
      if (!db.objectStoreNames.contains('dayPlans')) {
        const store = db.createObjectStore('dayPlans', { keyPath: 'date' });
        store.createIndex('by-date', 'date');
      }
      
      if (!db.objectStoreNames.contains('habits')) {
        const store = db.createObjectStore('habits', { keyPath: 'date' });
        store.createIndex('by-date', 'date');
      }
      
      if (!db.objectStoreNames.contains('shoppingList')) {
        db.createObjectStore('shoppingList', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }
    },
  });
  
  return dbInstance;
}

// Profile
export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDB();
  return db.get('profile', 'current') || null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', profile, 'current');
}

// Day Plans
export async function getDayPlan(date: string): Promise<DayPlan | null> {
  const db = await getDB();
  return db.get('dayPlans', date) || null;
}

export async function getDayPlans(startDate: string, endDate: string): Promise<DayPlan[]> {
  const db = await getDB();
  const all = await db.getAll('dayPlans');
  return all.filter(dp => dp.date >= startDate && dp.date <= endDate);
}

export async function getAllDayPlans(): Promise<DayPlan[]> {
  const db = await getDB();
  return db.getAll('dayPlans');
}

export async function saveDayPlan(plan: DayPlan): Promise<void> {
  const db = await getDB();
  await db.put('dayPlans', plan);
}

// Habits
export async function getHabitEntry(date: string): Promise<HabitEntry | null> {
  const db = await getDB();
  return db.get('habits', date) || null;
}

export async function getHabitEntries(startDate: string, endDate: string): Promise<HabitEntry[]> {
  const db = await getDB();
  const all = await db.getAll('habits');
  return all.filter(h => h.date >= startDate && h.date <= endDate);
}

export async function getAllHabitEntries(): Promise<HabitEntry[]> {
  const db = await getDB();
  return db.getAll('habits');
}

export async function saveHabitEntry(entry: HabitEntry): Promise<void> {
  const db = await getDB();
  await db.put('habits', entry);
}

// Shopping List
export async function getShoppingList(): Promise<ShoppingItem[]> {
  const db = await getDB();
  return db.getAll('shoppingList');
}

export async function saveShoppingItem(item: ShoppingItem): Promise<void> {
  const db = await getDB();
  await db.put('shoppingList', item);
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('shoppingList', 'readwrite');
  await Promise.all(items.map(item => tx.store.put(item)));
  await tx.done;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('shoppingList', id);
}

export async function clearShoppingList(): Promise<void> {
  const db = await getDB();
  await db.clear('shoppingList');
}

// Full App Data (for backup/restore)
export async function getAppData(): Promise<AppData | null> {
  const db = await getDB();
  return db.get('appData', 'full') || null;
}

export async function saveAppData(data: AppData): Promise<void> {
  const db = await getDB();
  await db.put('appData', data, 'full');
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['dayPlans', 'habits', 'shoppingList', 'profile', 'appData'], 'readwrite');
  await Promise.all([
    tx.objectStore('dayPlans').clear(),
    tx.objectStore('habits').clear(),
    tx.objectStore('shoppingList').clear(),
    tx.objectStore('profile').clear(),
    tx.objectStore('appData').clear(),
  ]);
  await tx.done;
}

// Initialize with default data if empty
export async function initializeDefaultData(): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    const { DEFAULT_PROFILE, SHOPPING_CATEGORIES } = await import('./types');
    await saveProfile(DEFAULT_PROFILE);
    
    // Initialize shopping list
    const items: ShoppingItem[] = [];
    let id = 0;
    for (const cat of SHOPPING_CATEGORIES) {
      for (const item of cat.items) {
        items.push({
          id: `shop-${id++}`,
          category: cat.category,
          item: item.item,
          quantity: item.quantity,
          notes: item.notes,
          checked: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
        });
      }
    }
    await saveShoppingList(items);
  }
}