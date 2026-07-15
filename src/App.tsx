import { useState, useEffect, useCallback } from 'react';
import {
  Home, Calendar, ShoppingCart, Settings, CheckCircle, Circle, 
  Utensils, Dumbbell, Scale, Heart, Download, Upload, RefreshCw,
  ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Copy,
  AlertTriangle, Check, X, Sun, Moon, Star, Target, Flame,
  Coffee, Sandwich, Apple, Pizza, BarChart2, Archive, Share2
} from 'lucide-react';
import './App.css';
import { initializeDefaultData, getProfile, saveProfile, getDayPlan, saveDayPlan, getDayPlans, getAllDayPlans, getAllHabitEntries, getHabitEntries, saveHabitEntry, getShoppingList, saveShoppingItem, saveShoppingList, clearAllData } from './storage';
import {
  calculateTargets,
  generateDayPlan,
  generateWeekPlan,
  calculateDayTotals,
  calculateWeekStats,
  formatDateDisplay,
  getDayName,
  getMealDisplayName,
  exportData,
  importData,
  calculateRemaining,
  isVegDay,
  calculateBMR,
  calculateTDEE,
} from './utils';
import type { UserProfile, DayPlan, HabitEntry, ShoppingItem, MealType, AppData } from './types';
import { DEFAULT_PROFILE, SHOPPING_CATEGORIES } from './types';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

type Tab = 'today' | 'week' | 'shopping' | 'habits' | 'profile' | 'data';

