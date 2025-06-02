import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import OpenAI from "openai";

// Initialize OpenAI (you'll need to add OPENAI_API_KEY to your .env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Declare global type for rate limiting
declare global {
  var userRequestTimes: Map<string, number[]> | undefined;
}

interface AnalyticsData {
  weightAnalytics: any;
  calorieAnalytics: any;
  goalProgress: any;
  aiInsights: any;
  recommendations: any[];
}

/**
 * Get comprehensive analytics for user progress
 */
export async function getComprehensiveAnalytics(
  req: AuthRequest,
  res: Response
) {
  try {
    console.log("🔍 Analytics Controller - Starting...");
    const userId = req.user?.id;
    if (!userId) {
      console.log("❌ No user ID found");
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    console.log("👤 User ID:", userId);
    const {
      timeframe = "1M",
      includeAI = true,
      includeFoodRecommendations = true,
    } = req.body;

    console.log("📊 Request params:", {
      timeframe,
      includeAI,
      includeFoodRecommendations,
    });

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weight: true,
        targetWeight: true,
        height: true,
        dateOfBirth: true,
        gender: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        allergies: true,
        dietaryPreferences: true,
      },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(404).json({ success: false, error: "User not found" });
    }

    console.log("✅ User found:", {
      weight: user.weight,
      targetWeight: user.targetWeight,
    });

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case "1W":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "3M":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "6M":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "1Y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Get weight history
    const weightHistory = await prisma.weightHistory.findMany({
      where: {
        userId,
        recordedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { recordedAt: "asc" },
    });

    console.log("📈 Weight history entries:", weightHistory.length);

    // Get meal entries
    const mealEntries = await prisma.mealEntry.findMany({
      where: {
        userId,
        consumedAt: { gte: startDate, lte: endDate },
      },
      include: { foodItems: true },
      orderBy: { consumedAt: "asc" },
    });

    console.log("🍽️ Meal entries:", mealEntries.length);

    // Analyze weight data
    const weightAnalytics = analyzeWeightData(weightHistory, user);
    console.log("📊 Weight analytics:", {
      currentWeight: weightAnalytics.currentWeight,
      trendDirection: weightAnalytics.trendDirection,
    });

    // Analyze calorie data
    const calorieAnalytics = analyzeCalorieData(mealEntries, user);
    console.log("🔥 Calorie analytics:", {
      averageDailyCalories: calorieAnalytics.averageDailyCalories,
    });

    // Analyze goal progress
    const goalProgress = analyzeGoalProgress(
      user,
      weightAnalytics,
      calorieAnalytics
    );
    console.log("🎯 Goal progress:", {
      status: goalProgress.status,
      goalType: goalProgress.goalType,
    });

    // Generate AI insights
    let aiInsights = null;
    if (includeAI && process.env.OPENAI_API_KEY) {
      aiInsights = await generateAIInsights(
        user,
        weightAnalytics,
        calorieAnalytics,
        goalProgress
      );
    }

    // Generate recommendations
    let recommendations: any[] = [];
    if (includeFoodRecommendations && process.env.OPENAI_API_KEY) {
      recommendations = await generateFoodRecommendations(user, mealEntries);
    }

    const analyticsData: AnalyticsData = {
      weightAnalytics,
      calorieAnalytics,
      goalProgress,
      aiInsights,
      recommendations,
    };

    console.log("✅ Analytics data prepared, sending response...");
    console.log("📤 Response structure:", {
      hasWeightAnalytics: !!analyticsData.weightAnalytics,
      hasCalorieAnalytics: !!analyticsData.calorieAnalytics,
      hasGoalProgress: !!analyticsData.goalProgress,
      hasAiInsights: !!analyticsData.aiInsights,
      recommendationsCount: analyticsData.recommendations.length,
    });

    return res.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error("❌ Analytics Controller Error:", error);
    logger.error("Error generating analytics:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate analytics" });
  }
}

/**
 * Analyze weight data and trends
 */
