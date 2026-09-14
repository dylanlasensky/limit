import { format, startOfWeek, addDays } from "date-fns";
export { calcTargets } from "@/components/limit/nutritionTargets";

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealIngredient {
  name: string;
  quantity: string;
  category: string;
}

export interface PlannedMeal extends MacroTotals {
  key: number | string;
  name: string;
  mealType: MealType;
  ingredients: MealIngredient[];
  servingSize: string;
  servings: number;
  prepMinutes: number;
  instructions: string[];
  estimatedNutrition: boolean;
  generatedForDate?: string;
}

export interface DietaryProfile {
  allergies?: string[];
  foodsToAvoid?: string[];
  intolerances?: string[];
  dietaryPreferences?: string[];
  [key: string]: any;
}

type MealSeed = [string, MealType, string[], number, number, number, number];

export const today = () => format(new Date(), "yyyy-MM-dd");
export const weekStart = () => startOfWeek(new Date(), { weekStartsOn: 1 });
const meals: MealSeed[] = [
  [
    "Berry protein oats",
    "Breakfast",
    ["Oats", "Greek yogurt", "Berries", "Chia seeds"],
    520,
    38,
    67,
    12,
  ],
  ["Egg and avocado toast", "Breakfast", ["Eggs", "Whole wheat bread", "Avocado"], 510, 29, 48, 22],
  [
    "Tofu breakfast scramble",
    "Breakfast",
    ["Tofu", "Potatoes", "Spinach", "Olive oil"],
    500,
    31,
    58,
    18,
  ],
  [
    "Chicken rice bowl",
    "Lunch",
    ["Chicken breast", "Rice", "Bell pepper", "Salsa"],
    690,
    52,
    78,
    17,
  ],
  ["Lentil quinoa bowl", "Lunch", ["Lentils", "Quinoa", "Cucumber", "Tahini"], 650, 31, 86, 20],
  ["Tuna potato salad", "Lunch", ["Tuna", "Potatoes", "Green beans", "Olive oil"], 620, 48, 64, 18],
  ["Lean beef pasta", "Dinner", ["Lean beef", "Pasta", "Tomato sauce", "Spinach"], 760, 55, 88, 21],
  ["Salmon sweet potato plate", "Dinner", ["Salmon", "Sweet potato", "Broccoli"], 730, 49, 67, 27],
  [
    "Tofu noodle stir-fry",
    "Dinner",
    ["Tofu", "Rice noodles", "Mixed vegetables", "Soy sauce"],
    700,
    37,
    91,
    20,
  ],
  ["Yogurt fruit crunch", "Snacks", ["Greek yogurt", "Banana", "Granola"], 390, 27, 55, 8],
  ["Hummus snack plate", "Snacks", ["Hummus", "Pita", "Carrots", "Cucumber"], 380, 16, 52, 14],
  ["Protein smoothie", "Snacks", ["Milk", "Protein powder", "Banana", "Oats"], 430, 39, 58, 8],
];
const allergenMap: Record<string, string[]> = {
  Eggs: ["egg"],
  Peanuts: ["peanut"],
  "Tree nuts": ["almond", "walnut", "cashew", "granola"],
  Shellfish: ["shrimp", "crab"],
  Fish: ["salmon", "tuna"],
  "Milk/dairy": ["milk", "yogurt", "cheese"],
  Soy: ["tofu", "soy"],
  "Wheat/gluten": ["bread", "pasta", "pita"],
  Sesame: ["tahini"],
};
export const safeMeals = (d?: DietaryProfile | null): PlannedMeal[] =>
  meals
    .filter((m) => {
      const text = m[2].join(" ").toLowerCase();
      const blocked: string[] = [
        ...(d?.allergies || []),
        ...(d?.foodsToAvoid || []),
        ...(d?.intolerances || []),
      ];
      const prefs = d?.dietaryPreferences || [];
      const hasMeat = ["chicken", "beef", "tuna", "salmon"].some((x) => text.includes(x));
      const hasAnimal = hasMeat || ["egg", "milk", "yogurt"].some((x) => text.includes(x));
      if (prefs.includes("Vegan") && hasAnimal) return false;
      if (prefs.includes("Vegetarian") && hasMeat) return false;
      if (prefs.includes("Pescatarian") && ["chicken", "beef"].some((x) => text.includes(x)))
        return false;
      return !blocked.some((a) =>
        (allergenMap[a] || [a]).some((x) => text.includes(x.toLowerCase()))
      );
    })
    .map((m, i) => ({
      key: i,
      name: m[0],
      mealType: m[1],
      ingredients: m[2].map((name, j) => ({
        name,
        quantity: j ? "1 serving" : "6 oz",
        category: ["Chicken breast", "Lean beef", "Salmon", "Tuna", "Tofu"].includes(name)
          ? "Protein"
          : "Other",
      })),
      servingSize: "1 bowl",
      servings: 1,
      calories: m[3],
      protein: m[4],
      carbs: m[5],
      fat: m[6],
      prepMinutes: 25,
      instructions: [
        "Prepare and measure the ingredients.",
        "Cook until safely done, then combine.",
        "Season to taste and serve.",
      ],
      estimatedNutrition: true,
    }));
export const buildWeek = (profile: Record<string, any>, diet?: DietaryProfile | null) =>
  Array.from({ length: 7 }, (_, day) => {
    const date = format(addDays(weekStart(), day), "yyyy-MM-dd");
    const pool = safeMeals(diet);
    return (["Breakfast", "Lunch", "Dinner", "Snacks"] as MealType[]).flatMap((type, i) => {
      const candidates = pool.filter((x) => x.mealType === type);
      if (!candidates.length) return []; // Never fabricate an empty meal after exclusions.
      return [
        {
          ...candidates[day % candidates.length],
          generatedForDate: date,
          mealType: type,
          key: `${day}-${i}`,
        },
      ];
    });
  });
export const sumMacros = (items: Array<Partial<MacroTotals>>): MacroTotals =>
  items.reduce<MacroTotals>(
    (a, x) => ({
      calories: a.calories + (x.calories || 0),
      protein: a.protein + (x.protein || 0),
      carbs: a.carbs + (x.carbs || 0),
      fat: a.fat + (x.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