function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('today');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [weekPlans, setWeekPlans] = useState<DayPlan[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [habits, setHabits] = useState<Record<string, HabitEntry>>({});
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [targets, setTargets] = useState({ calories: 1600, protein: 130 });
  const [showExport, setShowExport] = useState(false);
  const [importError, setImportError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Load initial data
  useEffect(() => {
    async function loadData() {
      await initializeDefaultData();
      const p = await getProfile();
      if (p) {
        setProfile(p);
        const t = calculateTargets(p);
        setTargets(t);
      }
      await refreshToday();
      await refreshWeek();
      await refreshHabits();
      await refreshShopping();
      setIsLoading(false);
    }
    loadData();
  }, []);

  const refreshToday = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const plan = await getDayPlan(today);
    if (plan) {
      setTodayPlan(plan);
    } else if (profile) {
      const newPlan = generateDayPlan(new Date(), profile);
      await saveDayPlan(newPlan);
      setTodayPlan(newPlan);
    }
  }, [profile]);

  const refreshWeek = useCallback(async () => {
    if (!profile) return;
    const plans = generateWeekPlan(weekStart, profile);
    // Load saved completion status
    const savedPlans = await getDayPlans(
      format(weekStart, 'yyyy-MM-dd'),
      format(new Date(weekStart.getTime() + 6*86400000), 'yyyy-MM-dd')
    );
    const savedMap = new Map(savedPlans.map(p => [p.date, p]));
    
    const mergedPlans = plans.map(p => {
      const saved = savedMap.get(p.date);
      if (saved) {
        return { ...p, completed: saved.completed, weight: saved.weight, waist: saved.waist, notes: saved.notes };
      }
      return p;
    });
    setWeekPlans(mergedPlans);
  }, [profile, weekStart]);

  const refreshHabits = useCallback(async () => {
    if (!profile) return;
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(new Date(weekStart.getTime() + 6*86400000), 'yyyy-MM-dd');
    const entries = await getHabitEntries(start, end);
    const map: Record<string, HabitEntry> = {};
    entries.forEach(e => map[e.date] = e);
    setHabits(map);
  }, [weekStart]);

  const refreshShopping = useCallback(async () => {
    const list = await getShoppingList();
    setShoppingList(list);
  }, []);

  const toggleMeal = async (mealType: MealType) => {
    if (!todayPlan) return;
    const updated = {
      ...todayPlan,
      completed: { ...todayPlan.completed, [mealType]: !todayPlan.completed[mealType] }
    };
    await saveDayPlan(updated);
    setTodayPlan(updated);
    await refreshWeek();
  };

  const toggleHabit = async (date: string, habit: keyof Omit<HabitEntry, 'date'>) => {
    const existing = habits[date] || {
      date,
      water: false, steps: false, sleep: false, workout: false,
      proteinHit: false, veggies: false, noSugar: false, mood: 5
    };
    const updated = { ...existing, [habit]: !existing[habit] };
    await saveHabitEntry(updated);
    setHabits({ ...habits, [date]: updated });
  };

  const toggleShoppingDay = async (item: ShoppingItem, day: keyof ShoppingItem['checked']) => {
    const updated = {
      ...item,
      checked: { ...item.checked, [day]: !item.checked[day] }
    };
    await saveShoppingItem(updated);
    setShoppingList(shoppingList.map(i => i.id === item.id ? updated : i));
  };

  const updateWeight = async (date: string, weight: number) => {
    const plan = await getDayPlan(date);
    if (plan) {
      const updated = { ...plan, weight };
      await saveDayPlan(updated);
      if (date === format(new Date(), 'yyyy-MM-dd')) setTodayPlan(updated);
      await refreshWeek();
    }
  };

  const updateWaist = async (date: string, waist: number) => {
    const plan = await getDayPlan(date);
    if (plan) {
      const updated = { ...plan, waist };
      await saveDayPlan(updated);
      if (date === format(new Date(), 'yyyy-MM-dd')) setTodayPlan(updated);
      await refreshWeek();
    }
  };

  const updateNotes = async (date: string, notes: string) => {
    const plan = await getDayPlan(date);
    if (plan) {
      const updated = { ...plan, notes };
      await saveDayPlan(updated);
      if (date === format(new Date(), 'yyyy-MM-dd')) setTodayPlan(updated);
      await refreshWeek();
    }
  };

  const handleProfileSave = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    await saveProfile(updated);
    setProfile(updated);
    const t = calculateTargets(updated);
    setTargets(t);
    await refreshToday();
    await refreshWeek();
  };

  const handleExport = async () => {
    const dayPlans = await getAllDayPlans();
    const allHabits = await getAllHabitEntries();
    const shopping = await getShoppingList();
    const prof = await getProfile();
    
    const data: AppData = {
      profile: prof || DEFAULT_PROFILE,
      dayPlans: Object.fromEntries(dayPlans.map(p => [p.date, p])),
      habits: Object.fromEntries(allHabits.map(h => [h.date, h])),
      shoppingList: shopping,
      version: 1,
    };
    
    const json = exportData(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diet-tracker-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = importData(text) as AppData;
      
      if (data.profile) await saveProfile(data.profile);
      if (data.dayPlans) {
        for (const plan of Object.values(data.dayPlans)) {
          await saveDayPlan(plan);
        }
      }
      if (data.habits) {
        for (const habit of Object.values(data.habits)) {
          await saveHabitEntry(habit);
        }
      }
      if (data.shoppingList) {
        await saveShoppingList(data.shoppingList);
      }
      
      setImportError('');
      await refreshToday();
      await refreshWeek();
      await refreshHabits();
      await refreshShopping();
      const p = await getProfile();
      if (p) { setProfile(p); setTargets(calculateTargets(p)); }
    } catch (e) {
      setImportError('Invalid backup file');
    }
  };

  const handleClearAll = async () => {
    if (confirm('This will delete ALL data. Are you sure?')) {
      await clearAllData();
      await initializeDefaultData();
      const p = await getProfile();
      if (p) { setProfile(p); setTargets(calculateTargets(p)); }
      await refreshToday();
      await refreshWeek();
      await refreshHabits();
      await refreshShopping();
    }
  };

  // Render meal card
  const MealCard = ({ mealType, plan, onToggle }: { mealType: MealType; plan: DayPlan; onToggle: () => void }) => {
    const meal = plan.meals[mealType];
    const completed = plan.completed[mealType];
    const icons = { breakfast: Coffee, lunch: Sandwich, snack: Apple, dinner: Pizza };
    const Icon = icons[mealType];
    
    if (!meal) return null;
    
    return (
      <div className={`meal-card ${completed ? 'completed' : ''}`} onClick={onToggle}>
        <div className="meal-header">
          <div className="meal-title-row">
            <Icon className="meal-icon" />
            <span className="meal-name">{getMealDisplayName(mealType)}</span>
            {completed && <CheckCircle className="completed-check" />}
          </div>
          <div className="meal-macros">
            <span>🔥 {meal.calories} kcal</span>
            <span>🥩 {meal.protein}g protein</span>
          </div>
        </div>
        <div className="meal-description">{meal.name}</div>
        <div className="meal-tap-hint">Tap to mark complete</div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!profile) {
    return <div className="loading">Initializing profile...</div>;
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPlanExists = todayPlan !== null;
  const remaining = todayPlan ? calculateRemaining(todayPlan, targets) : { calories: targets.calories, protein: targets.protein, caloriesPercent: 0, proteinPercent: 0 };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'today', label: 'Today', icon: Sun },
    { id: 'week', label: 'Week', icon: Calendar },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
    { id: 'habits', label: 'Habits', icon: Dumbbell },
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'data', label: 'Data', icon: Archive },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Diet Tracker</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{todayPlanExists ? targets.calories - remaining.calories : 0}</span>
            <span className="stat-label">/ {targets.calories} kcal</span>
          </div>
          <div className="stat">
            <span className="stat-value">{todayPlanExists ? targets.protein - remaining.protein : 0}</span>
            <span className="stat-label">/ {targets.protein}g protein</span>
          </div>
        </div>
      </header>

      <nav className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => setCurrentTab(tab.id)}
          >
            <tab.icon className="tab-icon" size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {/* TODAY TAB */}
        {currentTab === 'today' && (
          <div className="tab-content today-tab">
            <div className="day-header">
              <h2>Today's Plan</h2>
              <div className="day-type-badge" style={{ background: todayPlan?.isVegDay ? '#e2efda' : '#fce4d6' }}>
                {todayPlan?.isVegDay ? '🥦 Vegetarian Day' : '🍗 Non-Veg Day'}
              </div>
            </div>

            <div className="macro-bars">
              <div className="macro-bar">
                <div className="macro-label">
                  <span>Calories</span>
                  <span>{targets.calories - remaining.calories} / {targets.calories}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, remaining.caloriesPercent)}%` }}></div>
                </div>
              </div>
              <div className="macro-bar">
                <div className="macro-label">
                  <span>Protein</span>
                  <span>{targets.protein - remaining.protein} / {targets.protein}g</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill protein" style={{ width: `${Math.min(100, remaining.proteinPercent)}%` }}></div>
                </div>
              </div>
            </div>

            {todayPlan ? (
              <div className="meals-grid">
                <MealCard mealType="breakfast" plan={todayPlan} onToggle={() => toggleMeal('breakfast')} />
                <MealCard mealType="lunch" plan={todayPlan} onToggle={() => toggleMeal('lunch')} />
                <MealCard mealType="snack" plan={todayPlan} onToggle={() => toggleMeal('snack')} />
                <MealCard mealType="dinner" plan={todayPlan} onToggle={() => toggleMeal('dinner')} />
              </div>
            ) : (
              <div className="empty-state">No plan generated yet</div>
            )}

            <div className="today-extras">
              <div className="extra-card">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={todayPlan?.weight || ''}
                  onChange={e => updateWeight(today, parseFloat(e.target.value) || 0)}
                  placeholder="Enter weight"
                />
              </div>
              <div className="extra-card">
                <label>Waist (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={todayPlan?.waist || ''}
                  onChange={e => updateWaist(today, parseFloat(e.target.value) || 0)}
                  placeholder="Enter waist"
                />
              </div>
              <div className="extra-card full-width">
                <label>Notes</label>
                <textarea
                  value={todayPlan?.notes || ''}
                  onChange={e => updateNotes(today, e.target.value)}
                  placeholder="How was today? Energy, hunger, digestion..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* WEEK TAB */}
        {currentTab === 'week' && (
          <div className="tab-content week-tab">
            <div className="week-nav">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={24} /></button>
              <h2>{format(weekStart, 'MMM d')} - {format(new Date(weekStart.getTime() + 6*86400000), 'MMM d, yyyy')}</h2>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={24} /></button>
            </div>

            <div className="week-stats">
              {(() => {
                const stats = calculateWeekStats(weekPlans);
                return (
                  <>
                    <div className="stat-card"><span>{stats.avgCalories}</span> avg kcal</div>
                    <div className="stat-card"><span>{stats.avgProtein}g</span> avg protein</div>
                    <div className="stat-card"><span>{stats.completionRate}%</span> meal completion</div>
                    <div className="stat-card"><span>{stats.completedMeals}/{stats.totalMeals}</span> meals done</div>
                  </>
                );
              })()}
            </div>

            <div className="week-grid">
              {weekPlans.map(plan => {
                const dayHabits = habits[plan.date];
                const totals = calculateDayTotals(plan);
                const completedCount = Object.values(plan.completed).filter(Boolean).length;
                return (
                  <div key={plan.date} className={`day-card ${plan.date === today ? 'today' : ''} ${plan.isVegDay ? 'veg-day' : ''}`}>
                    <div className="day-card-header">
                      <span className="day-name">{getDayName(plan.dayOfWeek)}</span>
                      <span className="day-date">{formatDateDisplay(plan.date)}</span>
                    </div>
                    <div className="day-type" style={{ background: plan.isVegDay ? '#e2efda' : '#fce4d6' }}>
                      {plan.isVegDay ? '🥦 Veg' : '🍗 Non-Veg'}
                    </div>
                    <div className="day-macros">
                      <span>🔥 {totals.calories}</span>
                      <span>🥩 {totals.protein}g</span>
                    </div>
                    <div className="day-completion">
                      {['breakfast', 'lunch', 'snack', 'dinner'].map(m => (
                        <button
                          key={m}
                          className={`meal-toggle ${plan.completed[m as MealType] ? 'done' : ''}`}
                          onClick={() => {
                            const updated = { ...plan, completed: { ...plan.completed, [m]: !plan.completed[m as MealType] } };
                            saveDayPlan(updated);
                            refreshWeek();
                          }}
                        >
                          {m[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="day-weight">
                      {plan.weight && `⚖️ ${plan.weight}kg`}
                      {plan.waist && ` 📏 ${plan.waist}cm`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SHOPPING TAB */}
        {currentTab === 'shopping' && (
          <div className="tab-content shopping-tab">
            <h2>Weekly Shopping List</h2>
            <p className="shopping-hint">Tap Mon/Fri/Sun columns for veg-day items</p>
            {SHOPPING_CATEGORIES.map((cat, catIdx) => (
              <div key={catIdx} className="shopping-category">
                <h3>{cat.category}</h3>
                <div className="shopping-table">
                  <div className="shopping-header">
                    <div className="col-item">Item</div>
                    <div className="col-qty">Qty</div>
                    <div className="col-days">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>
                    <div className="col-notes">Notes</div>
                  </div>
                  {cat.items.map((item, itemIdx) => {
                    const savedItem = shoppingList.find(s => s.item === item.item && s.category === cat.category);
                    return (
                      <div key={itemIdx} className="shopping-row">
                        <div className="col-item">
                          <strong>{item.item}</strong>
                        </div>
                        <div className="col-qty">{item.quantity}</div>
                        <div className="col-days">
                          {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(day => (
                            <button
                              key={day}
                              className={`day-check ${savedItem?.checked[day] ? 'checked' : ''}`}
                              onClick={() => savedItem && toggleShoppingDay(savedItem, day)}
                            ></button>
                          ))}
                        </div>
                        <div className="col-notes">{item.notes}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HABITS TAB */}
        {currentTab === 'habits' && (
          <div className="tab-content habits-tab">
            <h2>Daily Habits</h2>
            <div className="habits-grid">
              {weekPlans.map(plan => {
                const h = habits[plan.date];
                const habitItems = [
                  { key: 'water', label: '💧 3L+ Water', icon: '💧' },
                  { key: 'steps', label: '👟 8k+ Steps', icon: '👟' },
                  { key: 'sleep', label: '😴 7h+ Sleep', icon: '😴' },
                  { key: 'workout', label: '💪 Workout', icon: '💪' },
                  { key: 'proteinHit', label: '🥩 Protein Hit', icon: '🥩' },
                  { key: 'veggies', label: '🥦 3+ Cups Veg', icon: '🥦' },
                  { key: 'noSugar', label: '🚫 No Added Sugar', icon: '🚫' },
                ] as const;
                return (
                  <div key={plan.date} className={`habit-day-card ${plan.date === today ? 'today' : ''}`}>
                    <div className="habit-day-header">
                      <span>{getDayName(plan.dayOfWeek)}</span>
                      <span>{formatDateDisplay(plan.date)}</span>
                    </div>
                    <div className="habit-checks">
                      {habitItems.map(habit => (
                        <button
                          key={habit.key}
                          className={`habit-check ${h?.[habit.key] ? 'done' : ''}`}
                          onClick={() => toggleHabit(plan.date, habit.key)}
                          title={habit.label}
                        >
                          {habit.icon}
                        </button>
                      ))}
                    </div>
                    <div className="habit-mood">
                      Mood: {h ? '⭐'.repeat(Math.min(10, Math.max(1, h.mood))) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {currentTab === 'profile' && (
          <div className="tab-content profile-tab">
            <h2>Profile & Targets</h2>
            <div className="profile-form">
              <div className="form-row">
                <label>Name <input value={profile.name} onChange={e => handleProfileSave({ name: e.target.value })} /></label>
                <label>Age <input type="number" value={profile.age} onChange={e => handleProfileSave({ age: parseInt(e.target.value) })} /></label>
              </div>
              <div className="form-row">
                <label>Height (cm) <input type="number" value={profile.height} onChange={e => handleProfileSave({ height: parseInt(e.target.value) })} /></label>
                <label>Weight (kg) <input type="number" step="0.1" value={profile.weight} onChange={e => handleProfileSave({ weight: parseFloat(e.target.value) })} /></label>
              </div>
              <div className="form-row">
                <label>
                  Gender
                  <select value={profile.gender} onChange={e => handleProfileSave({ gender: e.target.value as 'male'|'female' })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label>
                  Activity
                  <select value={profile.activityLevel} onChange={e => handleProfileSave({ activityLevel: e.target.value as any })}>
                    <option value="sedentary">Sedentary (desk job)</option>
                    <option value="light">Light (1-3 days/week)</option>
                    <option value="moderate">Moderate (3-5 days/week)</option>
                    <option value="very">Very Active (6-7 days/week)</option>
                    <option value="extra">Extra Active (athlete)</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>Veg Days (0=Sun, 1=Mon...)
                  <input 
                    value={profile.vegDays.join(',')} 
                    onChange={e => handleProfileSave({ vegDays: e.target.value.split(',').map(n => parseInt(n.trim())) })} 
                    placeholder="1,4,6"
                  />
                </label>
              </div>
              <div className="calculated-targets">
                <h3>Calculated Targets</h3>
                <p>BMR: {Math.round(calculateBMR(profile))} kcal</p>
                <p>TDEE: {Math.round(calculateTDEE(profile))} kcal</p>
                <p>Target Calories: {targets.calories} kcal (500 deficit)</p>
                <p>Target Protein: {targets.protein}g ({Math.round(targets.protein/profile.weight*10)/10}g/kg)</p>
              </div>
            </div>
          </div>
        )}

        {/* DATA TAB */}
        {currentTab === 'data' && (
          <div className="tab-content data-tab">
            <h2>Data Management</h2>
            <div className="data-actions">
              <button className="btn-primary" onClick={handleExport}>
                <Download size={20} /> Export Backup (JSON)
              </button>
              <div className="import-section">
                <label>
                  Import Backup
                  <input type="file" accept=".json" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} style={{ display: 'none' }} ref={el => el && el.click()} />
                </label>
                {importError && <span className="error">{importError}</span>}
              </div>
              <button className="btn-danger" onClick={handleClearAll}>
                <Trash2 size={20} /> Clear All Data
              </button>
            </div>
            <div className="data-info">
              <h3>About</h3>
              <ul>
                <li>Data stored locally in browser (IndexedDB)</li>
                <li>Export/Import JSON for backup & sync between phones</li>
                <li>Works offline as PWA (add to home screen)</li>
                <li>Install as Android app via Capacitor</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// calculateBMR and calculateTDEE are now imported from utils at the top

export default App;