function analyzeWeightData(weightHistory: any[], user: any) {
  if (weightHistory.length === 0) {
    return {
      currentWeight: user.weight || 0,
      startWeight: user.weight || 0,
      targetWeight: user.targetWeight || 0,
      weightChange: 0,
      weeklyTrend: 0,
      monthlyTrend: 0,
      progressPercentage: 0,
      timeToGoal: 0,
      isOnTrack: false,
      trendDirection: "stable",
      chartData: { labels: [], weights: [], trendLine: [] },
    };
  }

  const sortedHistory = weightHistory.sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  // Use profile weight as current weight (most up-to-date)
  // Use weight history for trends and starting point
  const currentWeight =
    user.weight || sortedHistory[sortedHistory.length - 1].weight;
  const startWeight = sortedHistory[0].weight;
  const targetWeight = user.targetWeight || currentWeight;
  const weightChange = currentWeight - startWeight;

  console.log("🔍 Weight calculation:", {
    profileWeight: user.weight,
    historyLatest: sortedHistory[sortedHistory.length - 1].weight,
    usingCurrentWeight: currentWeight,
    startWeight,
    weightChange,
  });

  // Calculate trends
  const weeklyTrend = calculateTrend(sortedHistory, 7);
  const monthlyTrend = calculateTrend(sortedHistory, 30);

  // Determine goal type first (needed for progress calculation)
  const goalType =
    user.fitnessGoals?.includes("weight_loss") ||
    user.fitnessGoals?.includes("lose_weight")
      ? "weight_loss"
      : user.fitnessGoals?.includes("weight_gain") ||
        user.fitnessGoals?.includes("gain_weight")
      ? "weight_gain"
      : user.fitnessGoals?.includes("muscle_gain") ||
        user.fitnessGoals?.includes("build_muscle") ||
        user.fitnessGoals?.includes("muscle_building")
      ? "muscle_gain"
      : "maintenance";

  console.log("🎯 Goal parsing:", {
    userGoals: user.fitnessGoals,
    parsedGoalType: goalType,
  });

  // Calculate progress percentage (goal-aware)
  let progressPercentage = 0;
  const totalWeightChange = Math.abs(startWeight - targetWeight);

  if (totalWeightChange > 0) {
    if (goalType === "weight_loss") {
      // For weight loss: progress = how much weight lost / total needed to lose
      const weightLost = startWeight - currentWeight; // Positive if lost weight
      progressPercentage = Math.max(0, (weightLost / totalWeightChange) * 100);
    } else if (goalType === "weight_gain" || goalType === "muscle_gain") {
      // For weight gain: progress = how much weight gained / total needed to gain
      const weightGained = currentWeight - startWeight; // Positive if gained weight
      progressPercentage = Math.max(
        0,
        (weightGained / totalWeightChange) * 100
      );
    } else {
      // For maintenance: progress based on staying close to target
      const deviation = Math.abs(currentWeight - targetWeight);
      const allowedDeviation = targetWeight * 0.05; // 5% tolerance
      progressPercentage = Math.max(
        0,
        100 - (deviation / allowedDeviation) * 100
      );
    }
  }

  // Cap at 100%
  progressPercentage = Math.min(100, progressPercentage);

  console.log("📊 Progress calculation:", {
    goalType,
    startWeight,
    currentWeight,
    targetWeight,
    progressPercentage: progressPercentage.toFixed(1),
  });

  // Estimate time to goal
  const timeToGoal =
    weeklyTrend !== 0
      ? Math.abs((targetWeight - currentWeight) / weeklyTrend)
      : 0;

  // Determine if on track
  const expectedWeeklyLoss = user.fitnessGoals?.includes("weight_loss")
    ? 0.5
    : user.fitnessGoals?.includes("weight_gain")
    ? -0.5
    : 0;
  const isOnTrack = Math.abs(weeklyTrend - expectedWeeklyLoss) <= 0.3;

  let trendDirection = "stable";
  if (goalType === "weight_loss" && weeklyTrend < -0.1)
    trendDirection = "improving";
  else if (goalType === "weight_loss" && weeklyTrend > 0.1)
    trendDirection = "declining";
  else if (goalType === "weight_gain" && weeklyTrend > 0.1)
    trendDirection = "improving";
  else if (goalType === "weight_gain" && weeklyTrend < -0.1)
    trendDirection = "declining";

  // Prepare chart data
  const historyLabels = sortedHistory.map((entry) =>
    new Date(entry.recordedAt).toLocaleDateString()
  );
  const historyWeights = sortedHistory.map((entry) => entry.weight);

  // Add current profile weight if it's different from last history entry
  const shouldAddCurrent =
    user.weight &&
    user.weight !== sortedHistory[sortedHistory.length - 1].weight;

  const chartData = {
    labels: shouldAddCurrent ? [...historyLabels, "Today"] : historyLabels,
    weights: shouldAddCurrent
      ? [...historyWeights, user.weight]
      : historyWeights,
    trendLine: calculateTrendLine(sortedHistory),
  };

  return {
    currentWeight,
    startWeight,
    targetWeight,
    weightChange,
    weeklyTrend,
    monthlyTrend,
    progressPercentage,
    timeToGoal,
    isOnTrack,
    trendDirection,
    chartData,
  };
}

/**
 * Analyze calorie and nutrition data
 */
