import { apiCall } from "./api";
import { WeightEntry } from "./weightService";

export interface AnalyticsData {
  weightAnalytics: WeightAnalytics;
  calorieAnalytics: CalorieAnalytics;
  goalProgress: GoalProgress;
  aiInsights: AIInsights;
  recommendations: Recommendation[];
}

export interface WeightAnalytics {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  weightChange: number;
  weeklyTrend: number;
  monthlyTrend: number;
  progressPercentage: number;
  timeToGoal: number; // weeks
  isOnTrack: boolean;
  trendDirection: "improving" | "declining" | "stable";
  chartData: {
    labels: string[];
    weights: number[];
    trendLine: number[];
  };
}

export interface CalorieAnalytics {
  averageDailyCalories: number;
  targetCalories: number;
  calorieDeficit: number;
  adherenceRate: number;
  weeklyTrend: number;
  chartData: {
    labels: string[];
    calories: number[];
    targets: number[];
  };
  macroTrends: {
    [key: string]: {
      average: number;
      goal: number;
      adherence: number;
    };
  };
}

export interface GoalProgress {
  primaryGoal: string;
  goalType: string;
  status: "excellent" | "good" | "concerning" | "off_track";
  successProbability: number;
  daysToGoal: number;
  actualProgress: number;
  expectedProgress: number;
  isOnTrack: boolean;
}

export interface AIInsights {
  summary: string;
  weeklyScore: number;
  keyFindings: string[];
  achievements: string[];
  concerns: string[];
  actionItems: string[];
  motivationalMessage: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "nutrition" | "exercise" | "lifestyle";
  estimatedImpact: string;
}

interface AnalyticsParams {
  timeframe?: "1W" | "1M" | "3M" | "6M" | "1Y";
  includeAI?: boolean;
  includeFoodRecommendations?: boolean;
}

interface FoodRecommendationParams {
  query?: string;
  mealType?: string;
  timeOfDay?: string;
  recentMeals?: string[];
  includeAllergies?: boolean;
  includeGoals?: boolean;
}

interface AIInsightsParams {
  query?: string;
  includeMotivation?: boolean;
}

class AnalyticsService {
  async getAnalytics(params: AnalyticsParams = {}) {
    try {
      const response = await apiCall(
        "/analytics/comprehensive",
        "POST",
        params
      );

      console.log("🔧 Raw API response:", response);

      // The server returns { success: true, data: analyticsData }
      // apiCall already parses the JSON, so we need to extract the data
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data as AnalyticsData,
        };
      } else {
        return {
          success: false,
          error: response.error || "Failed to get analytics",
        };
      }
    } catch (error) {
      console.error("Analytics service error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get analytics",
      };
    }
  }

  async getFoodRecommendations(params: FoodRecommendationParams = {}) {
    try {
      const response = await apiCall(
        "/analytics/food-recommendations",
        "POST",
        params
      );
      return {
        success: true,
        data: {
          response:
            response.recommendations?.[0]?.description ||
            "I'd be happy to help with food recommendations! Could you be more specific about what you're looking for?",
          recommendations: response.recommendations || [],
        },
      };
    } catch (error) {
      console.error("Food recommendations error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get food recommendations",
      };
    }
  }

  async getAIInsights(params: AIInsightsParams | string = {}) {
    try {
      // Handle both string and object params for backward compatibility
      const requestParams =
        typeof params === "string" ? { query: params } : params;

      const response = await apiCall(
        "/analytics/ai-insights",
        "POST",
        requestParams
      );
      return {
        success: true,
        data: {
          response:
            response.summary ||
            response.motivationalMessage ||
            "I'm here to help you achieve your health goals! What would you like to know?",
          insights: response,
        },
      };
    } catch (error) {
      console.error("AI insights error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get AI insights",
      };
    }
  }

  async aiChat(message: string, conversationHistory: any[] = []) {
    try {
      const response = await apiCall("/analytics/chat", "POST", {
        message,
        conversationHistory,
      });

      if (response.success && response.response) {
        return {
          success: true,
          data: {
            response: response.response,
            timestamp: response.timestamp,
          },
        };
      } else {
        return {
          success: false,
          error: response.error || "Failed to get AI response",
        };
      }
    } catch (error) {
      console.error("AI chat error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get AI response",
      };
    }
  }
}

export default new AnalyticsService();
