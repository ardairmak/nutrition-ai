import { apiCall } from "./api";

export interface UserMetrics {
  gender: "male" | "female";
  age: number;
  height: number; // in cm
  weight: number; // in kg
  activityLevel: string;
  fitnessGoals: string[];
  targetWeight?: number; // in kg
}

export interface CalorieCalculationResult {
  bmr: number;
  tdee: number;
  dailyCalorieGoal: number;
  macroGoals: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WeightInsight {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  weightLost: number;
  weightToGo: number;
  progressPercentage: number;
  estimatedTimeToGoal: number; // weeks
  averageWeeklyChange: number;
  trend: "gaining" | "losing" | "maintaining";
  isOnTrack: boolean;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(
  gender: "male" | "female",
  age: number,
  height: number,
  weight: number
): number {
  const baseCalculation = 10 * weight + 6.25 * height - 5 * age;

  if (gender === "male") {
    return baseCalculation + 5;
  } else {
    return baseCalculation - 161;
  }
}

/**
 * Get activity multiplier based on activity level
 */
export function getActivityMultiplier(activityLevel: string): number {
  const activityMultipliers = {
    sedentary: 1.2, // Little to no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    active: 1.725, // Heavy exercise 6-7 days/week
    "very active": 1.9, // Very heavy exercise, physical job
    "extremely active": 1.9, // Extremely active
  };

  const multiplier =
    activityMultipliers[
      activityLevel.toLowerCase() as keyof typeof activityMultipliers
    ] || 1.55;
  return multiplier;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = getActivityMultiplier(activityLevel);
  return Math.round(bmr * multiplier);
}

/**
 * Determine weight change rate based on fitness goals
 */
export function getWeightChangeRate(fitnessGoals: string[]): number {
  // Default to 0.5 kg per week for weight loss/gain
  if (
    fitnessGoals.includes("weight_loss") ||
    fitnessGoals.includes("lose_weight")
  ) {
    return -0.5; // Lose 0.5 kg per week
  } else if (
    fitnessGoals.includes("weight_gain") ||
    fitnessGoals.includes("gain_weight")
  ) {
    return 0.5; // Gain 0.5 kg per week
  } else if (fitnessGoals.includes("muscle_gain")) {
    return 0.25; // Slight weight gain for muscle building
  }
  return 0; // Maintain weight
}

/**
 * Calculate daily calorie goal based on user metrics and goals
 */
export function calculateDailyCalorieGoal(
  userMetrics: UserMetrics
): CalorieCalculationResult {
  const {
    gender,
    age,
    height,
    weight,
    activityLevel,
    fitnessGoals,
    targetWeight,
  } = userMetrics;

  // Calculate BMR
  const bmr = calculateBMR(gender, age, height, weight);

  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);

  // Determine weight change rate
  let weightChangeRate = getWeightChangeRate(fitnessGoals);

  // If target weight is specified, adjust rate based on difference
  if (targetWeight && targetWeight !== weight) {
    const weightDifference = targetWeight - weight;
    if (Math.abs(weightDifference) > 0.1) {
      // Only if significant difference
      weightChangeRate = weightDifference > 0 ? 0.5 : -0.5;
    }
  }

  // Calculate calorie adjustment (1 kg = ~7700 calories)
  const calorieAdjustment = Math.round((weightChangeRate * 7700) / 7);

  // Calculate daily calorie goal
  const dailyCalorieGoal = Math.max(1200, tdee + calorieAdjustment); // Minimum 1200 calories

  // Calculate macro goals (standard distribution)
  // Protein: 25-30% of calories (4 cal/g)
  // Carbs: 45-50% of calories (4 cal/g)
  // Fat: 20-25% of calories (9 cal/g)
  const proteinGoal = Math.round((dailyCalorieGoal * 0.25) / 4);
  const carbsGoal = Math.round((dailyCalorieGoal * 0.45) / 4);
  const fatGoal = Math.round((dailyCalorieGoal * 0.25) / 9);

  return {
    bmr,
    tdee,
    dailyCalorieGoal,
    macroGoals: {
      protein: proteinGoal,
      carbs: carbsGoal,
      fat: fatGoal,
    },
  };
}

/**
 * Calculate weight insights from weight history
 */
export function calculateWeightInsights(
  weightEntries: Array<{ weight: number; recordedAt: string }>,
  targetWeight: number
): WeightInsight | null {
  if (weightEntries.length === 0) return null;

  // Sort entries by date
  const sortedEntries = [...weightEntries].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const currentWeight = sortedEntries[sortedEntries.length - 1].weight;
  const startWeight = sortedEntries[0].weight;
  const weightLost = startWeight - currentWeight;
  const weightToGo = Math.abs(currentWeight - targetWeight);

  // Calculate progress percentage
  const totalWeightToLose = Math.abs(startWeight - targetWeight);
  const progressPercentage =
    totalWeightToLose > 0
      ? Math.min(
          100,
          Math.max(0, (Math.abs(weightLost) / totalWeightToLose) * 100)
        )
      : 0;

  // Calculate average weekly change (if we have enough data)
  let averageWeeklyChange = 0;
  if (sortedEntries.length >= 2) {
    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const daysDifference =
      (new Date(lastEntry.recordedAt).getTime() -
        new Date(firstEntry.recordedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    const weeksDifference = daysDifference / 7;

    if (weeksDifference > 0) {
      averageWeeklyChange =
        (lastEntry.weight - firstEntry.weight) / weeksDifference;
    }
  }

  // Determine trend
  let trend: "gaining" | "losing" | "maintaining" = "maintaining";
  if (Math.abs(averageWeeklyChange) > 0.1) {
    trend = averageWeeklyChange > 0 ? "gaining" : "losing";
  }

  // Estimate time to goal
  let estimatedTimeToGoal = 0;
  if (Math.abs(averageWeeklyChange) > 0.05) {
    estimatedTimeToGoal = Math.abs(weightToGo / averageWeeklyChange);
  }

  // Check if on track (within reasonable range of expected progress)
  const expectedWeeklyChange = targetWeight > currentWeight ? 0.5 : -0.5;
  const isOnTrack = Math.abs(averageWeeklyChange - expectedWeeklyChange) < 0.3;

  return {
    currentWeight,
    targetWeight,
    startWeight,
    weightLost,
    weightToGo,
    progressPercentage,
    estimatedTimeToGoal,
    averageWeeklyChange,
    trend,
    isOnTrack,
  };
}

/**
 * Update user's calorie goals on the server
 */
export async function updateUserCalorieGoals(userMetrics: UserMetrics) {
  try {
    const calculation = calculateDailyCalorieGoal(userMetrics);

    const response = await apiCall("/api/users/profile", "PUT", {
      dailyCalorieGoal: calculation.dailyCalorieGoal,
      proteinGoal: calculation.macroGoals.protein,
      carbsGoal: calculation.macroGoals.carbs,
      fatGoal: calculation.macroGoals.fat,
    });

    return {
      success: true,
      goals: calculation,
      response,
    };
  } catch (error) {
    console.error("Error updating calorie goals:", error);
    return {
      success: false,
      error: "Failed to update calorie goals",
    };
  }
}

// Export a default object with methods for compatibility with ProgressScreen
class CalorieCalculationService {
  calculateBMR = calculateBMR;
  calculateTDEE = calculateTDEE;
  calculateDailyCalorieGoal = calculateDailyCalorieGoal;
  calculateWeightInsights = calculateWeightInsights;
  getActivityMultiplier = getActivityMultiplier;
  getWeightChangeRate = getWeightChangeRate;
  updateUserCalorieGoals = updateUserCalorieGoals;
}

export default new CalorieCalculationService();