function analyzeCalorieData(mealEntries: any[], user: any) {
  if (mealEntries.length === 0) {
    return {
      averageDailyCalories: 0,
      calorieGoal: user.dailyCalorieGoal || 2000,
      weeklyAverage: 0,
      monthlyAverage: 0,
      adherenceRate: 0,
      calorieDeficit: 0,
      projectedWeightLoss: 0,
      bestDay: "",
      worstDay: "",
      chartData: { labels: [], calories: [], goals: [] },
      macroTrends: {
        protein: { average: 0, goal: user.proteinGoal || 150, trend: "stable" },
        carbs: { average: 0, goal: user.carbsGoal || 200, trend: "stable" },
        fat: { average: 0, goal: user.fatGoal || 65, trend: "stable" },
      },
    };
  }

  // Group meals by day
  const dailyCalories = new Map<string, number>();
  const dailyMacros = new Map<
    string,
    { protein: number; carbs: number; fat: number }
  >();

  mealEntries.forEach((meal) => {
    const date = new Date(meal.consumedAt).toDateString();
    const currentCalories = dailyCalories.get(date) || 0;
    dailyCalories.set(date, currentCalories + meal.totalCalories);

    const currentMacros = dailyMacros.get(date) || {
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    dailyMacros.set(date, {
      protein: currentMacros.protein + meal.totalProtein,
      carbs: currentMacros.carbs + meal.totalCarbs,
      fat: currentMacros.fat + meal.totalFat,
    });
  });

  const calorieValues = Array.from(dailyCalories.values());
  const averageDailyCalories =
    calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length;

  // Calculate adherence rate
  const calorieGoal = user.dailyCalorieGoal || 2000;
  const adherenceRate =
    (calorieValues.filter(
      (cal) => Math.abs(cal - calorieGoal) <= calorieGoal * 0.1
    ).length /
      calorieValues.length) *
    100;

  // Find best and worst days
  const sortedDays = Array.from(dailyCalories.entries()).sort(
    (a, b) => Math.abs(a[1] - calorieGoal) - Math.abs(b[1] - calorieGoal)
  );
  const bestDay = sortedDays[0]?.[0] || "";
  const worstDay = sortedDays[sortedDays.length - 1]?.[0] || "";

  // Calculate macro averages
  const macroValues = Array.from(dailyMacros.values());
  const avgProtein =
    macroValues.reduce((a, b) => a + b.protein, 0) / macroValues.length;
  const avgCarbs =
    macroValues.reduce((a, b) => a + b.carbs, 0) / macroValues.length;
  const avgFat =
    macroValues.reduce((a, b) => a + b.fat, 0) / macroValues.length;

  // Prepare chart data
  const chartData = {
    labels: Array.from(dailyCalories.keys()).slice(-14), // Last 14 days
    calories: Array.from(dailyCalories.values()).slice(-14),
    goals: new Array(Math.min(14, dailyCalories.size)).fill(calorieGoal),
  };

  return {
    averageDailyCalories,
    calorieGoal,
    weeklyAverage: averageDailyCalories,
    monthlyAverage: averageDailyCalories,
    adherenceRate,
    calorieDeficit: calorieGoal - averageDailyCalories,
    projectedWeightLoss: ((calorieGoal - averageDailyCalories) * 7) / 7700, // kg per week
    bestDay,
    worstDay,
    chartData,
    macroTrends: {
      protein: {
        average: avgProtein,
        goal: user.proteinGoal || 150,
        trend: "stable",
      },
      carbs: {
        average: avgCarbs,
        goal: user.carbsGoal || 200,
        trend: "stable",
      },
      fat: { average: avgFat, goal: user.fatGoal || 65, trend: "stable" },
    },
  };
}

/**
 * Analyze goal progress
 */
function analyzeGoalProgress(
  user: any,
  weightAnalytics: any,
  calorieAnalytics: any
) {
  const primaryGoal = user.fitnessGoals?.[0] || "maintenance";
  const goalType =
    user.fitnessGoals?.includes("weight_loss") ||
    user.fitnessGoals?.includes("lose_weight")
      ? "weight_loss"
      : user.fitnessGoals?.includes("weight_gain") ||
        user.fitnessGoals?.includes("gain_weight")
      ? "weight_gain"
      : user.fitnessGoals?.includes("muscle_gain") ||
        user.fitnessGoals?.includes("build_muscle") ||
        user.fitnessGoals?.includes("muscle_building")
      ? "muscle_gain"
      : "maintenance";

  let expectedProgress = 0;
  let actualProgress = weightAnalytics.weightChange;

  // Calculate expected progress based on goal type
  if (goalType === "weight_loss") {
    expectedProgress = -2; // 2kg loss per month
  } else if (goalType === "weight_gain" || goalType === "muscle_gain") {
    expectedProgress = 2; // 2kg gain per month (muscle gain typically involves weight gain)
  }

  const variance = Math.abs(actualProgress - expectedProgress);

  // Determine status
  let status = "good";
  if (variance <= 0.5) status = "excellent";
  else if (variance <= 1) status = "good";
  else if (variance <= 2) status = "concerning";
  else status = "off_track";

  const daysToGoal = weightAnalytics.timeToGoal * 7;
  const successProbability = calculateSuccessProbability(
    actualProgress,
    expectedProgress,
    weightAnalytics.weeklyTrend
  );

  return {
    primaryGoal,
    goalType,
    expectedProgress,
    actualProgress,
    variance,
    status,
    daysToGoal,
    successProbability,
  };
}

/**
 * Generate AI-powered insights using OpenAI
 */
async function generateAIInsights(
  user: any,
  weightAnalytics: any,
  calorieAnalytics: any,
  goalProgress: any
) {
  try {
    const prompt = `
    Analyze this user's fitness progress and provide personalized insights:

    User Profile:
    - Goals: ${user.fitnessGoals?.join(", ") || "Not specified"}
    - Target Weight: ${user.targetWeight}kg
    - Allergies: ${user.allergies?.join(", ") || "None"}
    - Dietary Preferences: ${user.dietaryPreferences?.join(", ") || "None"}

    Weight Progress:
    - Current Weight: ${weightAnalytics.currentWeight}kg
    - Weight Change: ${weightAnalytics.weightChange}kg
    - Weekly Trend: ${weightAnalytics.weeklyTrend}kg/week
    - Progress: ${weightAnalytics.progressPercentage}%
    - Trend Direction: ${weightAnalytics.trendDirection}

    Calorie Data:
    - Average Daily Calories: ${calorieAnalytics.averageDailyCalories}
    - Calorie Goal: ${calorieAnalytics.calorieGoal}
    - Adherence Rate: ${calorieAnalytics.adherenceRate}%
    - Calorie Deficit: ${calorieAnalytics.calorieDeficit}

    Goal Progress:
    - Status: ${goalProgress.status}
    - Success Probability: ${goalProgress.successProbability}%

    Provide a JSON response with:
    {
      "summary": "Brief overall assessment (2-3 sentences)",
      "keyFindings": ["3-4 key insights"],
      "concerns": ["Any concerning patterns"],
      "achievements": ["Positive achievements to celebrate"],
      "actionItems": ["3-4 specific actionable recommendations"],
      "motivationalMessage": "Encouraging message",
      "weeklyScore": number (0-100 based on overall progress)
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error("Error generating AI insights:", error);
  }

  // Fallback insights
  return {
    summary: "Your progress is being tracked. Keep up the good work!",
    keyFindings: [
      "Weight trend is being monitored",
      "Calorie intake is recorded",
    ],
    concerns: [],
    achievements: ["Consistent tracking"],
    actionItems: ["Continue logging meals", "Monitor weight regularly"],
    motivationalMessage: "Every step counts towards your goals!",
    weeklyScore: 75,
  };
}

/**
 * Generate personalized food recommendations
 */
async function generateFoodRecommendations(user: any, recentMeals: any[]) {
  try {
    const recentFoods = recentMeals
      .slice(-10)
      .map((meal) => meal.mealName)
      .join(", ");

    const prompt = `
    Generate personalized food recommendations for a user with:
    - Goals: ${user.fitnessGoals?.join(", ") || "general health"}
    - Allergies: ${user.allergies?.join(", ") || "none"}
    - Dietary Preferences: ${user.dietaryPreferences?.join(", ") || "none"}
    - Recent meals: ${recentFoods}

    Provide 3-5 food recommendations as JSON array:
    [
      {
        "type": "food",
        "title": "Food name",
        "description": "Why this food is good for their goals",
        "priority": "high|medium|low",
        "actionable": true,
        "estimatedImpact": "Brief impact description"
      }
    ]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error("Error generating food recommendations:", error);
  }

  // Fallback recommendations
  return [
    {
      type: "food",
      title: "Lean Protein",
      description: "Include chicken, fish, or tofu in your meals",
      priority: "high",
      actionable: true,
      estimatedImpact: "Supports muscle maintenance and satiety",
    },
  ];
}

/**
 * Helper functions
 */
function calculateTrend(weightHistory: any[], days: number): number {
  if (weightHistory.length < 2) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = weightHistory.filter(
    (entry) => new Date(entry.recordedAt) >= cutoffDate
  );

  if (recentEntries.length < 2) return 0;

  const firstWeight = recentEntries[0].weight;
  const lastWeight = recentEntries[recentEntries.length - 1].weight;
  const timeSpan =
    (new Date(recentEntries[recentEntries.length - 1].recordedAt).getTime() -
      new Date(recentEntries[0].recordedAt).getTime()) /
    (1000 * 60 * 60 * 24);

  // Safety check: If time span is too small (less than 1 day), return 0 to avoid extreme values
  if (timeSpan < 1) return 0;

  // Calculate weekly rate but cap extreme values
  const weeklyRate = ((lastWeight - firstWeight) / timeSpan) * 7;

  // Cap the trend at reasonable values (-10 to +10 kg/week)
  // This prevents display of unrealistic values like 3000kg/week
  return Math.max(-10, Math.min(10, weeklyRate));
}

function calculateTrendLine(weightHistory: any[]): number[] {
  // Simple linear regression for trend line
  const n = weightHistory.length;
  if (n < 2) return [];

  const xValues = weightHistory.map((_, index) => index);
  const yValues = weightHistory.map((entry) => entry.weight);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return xValues.map((x) => slope * x + intercept);
}

function calculateSuccessProbability(
  actualProgress: number,
  expectedProgress: number,
  weeklyTrend: number
): number {
  const progressRatio =
    expectedProgress !== 0 ? actualProgress / expectedProgress : 1;
  const trendFactor = Math.abs(weeklyTrend) > 0.1 ? 1.2 : 0.8;

  let probability = progressRatio * 50 * trendFactor;
  return Math.max(0, Math.min(100, probability));
}

/**
 * Get AI insights only
 */
export async function getAIInsights(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { query, includeMotivation = true } = req.body;

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weight: true,
        targetWeight: true,
        height: true,
        dateOfBirth: true,
        gender: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        allergies: true,
        dietaryPreferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get recent data for context
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1); // Last month

    const weightHistory = await prisma.weightHistory.findMany({
      where: {
        userId,
        recordedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { recordedAt: "desc" },
      take: 10,
    });

    const recentMeals = await prisma.mealEntry.findMany({
      where: {
        userId,
        consumedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { consumedAt: "desc" },
      take: 20,
    });

    // Generate AI response
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `
        You are a helpful AI nutrition assistant. Answer the user's question based on their personal data.

        User Profile:
        - Goals: ${user.fitnessGoals?.join(", ") || "general health"}
        - Current Weight: ${user.weight}kg
        - Target Weight: ${user.targetWeight}kg
        - Allergies: ${user.allergies?.join(", ") || "none"}
        - Dietary Preferences: ${user.dietaryPreferences?.join(", ") || "none"}
        - Recent Weight Trend: ${
          weightHistory.length > 1
            ? weightHistory[0].weight -
                weightHistory[weightHistory.length - 1].weight >
              0
              ? "increasing"
              : "decreasing"
            : "stable"
        }
        - Recent Meals Count: ${recentMeals.length} meals logged this month

        User Question: "${query || "How am I doing with my health goals?"}"

        Provide a helpful, personalized response that:
        1. Addresses their specific question
        2. References their personal data when relevant
        3. Gives actionable advice
        4. Is encouraging and supportive
        5. Keeps response under 400 words

        Be conversational and friendly, like a knowledgeable nutrition coach.
        `;

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 400,
        });

        const aiResponse = response.choices[0]?.message?.content;
        if (aiResponse) {
          return res.json({
            success: true,
            summary: aiResponse,
            motivationalMessage: aiResponse,
          });
        }
      } catch (error) {
        logger.error("Error generating AI chat response:", error);
      }
    }

    // Fallback response
    return res.json({
      success: true,
      summary:
        "I'm here to help you with your nutrition and health goals! Could you tell me more about what you'd like to know?",
      motivationalMessage:
        "You're doing great by staying engaged with your health journey!",
    });
  } catch (error) {
    logger.error("Error generating AI insights:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate AI insights" });
  }
}

