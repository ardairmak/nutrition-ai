import OpenAI from "openai";
import { logger } from "./logger";
import dotenv from "dotenv";

dotenv.config();

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a food image and returns nutritional information
 * @param imageBase64 - Base64 encoded image
 * @returns Analysis results with nutritional information
 */
export async function analyzeFoodImage(imageBase64: string) {
  try {
    // Remove data:image/jpeg;base64, prefix if it exists
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // First, check if the image contains food
    const validationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a food detection AI that determines if an image contains food. 
          Respond with a JSON object with this structure:
          {
            "containsFood": boolean,
            "confidence": number (0-1),
            "description": "brief description of what you see in the image"
          }
          If you see any food items, even if the image also contains non-food items, set containsFood to true.
          If there is no food at all in the image, set containsFood to false.
          The confidence value should indicate how confident you are in your assessment.
          `,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Does this image contain food?",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const validationText = validationResponse.choices[0].message.content;
    let validationData;

    try {
      validationData = JSON.parse(validationText || "{}");
    } catch (parseError) {
      logger.error("Failed to parse validation response:", parseError);
      validationData = { containsFood: true, confidence: 0.5 }; // Default to proceed if parsing fails
    }

    // If the image does not contain food with high confidence, return early
    if (!validationData.containsFood && validationData.confidence > 0.7) {
      logger.info(
        "Image does not appear to contain food:",
        validationData.description
      );
      return {
        success: true,
        analysis: {
          foodItems: [],
          totalCalories: 0,
          summary: "No food detected in the image.",
          possiblyNotFood: true,
          description: validationData.description,
        },
      };
    }

    // Proceed with full nutritional analysis if the image likely contains food
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert API that analyzes food images. 
          Return ONLY a JSON object with this exact structure:
          {
            "foodItems": [
              {
                "name": "Food name",
                "portionSize": "Estimated portion size (e.g., 100g, 1 cup)",
                "calories": number,
                "protein": number (in grams),
                "carbs": number (in grams),
                "fat": number (in grams)
              }
            ],
            "totalCalories": number,
            "summary": "Brief 1-2 sentence summary of the nutritional value",
            "containsFood": boolean
          }
          
          If there are multiple food items in the image, include each as a separate object in the foodItems array.
          Provide your best estimate of nutritional values based on visual analysis.
          If the image does not contain food, return an empty foodItems array, zero values for nutrients, and set containsFood to false.
          IMPORTANT: Return ONLY valid JSON without any other text. No markdown, no explanations.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What food is in this image? Provide structured nutritional information.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const analysisText = response.choices[0].message.content;
    let analysisData;

    try {
      // Parse the JSON response
      analysisData = JSON.parse(analysisText || "{}");

      // Add the food confidence flag from our validation step
      analysisData.isFoodConfident =
        validationData.containsFood && validationData.confidence > 0.7;

      // Check if the analysis itself indicates this is not food
      if (!analysisData.containsFood || analysisData.foodItems.length === 0) {
        analysisData.possiblyNotFood = true;
      }

      logger.info("Food image analyzed successfully and parsed as JSON");
    } catch (parseError) {
      logger.error("Failed to parse OpenAI response as JSON:", parseError);
      // Return the raw text if JSON parsing fails
      analysisData = {
        error: "Failed to parse structured data",
        rawText: analysisText,
      };
    }

    return {
      success: true,
      analysis: analysisData,
    };
  } catch (error) {
    logger.error("Error analyzing food image:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during image analysis",
    };
  }
}

export default openai;
