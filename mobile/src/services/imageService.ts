import { apiCall } from "./api";

export interface FoodItem {
  name: string;
  portionSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  foodItems: FoodItem[];
  totalCalories: number;
  summary: string;
  isFoodConfident?: boolean; // Flag to indicate if the AI is confident this is food
}

/**
 * Uploads a photo to the server for AI analysis
 * @param photoBase64 - Base64 encoded photo data
 * @returns Structured analysis response from the server
 */
export const analyzePhoto = async (photoBase64: string) => {
  try {
    console.log("Sending photo for analysis...");

    const response = await apiCall(
      "/images/analyze",
      "POST",
      { image: photoBase64 },
      true // This endpoint requires authentication
    );

    if (!response.success) {
      console.error("Error analyzing photo:", response.error);
      return {
        success: false,
        error: response.error || "Failed to analyze photo",
      };
    }

    console.log("Photo analysis successful");

    // Check if the server indicated that this might not be a food image
    if (response.data && response.data.possiblyNotFood === true) {
      return {
        success: false,
        error: "The image does not appear to contain food",
        possiblyNotFood: true,
      };
    }

    // Check if the analysis is properly structured
    if (
      response.data &&
      response.data.analysis &&
      response.data.analysis.foodItems
    ) {
      // Perform additional client-side validation
      const analysis = response.data.analysis as FoodAnalysis;

      // Check if there are food items with meaningful nutritional data
      const hasValidFoodItems =
        analysis.foodItems.length > 0 &&
        analysis.foodItems.some(
          (item) =>
            item.calories > 0 ||
            item.protein > 0 ||
            item.carbs > 0 ||
            item.fat > 0
        );

      // Check if total calories makes sense
      const hasReasonableCalories = analysis.totalCalories > 0;

      if (!hasValidFoodItems || !hasReasonableCalories) {
        console.warn("Analysis may not contain valid food data", analysis);
        return {
          success: false,
          error: "Could not identify food in the image",
          invalidAnalysis: true,
        };
      }

      return {
        success: true,
        analysis: response.data.analysis as FoodAnalysis,
      };
    } else if (
      response.data &&
      response.data.analysis &&
      response.data.analysis.rawText
    ) {
      // Handle fallback to raw text if JSON parsing failed on server
      return {
        success: false,
        error: "Structured data unavailable",
        rawText: response.data.analysis.rawText,
      };
    } else {
      return {
        success: false,
        error: "Invalid analysis format received",
      };
    }
  } catch (error) {
    console.error("Exception in analyzePhoto:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during photo analysis",
    };
  }
};