/**
 * Get food recommendations
 */
export async function getFoodRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const {
      query,
      mealType,
      timeOfDay,
      includeAllergies = true,
      includeGoals = true,
    } = req.body;

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        weight: true,
        targetWeight: true,
        height: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        allergies: true,
        dietaryPreferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get recent meals for context
    const recentMeals = await prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { consumedAt: "desc" },
      take: 10,
    });

    // Calculate today's nutrition intake and remaining macros
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysMeals = await prisma.mealEntry.findMany({
      where: {
        userId,
        consumedAt: { gte: today, lt: tomorrow },
      },
      include: { foodItems: true },
    });

    // Calculate today's totals
    const todaysNutrition = todaysMeals.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.totalCalories || 0),
        protein: totals.protein + (meal.totalProtein || 0),
        carbs: totals.carbs + (meal.totalCarbs || 0),
        fat: totals.fat + (meal.totalFat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calculate remaining macros for the day
    const dailyGoals = {
      calories: user.dailyCalorieGoal || 2500,
      protein:
        user.proteinGoal ||
        Math.round(((user.dailyCalorieGoal || 2500) * 0.3) / 4),
      carbs:
        user.carbsGoal ||
        Math.round(((user.dailyCalorieGoal || 2500) * 0.4) / 4),
      fat:
        user.fatGoal || Math.round(((user.dailyCalorieGoal || 2500) * 0.3) / 9),
    };

    const remainingNutrition = {
      calories: Math.max(0, dailyGoals.calories - todaysNutrition.calories),
      protein: Math.max(0, dailyGoals.protein - todaysNutrition.protein),
      carbs: Math.max(0, dailyGoals.carbs - todaysNutrition.carbs),
      fat: Math.max(0, dailyGoals.fat - todaysNutrition.fat),
    };

    // Determine current time context
    const currentHour = new Date().getHours();
    let mealContext = "";
    if (currentHour >= 6 && currentHour < 11) mealContext = "breakfast";
    else if (currentHour >= 11 && currentHour < 15) mealContext = "lunch";
    else if (currentHour >= 15 && currentHour < 18) mealContext = "snack";
    else if (currentHour >= 18 && currentHour < 22) mealContext = "dinner";
    else mealContext = "late night snack";

    // Generate AI food recommendations
    if (process.env.OPENAI_API_KEY) {
      try {
        // First, check if the query is nutrition/health related
        const topicValidationPrompt = `
        Analyze this user message and determine if it's related to nutrition, health, fitness, food, diet, wellness, weight, progress, goals, exercise, or body composition.
        
        IMPORTANT: The user may write in ANY LANGUAGE (English, Turkish, Spanish, French, German, Arabic, etc.). Analyze the MEANING regardless of language.
        
        User message: "${query || "What should I eat?"}"
        
        ALLOWED TOPICS (in any language): nutrition, food, meals, calories, macros, weight, fitness goals, progress tracking, health, wellness, exercise, body composition, diet, supplements, hydration, sleep (as it relates to health), CUISINES (Italian, Turkish, Mexican, Indian, Asian, etc.), regional foods, cooking methods, meal prep, recipes
        
        BLOCKED TOPICS (in any language): programming, coding, technology, politics, entertainment, general knowledge, math problems, travel (unless food-related), shopping (unless grocery/food), unrelated personal questions
        
        Examples of ALLOWED questions (any language):
        - "How am I doing with my goals?" / "Hedeflerimde nasıl gidiyorum?" / "¿Cómo voy con mis objetivos?"
        - "What should I eat?" / "Ne yemeliyim?" / "¿Qué debo comer?"
        - "Recommend Turkish cuisine foods" / "Türk mutfağı öner" / "Recomienda comida turca"
        - "Healthy meal options" / "Sağlıklı yemek seçenekleri" / "Opciones de comida saludable"
        
        Examples of BLOCKED questions (any language):
        - "How do I code?" / "Nasıl kod yazarım?" / "¿Cómo programo?"
        - "What's the weather?" / "Hava nasıl?" / "¿Qué tiempo hace?"
        
        Respond with only "YES" if it's health/fitness/nutrition/food/cuisine related (regardless of language), or "NO" if it's completely unrelated.
        `;

        const validationResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: topicValidationPrompt }],
          temperature: 0.1,
          max_tokens: 10,
        });

        const isNutritionRelated =
          validationResponse.choices[0]?.message?.content
            ?.trim()
            .toUpperCase() === "YES";

        if (!isNutritionRelated) {
          return res.json({
            success: true,
            recommendations: [
              {
                type: "food",
                title: "Stay On Topic! 🥗",
                description: `I'm your nutrition assistant, so I can only help with food, diet, health, and fitness questions! Try asking about meal recommendations that fit your remaining ${
                  remainingNutrition.calories
                } calories for today, or foods that support your ${
                  user.fitnessGoals?.join(", ") || "health"
                } goals.`,
                priority: "high",
                actionable: true,
                estimatedImpact:
                  "Keeps our conversation focused on your nutrition goals",
              },
            ],
          });
        }

        const recentFoods = recentMeals.map((meal) => meal.mealName).join(", ");

        const prompt = `
        You are a nutrition expert. Provide personalized food recommendations based on:

        User Profile:
        - Goals: ${user.fitnessGoals?.join(", ") || "general health"}
        - Current Weight: ${user.weight}kg
        - Target Weight: ${user.targetWeight}kg
        - Allergies: ${user.allergies?.join(", ") || "none"}
        - Dietary Preferences: ${user.dietaryPreferences?.join(", ") || "none"}

        TODAY'S NUTRITION STATUS (${mealContext}):
        📊 Daily Goals: ${dailyGoals.calories} kcal, ${
          dailyGoals.protein
        }g protein, ${dailyGoals.carbs}g carbs, ${dailyGoals.fat}g fat
        🍽️ Consumed Today: ${todaysNutrition.calories} kcal, ${
          todaysNutrition.protein
        }g protein, ${todaysNutrition.carbs}g carbs, ${todaysNutrition.fat}g fat
        ⚡ REMAINING: ${remainingNutrition.calories} kcal, ${
          remainingNutrition.protein
        }g protein, ${remainingNutrition.carbs}g carbs, ${
          remainingNutrition.fat
        }g fat

        User Request: "${query || "What should I eat?"}"
        ${mealType ? `Meal Type: ${mealType}` : ""}
        ${timeOfDay ? `Time of Day: ${timeOfDay}` : ""}

        STRICT GUIDELINES:
        1. ONLY provide nutrition, food, and health-related recommendations
        2. Suggest specific foods/meals that fit their REMAINING macros
        3. Consider their allergies and dietary preferences
        4. Align with their fitness goals
        5. Mention specific portion sizes and macro breakdowns
        6. Explain how the recommendation fits their remaining daily targets
        7. Keep response conversational and under 400 words

        IMPORTANT: Always mention how your recommendation fits their remaining calories and macros!
        `;

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 400,
        });

        const aiResponse = response.choices[0]?.message?.content;
        if (aiResponse) {
          return res.json({
            success: true,
            recommendations: [
              {
                type: "food",
                title: "AI Recommendation",
                description: aiResponse,
                priority: "high",
                actionable: true,
                estimatedImpact:
                  "Personalized for your remaining daily targets",
              },
            ],
          });
        }
      } catch (error) {
        logger.error("Error generating AI food recommendations:", error);
      }
    }

    // Fallback response
    const fallbackResponses = [
      `Hi ${
        user.firstName || "there"
      }! I'm here to help with your nutrition and health goals. What would you like to know?`,
      "I'd love to help you with your nutrition questions! Could you tell me more about what you're looking for?",
      "I'm your AI nutrition assistant! Feel free to ask me about meal planning, food recommendations, or your progress.",
    ];

    const randomResponse =
      fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return res.json({
      success: true,
      response: randomResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error generating food recommendations:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get food recommendations" });
  }
}

