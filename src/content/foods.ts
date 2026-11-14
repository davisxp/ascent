/**
 * Seeded food database — ~80 foods per 100g + household measures.
 * Used by the fuel feature. All values per 100g edible portion.
 */

import type { Food } from '../domain/fuel'

const food = (o: unknown): Food => o as Food

export const foods: Food[] = [
  // Proteins
  food({ id: 'food-chicken-breast', name: 'Chicken Breast', brand: null, kcalPer100g: 165, proteinGPer100g: 31, fatGPer100g: 3.6, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 fillet', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-chicken-thigh', name: 'Chicken Thigh', brand: null, kcalPer100g: 209, proteinGPer100g: 26, fatGPer100g: 10.9, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 thigh', grams: 120 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-turkey-breast', name: 'Turkey Breast', brand: null, kcalPer100g: 135, proteinGPer100g: 30, fatGPer100g: 1, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '100g slice', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-lean-beef', name: 'Lean Beef Mince', brand: null, kcalPer100g: 240, proteinGPer100g: 26, fatGPer100g: 15, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 patty', grams: 120 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-salmon', name: 'Salmon', brand: null, kcalPer100g: 208, proteinGPer100g: 20, fatGPer100g: 13, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 fillet', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-cod', name: 'Cod', brand: null, kcalPer100g: 82, proteinGPer100g: 18, fatGPer100g: 0.7, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 fillet', grams: 140 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-eggs', name: 'Eggs', brand: null, kcalPer100g: 155, proteinGPer100g: 13, fatGPer100g: 11, carbsGPer100g: 1.1, category: 'Protein', householdMeasure: { name: '1 large egg', grams: 50 }, custom: false, createdAt: '2026-01-01T00:00:00' }),
  food({ id: 'food-egg-whites', name: 'Egg Whites', brand: null, kcalPer100g: 52, proteinGPer100g: 11, fatGPer100g: 0.2, carbsGPer100g: 0.7, category: 'Protein', householdMeasure: { name: '1 cup', grams: 240 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-greek-yogurt', name: 'Greek Yogurt (0% fat)', brand: null, kcalPer100g: 59, proteinGPer100g: 10, fatGPer100g: 0.4, carbsGPer100g: 3.6, category: 'Protein', householdMeasure: { name: '1 tub', grams: 170 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-cottage-cheese', name: 'Cottage Cheese', brand: null, kcalPer100g: 98, proteinGPer100g: 11, fatGPer100g: 4.3, carbsGPer100g: 3.4, category: 'Protein', householdMeasure: { name: '1 cup', grams: 220 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-tofu', name: 'Tofu (firm)', brand: null, kcalPer100g: 144, proteinGPer100g: 17, fatGPer100g: 8, carbsGPer100g: 3, category: 'Protein', householdMeasure: { name: '1 block', grams: 300 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-tempeh', name: 'Tempeh', brand: null, kcalPer100g: 193, proteinGPer100g: 19, fatGPer100g: 11, carbsGPer100g: 9, category: 'Protein', householdMeasure: { name: '1 package', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-lentils-cooked', name: 'Lentils (cooked)', brand: null, kcalPer100g: 116, proteinGPer100g: 9, fatGPer100g: 0.4, carbsGPer100g: 20, category: 'Protein', householdMeasure: { name: '1 cup', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-chickpeas-cooked', name: 'Chickpeas (cooked)', brand: null, kcalPer100g: 164, proteinGPer100g: 9, fatGPer100g: 2.6, carbsGPer100g: 27, category: 'Protein', householdMeasure: { name: '1 cup', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-black-beans', name: 'Black Beans (cooked)', brand: null, kcalPer100g: 132, proteinGPer100g: 9, fatGPer100g: 0.5, carbsGPer100g: 24, category: 'Protein', householdMeasure: { name: '1 cup', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-edamame', name: 'Edamame', brand: null, kcalPer100g: 122, proteinGPer100g: 11, fatGPer100g: 5, carbsGPer100g: 10, category: 'Protein', householdMeasure: { name: '1 cup', grams: 160 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

  // Grains & carbs
  food({ id: 'food-oats', name: 'Rolled Oats', brand: null, kcalPer100g: 379, proteinGPer100g: 13, fatGPer100g: 6.5, carbsGPer100g: 68, category: 'Grains', householdMeasure: { name: '1 cup dry', grams: 90 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-rice-white', name: 'White Rice (cooked)', brand: null, kcalPer100g: 130, proteinGPer100g: 2.7, fatGPer100g: 0.3, carbsGPer100g: 28, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 195 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-rice-brown', name: 'Brown Rice (cooked)', brand: null, kcalPer100g: 123, proteinGPer100g: 2.7, fatGPer100g: 0.9, carbsGPer100g: 26, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 195 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-quinoa-cooked', name: 'Quinoa (cooked)', brand: null, kcalPer100g: 120, proteinGPer100g: 4.4, fatGPer100g: 1.9, carbsGPer100g: 21, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 185 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-pasta-cooked', name: 'Pasta (cooked)', brand: null, kcalPer100g: 158, proteinGPer100g: 6, fatGPer100g: 0.8, carbsGPer100g: 31, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 140 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-bread-wholewheat', name: 'Whole Wheat Bread', brand: null, kcalPer100g: 247, proteinGPer100g: 13, fatGPer100g: 3.4, carbsGPer100g: 41, category: 'Grains', householdMeasure: { name: '1 slice', grams: 40 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-potato', name: 'Potato', brand: null, kcalPer100g: 77, proteinGPer100g: 2, fatGPer100g: 0.1, carbsGPer100g: 17, category: 'Grains', householdMeasure: { name: '1 medium', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-sweet-potato', name: 'Sweet Potato', brand: null, kcalPer100g: 86, proteinGPer100g: 1.6, fatGPer100g: 0.1, carbsGPer100g: 20, category: 'Grains', householdMeasure: { name: '1 medium', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-banana', name: 'Banana', brand: null, kcalPer100g: 89, proteinGPer100g: 1.1, fatGPer100g: 0.3, carbsGPer100g: 23, category: 'Grains', householdMeasure: { name: '1 medium', grams: 120 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

  // Fats
  food({ id: 'food-olive-oil', name: 'Olive Oil', brand: null, kcalPer100g: 884, proteinGPer100g: 0, fatGPer100g: 100, carbsGPer100g: 0, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 14 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-butter', name: 'Butter', brand: null, kcalPer100g: 717, proteinGPer100g: 0.8, fatGPer100g: 81, carbsGPer100g: 0.1, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 14 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-avocado', name: 'Avocado', brand: null, kcalPer100g: 160, proteinGPer100g: 2, fatGPer100g: 15, carbsGPer100g: 9, category: 'Fats', householdMeasure: { name: '1/2 avocado', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-almonds', name: 'Almonds', brand: null, kcalPer100g: 579, proteinGPer100g: 21, fatGPer100g: 50, carbsGPer100g: 22, category: 'Fats', householdMeasure: { name: '1 handful', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-peanut-butter', name: 'Peanut Butter', brand: null, kcalPer100g: 588, proteinGPer100g: 25, fatGPer100g: 50, carbsGPer100g: 20, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 16 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-cheese-cheddar', name: 'Cheddar Cheese', brand: null, kcalPer100g: 403, proteinGPer100g: 25, fatGPer100g: 33, carbsGPer100g: 1.3, category: 'Fats', householdMeasure: { name: '1 slice', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

  // Vegetables & fruit
  food({ id: 'food-spinach', name: 'Spinach', brand: null, kcalPer100g: 23, proteinGPer100g: 2.9, fatGPer100g: 0.4, carbsGPer100g: 3.6, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-broccoli', name: 'Broccoli', brand: null, kcalPer100g: 34, proteinGPer100g: 2.8, fatGPer100g: 0.4, carbsGPer100g: 7, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 90 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-carrot', name: 'Carrot', brand: null, kcalPer100g: 41, proteinGPer100g: 0.9, fatGPer100g: 0.2, carbsGPer100g: 10, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 60 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-cucumber', name: 'Cucumber', brand: null, kcalPer100g: 15, proteinGPer100g: 0.7, fatGPer100g: 0.1, carbsGPer100g: 3.6, category: 'Vegetables', householdMeasure: { name: '1/2 cucumber', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-tomato', name: 'Tomato', brand: null, kcalPer100g: 18, proteinGPer100g: 0.9, fatGPer100g: 0.2, carbsGPer100g: 3.9, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 120 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-apple', name: 'Apple', brand: null, kcalPer100g: 52, proteinGPer100g: 0.3, fatGPer100g: 0.2, carbsGPer100g: 14, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 180 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-blueberries', name: 'Blueberries', brand: null, kcalPer100g: 57, proteinGPer100g: 0.7, fatGPer100g: 0.3, carbsGPer100g: 14, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-strawberries', name: 'Strawberries', brand: null, kcalPer100g: 32, proteinGPer100g: 0.7, fatGPer100g: 0.3, carbsGPer100g: 8, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-orange', name: 'Orange', brand: null, kcalPer100g: 47, proteinGPer100g: 0.9, fatGPer100g: 0.1, carbsGPer100g: 12, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 140 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

  // Dairy / misc
  food({ id: 'food-milk', name: 'Milk (whole)', brand: null, kcalPer100g: 61, proteinGPer100g: 3.2, fatGPer100g: 3.3, carbsGPer100g: 4.8, category: 'Dairy', householdMeasure: { name: '1 glass', grams: 250 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-milk-almond', name: 'Almond Milk (unsweetened)', brand: null, kcalPer100g: 15, proteinGPer100g: 0.4, fatGPer100g: 1, carbsGPer100g: 0.6, category: 'Dairy', householdMeasure: { name: '1 glass', grams: 250 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
  food({ id: 'food-honey', name: 'Honey', brand: null, kcalPer100g: 304, proteinGPer100g: 0.3, fatGPer100g: 0, carbsGPer100g: 82, category: 'Misc', householdMeasure: { name: '1 tbsp', grams: 21 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

// Additional proteins
food({ id: 'food-pork-tenderloin', name: 'Pork Tenderloin', brand: null, kcalPer100g: 187, proteinGPer100g: 26, fatGPer100g: 7, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '100g', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-shrimp', name: 'Shrimp', brand: null, kcalPer100g: 99, proteinGPer100g: 21, fatGPer100g: 0.3, carbsGPer100g: 0.2, category: 'Protein', householdMeasure: { name: '100g', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-tuna-canned', name: 'Tuna (canned in water)', brand: null, kcalPer100g: 116, proteinGPer100g: 26, fatGPer100g: 0.8, carbsGPer100g: 0, category: 'Protein', householdMeasure: { name: '1 can', grams: 140 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-whey-protein', name: 'Whey Protein Powder', brand: null, kcalPer100g: 380, proteinGPer100g: 80, fatGPer100g: 5, carbsGPer100g: 7, category: 'Protein', householdMeasure: { name: '1 scoop', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-casein', name: 'Casein Protein Powder', brand: null, kcalPer100g: 370, proteinGPer100g: 78, fatGPer100g: 4, carbsGPer100g: 8, category: 'Protein', householdMeasure: { name: '1 scoop', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-seitan', name: 'Seitan', brand: null, kcalPer100g: 370, proteinGPer100g: 75, fatGPer100g: 2, carbsGPer100g: 14, category: 'Protein', householdMeasure: { name: '100g', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-edamame-pasta', name: 'Edamame Pasta (dry)', brand: null, kcalPer100g: 360, proteinGPer100g: 45, fatGPer100g: 5, carbsGPer100g: 35, category: 'Protein', householdMeasure: { name: '1 cup dry', grams: 90 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

// Additional grains/carbs
food({ id: 'food-ramen', name: 'Instant Ramen (dry)', brand: null, kcalPer100g: 470, proteinGPer100g: 10, fatGPer100g: 18, carbsGPer100g: 65, category: 'Grains', householdMeasure: { name: '1 block', grams: 85 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-couscous', name: 'Couscous (cooked)', brand: null, kcalPer100g: 112, proteinGPer100g: 3.8, fatGPer100g: 0.2, carbsGPer100g: 23, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 170 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-barley', name: 'Barley (cooked)', brand: null, kcalPer100g: 123, proteinGPer100g: 2.6, fatGPer100g: 0.4, carbsGPer100g: 26, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 160 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-buckwheat', name: 'Buckwheat (cooked)', brand: null, kcalPer100g: 92, proteinGPer100g: 3.4, fatGPer100g: 0.6, carbsGPer100g: 20, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-bagel', name: 'Bagel', brand: null, kcalPer100g: 250, proteinGPer100g: 10, fatGPer100g: 1.5, carbsGPer100g: 49, category: 'Grains', householdMeasure: { name: '1 bagel', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-tortilla', name: 'Flour Tortilla', brand: null, kcalPer100g: 300, proteinGPer100g: 8, fatGPer100g: 7, carbsGPer100g: 50, category: 'Grains', householdMeasure: { name: '1 tortilla', grams: 60 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-corn', name: 'Sweet Corn', brand: null, kcalPer100g: 86, proteinGPer100g: 3, fatGPer100g: 1, carbsGPer100g: 19, category: 'Grains', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-pearled-couscous', name: 'Pearl Couscous (cooked)', brand: null, kcalPer100g: 135, proteinGPer100g: 4, fatGPer100g: 0.3, carbsGPer100g: 28, category: 'Grains', householdMeasure: { name: '1 cup cooked', grams: 160 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-apple-sauce', name: 'Apple Sauce (unsweetened)', brand: null, kcalPer100g: 68, proteinGPer100g: 0.2, fatGPer100g: 0.1, carbsGPer100g: 17, category: 'Grains', householdMeasure: { name: '1 cup', grams: 250 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

// Additional fats
food({ id: 'food-coconut-oil', name: 'Coconut Oil', brand: null, kcalPer100g: 862, proteinGPer100g: 0, fatGPer100g: 100, carbsGPer100g: 0, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 14 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-walnuts', name: 'Walnuts', brand: null, kcalPer100g: 654, proteinGPer100g: 15, fatGPer100g: 65, carbsGPer100g: 14, category: 'Fats', householdMeasure: { name: '1 handful', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-cashews', name: 'Cashews', brand: null, kcalPer100g: 553, proteinGPer100g: 18, fatGPer100g: 44, carbsGPer100g: 30, category: 'Fats', householdMeasure: { name: '1 handful', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-chia-seeds', name: 'Chia Seeds', brand: null, kcalPer100g: 486, proteinGPer100g: 17, fatGPer100g: 31, carbsGPer100g: 42, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 12 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-flax-seeds', name: 'Flax Seeds', brand: null, kcalPer100g: 534, proteinGPer100g: 18, fatGPer100g: 42, carbsGPer100g: 29, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 10 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-pumpkin-seeds', name: 'Pumpkin Seeds', brand: null, kcalPer100g: 559, proteinGPer100g: 30, fatGPer100g: 49, carbsGPer100g: 11, category: 'Fats', householdMeasure: { name: '1 handful', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-sunflower-seeds', name: 'Sunflower Seeds', brand: null, kcalPer100g: 584, proteinGPer100g: 21, fatGPer100g: 51, carbsGPer100g: 20, category: 'Fats', householdMeasure: { name: '1 handful', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-cream-cheese', name: 'Cream Cheese', brand: null, kcalPer100g: 342, proteinGPer100g: 6, fatGPer100g: 34, carbsGPer100g: 5, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 30 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-mayo', name: 'Mayonnaise', brand: null, kcalPer100g: 680, proteinGPer100g: 1, fatGPer100g: 75, carbsGPer100g: 1, category: 'Fats', householdMeasure: { name: '1 tbsp', grams: 14 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

// Additional vegetables & fruit
food({ id: 'food-kale', name: 'Kale', brand: null, kcalPer100g: 49, proteinGPer100g: 4.3, fatGPer100g: 0.9, carbsGPer100g: 9, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 70 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-brussels-sprouts', name: 'Brussels Sprouts', brand: null, kcalPer100g: 43, proteinGPer100g: 3.4, fatGPer100g: 0.3, carbsGPer100g: 9, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 90 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-cauliflower', name: 'Cauliflower', brand: null, kcalPer100g: 25, proteinGPer100g: 2, fatGPer100g: 0.3, carbsGPer100g: 5, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 100 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-zucchini', name: 'Zucchini', brand: null, kcalPer100g: 17, proteinGPer100g: 1.2, fatGPer100g: 0.3, carbsGPer100g: 3, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 200 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-bell-pepper', name: 'Bell Pepper', brand: null, kcalPer100g: 31, proteinGPer100g: 1, fatGPer100g: 0.3, carbsGPer100g: 6, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-onion', name: 'Onion', brand: null, kcalPer100g: 40, proteinGPer100g: 1.1, fatGPer100g: 0.1, carbsGPer100g: 9, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 110 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-garlic', name: 'Garlic', brand: null, kcalPer100g: 149, proteinGPer100g: 6.4, fatGPer100g: 0.5, carbsGPer100g: 33, category: 'Vegetables', householdMeasure: { name: '1 clove', grams: 3 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-lemon', name: 'Lemon', brand: null, kcalPer100g: 29, proteinGPer100g: 1.1, fatGPer100g: 0.3, carbsGPer100g: 9, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 80 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-lime', name: 'Lime', brand: null, kcalPer100g: 30, proteinGPer100g: 0.7, fatGPer100g: 0.2, carbsGPer100g: 11, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 70 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-grapes', name: 'Grapes', brand: null, kcalPer100g: 69, proteinGPer100g: 0.7, fatGPer100g: 0.2, carbsGPer100g: 18, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-mango', name: 'Mango', brand: null, kcalPer100g: 60, proteinGPer100g: 0.8, fatGPer100g: 0.4, carbsGPer100g: 15, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 170 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-pineapple', name: 'Pineapple', brand: null, kcalPer100g: 50, proteinGPer100g: 0.5, fatGPer100g: 0.1, carbsGPer100g: 13, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 160 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-kiwi', name: 'Kiwi', brand: null, kcalPer100g: 61, proteinGPer100g: 1.1, fatGPer100g: 0.5, carbsGPer100g: 15, category: 'Vegetables', householdMeasure: { name: '1 medium', grams: 80 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-papaya', name: 'Papaya', brand: null, kcalPer100g: 43, proteinGPer100g: 0.5, fatGPer100g: 0.3, carbsGPer100g: 11, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-watermelon', name: 'Watermelon', brand: null, kcalPer100g: 30, proteinGPer100g: 0.6, fatGPer100g: 0.2, carbsGPer100g: 8, category: 'Vegetables', householdMeasure: { name: '1 cup', grams: 150 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),

// Dairy / misc continued
food({ id: 'food-kefir', name: 'Kefir', brand: null, kcalPer100g: 42, proteinGPer100g: 3, fatGPer100g: 1, carbsGPer100g: 4, category: 'Dairy', householdMeasure: { name: '1 glass', grams: 250 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-ricotta', name: 'Ricotta Cheese', brand: null, kcalPer100g: 174, proteinGPer100g: 11, fatGPer100g: 13, carbsGPer100g: 5, category: 'Dairy', householdMeasure: { name: '1/2 cup', grams: 120 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-parmesan', name: 'Parmesan Cheese', brand: null, kcalPer100g: 431, proteinGPer100g: 38, fatGPer100g: 29, carbsGPer100g: 4, category: 'Dairy', householdMeasure: { name: '1 tbsp grated', grams: 10 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-dark-chocolate', name: 'Dark Chocolate (70%+)', brand: null, kcalPer100g: 546, proteinGPer100g: 7, fatGPer100g: 35, carbsGPer100g: 46, category: 'Misc', householdMeasure: { name: '1 square', grams: 10 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-maple-syrup', name: 'Maple Syrup', brand: null, kcalPer100g: 260, proteinGPer100g: 0, fatGPer100g: 0, carbsGPer100g: 67, category: 'Misc', householdMeasure: { name: '1 tbsp', grams: 20 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
food({ id: 'food-cocoa-powder', name: 'Cocoa Powder (unsweetened)', brand: null, kcalPer100g: 228, proteinGPer100g: 20, fatGPer100g: 14, carbsGPer100g: 14, category: 'Misc', householdMeasure: { name: '1 tbsp', grams: 5 }, custom: false, createdAt: '2026-01-01T00:00:00Z' }),
]

export const foodCount = foods.length

