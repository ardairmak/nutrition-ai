import { Request, Response } from "express";
import { analyzeFoodImage } from "../utils/openai";
import { logger } from "../utils/logger";

/**
 * Controller for handling food image analysis
 */
export const analyzeImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "No image data provided",
      });
    }

    logger.info("Received image analysis request");
    const analysisResult = await analyzeFoodImage(image);

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to analyze image",
        error: analysisResult.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        analysis: analysisResult.analysis,
      },
    });
  } catch (error) {
    logger.error("Error in image analysis controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during image analysis",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