/**
 * AI Chat endpoint for conversational nutrition assistance
 */
export async function aiChat(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // Spam protection: Message length limits
    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Message too long. Please keep it under 500 characters.",
      });
    }

    if (message.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: "Message too short. Please ask a proper question.",
      });
    }

    // Spam protection: Check for repeated messages
    const trimmedMessage = message.trim().toLowerCase();
    if (conversationHistory.length > 0) {
      const lastUserMessage = conversationHistory
        .filter((msg: any) => msg.role === "user")
        .slice(-1)[0];

      if (
        lastUserMessage &&
        lastUserMessage.content.trim().toLowerCase() === trimmedMessage
      ) {
        return res.json({
          success: true,
          response:
            "I see you're asking the same question again. Is there something specific you'd like me to clarify about my previous response?",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Spam protection: Simple rate limiting check (basic implementation)
    // In production, you'd use Redis or a proper rate limiter
    const now = Date.now();
    const userKey = `ai_chat_${userId}`;

    // This is a basic in-memory rate limit - in production use Redis
    if (!global.userRequestTimes) {
      global.userRequestTimes = new Map();
    }

    const userRequests = global.userRequestTimes.get(userKey) || [];
    const recentRequests = userRequests.filter(
      (time: number) => now - time < 60000
    ); // Last minute

    if (recentRequests.length >= 10) {
      // Max 10 requests per minute
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please wait a moment before asking again.",
      });
    }

    // Add current request time
    recentRequests.push(now);
    global.userRequestTimes.set(userKey, recentRequests);

    // Spam protection: Daily AI request limit per user
    const dailyKey = `ai_daily_${userId}_${new Date().toDateString()}`;
    if (!global.userRequestTimes) {
      global.userRequestTimes = new Map();
    }

    const dailyRequests = global.userRequestTimes.get(dailyKey) || [];
    if (dailyRequests.length >= 50) {
      // Max 50 AI requests per day per user
      return res.status(429).json({
        success: false,
        error:
          "Daily AI request limit reached. Please try again tomorrow or upgrade your plan.",
      });
    }

    dailyRequests.push(now);
    global.userRequestTimes.set(dailyKey, dailyRequests);

    // Spam protection: Block obvious spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters (aaaaaaaaaa)
      /^[^a-zA-Z]*$/, // Only numbers/symbols
      /test\s*test\s*test/i, // Repeated "test"
      /spam|bot|hack|attack/i, // Obvious spam words
    ];

    if (spamPatterns.some((pattern) => pattern.test(message))) {
      return res.json({
        success: true,
        response:
          "I noticed your message might not be a genuine nutrition question. Please ask me something about your health, diet, or fitness goals!",
        timestamp: new Date().toISOString(),
      });
    }

    // Log AI usage for monitoring
    console.log(
      `🤖 AI Chat Request - User: ${userId}, Message length: ${message.length}, Daily count: ${dailyRequests.length}`
    );

    // Get user profile for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        weight: true,
        targetWeight: true,
        height: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        allergies: true,
        dietaryPreferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get recent activity for context
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // Last week

    const recentMeals = await prisma.mealEntry.findMany({
      where: { userId, consumedAt: { gte: startDate } },
      orderBy: { consumedAt: "desc" },
      take: 5,
    });

    const recentWeights = await prisma.weightHistory.findMany({
      where: { userId, recordedAt: { gte: startDate } },
      orderBy: { recordedAt: "desc" },
      take: 3,
    });

    // Calculate today's nutrition intake and remaining macros
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysMeals = await prisma.mealEntry.findMany({
      where: {
        userId,
        consumedAt: { gte: today, lt: tomorrow },
      },
      include: { foodItems: true },
    });

    // Calculate today's totals
    const todaysNutrition = todaysMeals.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.totalCalories || 0),
        protein: totals.protein + (meal.totalProtein || 0),
        carbs: totals.carbs + (meal.totalCarbs || 0),
        fat: totals.fat + (meal.totalFat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calculate remaining macros for the day
    const dailyGoals = {
      calories: user.dailyCalorieGoal || 2500,
      protein:
        user.proteinGoal ||
        Math.round(((user.dailyCalorieGoal || 2500) * 0.3) / 4),
      carbs:
        user.carbsGoal ||
        Math.round(((user.dailyCalorieGoal || 2500) * 0.4) / 4),
      fat:
        user.fatGoal || Math.round(((user.dailyCalorieGoal || 2500) * 0.3) / 9),
    };

    const remainingNutrition = {
      calories: Math.max(0, dailyGoals.calories - todaysNutrition.calories),
      protein: Math.max(0, dailyGoals.protein - todaysNutrition.protein),
      carbs: Math.max(0, dailyGoals.carbs - todaysNutrition.carbs),
      fat: Math.max(0, dailyGoals.fat - todaysNutrition.fat),
    };

    // Determine current time context
    const currentHour = new Date().getHours();
    let mealContext = "";
    if (currentHour >= 6 && currentHour < 11) mealContext = "breakfast";
    else if (currentHour >= 11 && currentHour < 15) mealContext = "lunch";
    else if (currentHour >= 15 && currentHour < 18) mealContext = "snack";
    else if (currentHour >= 18 && currentHour < 22) mealContext = "dinner";
    else mealContext = "late night snack";

    console.log("🍽️ Today's nutrition analysis:", {
      consumed: todaysNutrition,
      goals: dailyGoals,
      remaining: remainingNutrition,
      mealContext,
    });

    // Generate AI response
    if (process.env.OPENAI_API_KEY) {
      try {
        // First, check if the message is nutrition/health related
        const topicValidationPrompt = `
        Analyze this user message and determine if it's related to nutrition, health, fitness, food, diet, wellness, weight, progress, goals, exercise, or body composition.
        
        IMPORTANT: The user may write in ANY LANGUAGE (English, Turkish, Spanish, French, German, Arabic, etc.). Analyze the MEANING regardless of language.
        
        User message: "${message}"
        
        ALLOWED TOPICS (in any language): nutrition, food, meals, calories, macros, weight, fitness goals, progress tracking, health, wellness, exercise, body composition, diet, supplements, hydration, sleep (as it relates to health), CUISINES (Italian, Turkish, Mexican, Indian, Asian, etc.), regional foods, cooking methods, meal prep, recipes
        
        BLOCKED TOPICS (in any language): programming, coding, technology, politics, entertainment, general knowledge, math problems, travel (unless food-related), shopping (unless grocery/food), unrelated personal questions
        
        Examples of ALLOWED questions (any language):
        - "How am I doing with my goals?" / "Hedeflerimde nasıl gidiyorum?" / "¿Cómo voy con mis objetivos?"
        - "What should I eat?" / "Ne yemeliyim?" / "¿Qué debo comer?"
        - "Recommend Turkish cuisine foods" / "Türk mutfağı öner" / "Recomienda comida turca"
        - "Healthy meal options" / "Sağlıklı yemek seçenekleri" / "Opciones de comida saludable"
        
        Examples of BLOCKED questions (any language):
        - "How do I code?" / "Nasıl kod yazarım?" / "¿Cómo programo?"
        - "What's the weather?" / "Hava nasıl?" / "¿Qué tiempo hace?"
        
        Respond with only "YES" if it's health/fitness/nutrition/food/cuisine related (regardless of language), or "NO" if it's completely unrelated.
        `;

        const validationResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: topicValidationPrompt }],
          temperature: 0.1,
          max_tokens: 10,
        });

        const isNutritionRelated =
          validationResponse.choices[0]?.message?.content
            ?.trim()
            .toUpperCase() === "YES";

        if (!isNutritionRelated) {
          return res.json({
            success: true,
            response: `I'm your nutrition assistant, so I can only help with food, diet, health, and fitness questions! 🥗💪 

Try asking me about:
• Meal recommendations for your goals
• Foods that fit your remaining calories (${remainingNutrition.calories} kcal left today!)
• Your progress and how you're doing with your goals
• Nutrition advice for muscle building
• Healthy recipes or meal prep ideas
• Questions about your weight or fitness journey

What would you like to know about your nutrition or health?`,
            timestamp: new Date().toISOString(),
          });
        }

        const systemPrompt = `You are a friendly, knowledgeable AI nutrition assistant helping ${
          user.firstName || "the user"
        }. 

IMPORTANT: Detect the language the user is writing in and respond in THE SAME LANGUAGE. If they write in Turkish, respond in Turkish. If they write in Spanish, respond in Spanish, etc. Always match their language choice.

User Profile:
- Name: ${user.firstName || "User"}
- Current Weight: ${user.weight || "not set"}kg
- Target Weight: ${user.targetWeight || "not set"}kg
- Height: ${user.height || "not set"}cm
- Goals: ${user.fitnessGoals?.join(", ") || "general health"}
- Daily Calorie Goal: ${user.dailyCalorieGoal || "not set"} calories
- Allergies: ${user.allergies?.join(", ") || "none"}
- Dietary Preferences: ${user.dietaryPreferences?.join(", ") || "none"}

TODAY'S NUTRITION STATUS (${mealContext}):
📊 Daily Goals:
- Calories: ${dailyGoals.calories} kcal
- Protein: ${dailyGoals.protein}g
- Carbs: ${dailyGoals.carbs}g  
- Fat: ${dailyGoals.fat}g

🍽️ Consumed Today:
- Calories: ${todaysNutrition.calories} kcal
- Protein: ${todaysNutrition.protein}g
- Carbs: ${todaysNutrition.carbs}g
- Fat: ${todaysNutrition.fat}g

⚡ REMAINING FOR TODAY:
- Calories: ${remainingNutrition.calories} kcal
- Protein: ${remainingNutrition.protein}g
- Carbs: ${remainingNutrition.carbs}g
- Fat: ${remainingNutrition.fat}g

Recent Activity:
- Meals This Week: ${recentMeals.length} logged
- Weight Entries: ${recentWeights.length} this week

STRICT GUIDELINES:
1. ALWAYS respond in the SAME LANGUAGE as the user's question
2. ONLY answer questions about nutrition, health, fitness, food, diet, and wellness
3. If asked about non-nutrition topics, politely redirect to nutrition topics (in their language)
4. ALWAYS consider their remaining macros when suggesting foods
5. Consider the current meal time (${mealContext})
6. Reference their allergies and dietary preferences
7. Give specific portion sizes and macro breakdowns when possible
8. If they're close to their daily limits, suggest lighter options
9. If they have lots of calories left, suggest more substantial meals
10. Keep responses helpful and under 400 words
11. When suggesting foods from specific cuisines, provide authentic options from that culture

IMPORTANT: When recommending meals, always mention how it fits their remaining macros!

Remember: You're their personal nutrition coach who knows exactly what they need to hit their daily targets. Always respond in THEIR language and stay focused on nutrition and health topics only!`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...conversationHistory.slice(-6), // Keep last 6 messages for context
          { role: "user", content: message },
        ];

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages,
          temperature: 0.7,
          max_tokens: 400,
        });

        const aiResponse = response.choices[0]?.message?.content;
        if (aiResponse) {
          return res.json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error("Error generating AI chat response:", error);
      }
    }

    // Fallback response
    const fallbackResponses = [
      `Hi ${
        user.firstName || "there"
      }! I'm here to help with your nutrition and health goals. What would you like to know?`,
      "I'd love to help you with your nutrition questions! Could you tell me more about what you're looking for?",
      "I'm your AI nutrition assistant! Feel free to ask me about meal planning, food recommendations, or your progress.",
    ];

    const randomResponse =
      fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return res.json({
      success: true,
      response: randomResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in AI chat:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to process chat message" });
  }
}
