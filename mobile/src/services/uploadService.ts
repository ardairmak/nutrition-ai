import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./api";
import { getAuthToken } from "./api";

export interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  imageKey?: string;
  error?: string;
}

class UploadService {
  private async getAuthToken(): Promise<string | null> {
    try {
      // Use the same token retrieval method as other services
      return await getAuthToken();
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Upload a meal image
   */
  async uploadMealImage(
    imageUri: string,
    mealId?: string
  ): Promise<UploadResponse> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, error: "No authentication token found" };
      }

      // Create FormData
      const formData = new FormData();

      // Add the image file
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: "meal-image.jpg",
      } as any);

      // Add meal ID if provided
      if (mealId) {
        formData.append("mealId", mealId);
      }

      const response = await fetch(`${API_URL}/upload/meal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        imageUrl: data.data?.imageUrl || data.imageUrl,
        imageKey: data.data?.s3Key || data.imageKey,
      };
    } catch (error) {
      console.error("Error uploading meal image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Upload a profile image
   */
  async uploadProfileImage(imageUri: string): Promise<UploadResponse> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, error: "No authentication token found" };
      }

      // Create FormData
      const formData = new FormData();

      // Add the image file
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: "profile-image.jpg",
      } as any);

      const response = await fetch(`${API_URL}/upload/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        imageUrl: data.data?.imageUrl || data.imageUrl,
        imageKey: data.data?.s3Key || data.imageKey,
      };
    } catch (error) {
      console.error("Error uploading profile image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Get a signed URL for an existing image
   */
  async getSignedUrl(imageUrl: string): Promise<string | null> {
    try {
      // If the URL is already a signed URL or a local URI, return as is
      if (
        imageUrl.includes("X-Amz-Signature") ||
        imageUrl.startsWith("file://") ||
        imageUrl.startsWith("content://")
      ) {
        return imageUrl;
      }

      const token = await this.getAuthToken();
      if (!token) {
        console.warn("No authentication token found for signed URL");
        return imageUrl; // Return original URL as fallback
      }

      // Extract S3 key from the URL
      const s3Key = this.extractS3KeyFromUrl(imageUrl);
      if (!s3Key) {
        console.warn("Could not extract S3 key from URL:", imageUrl);
        return imageUrl; // Return original URL as fallback
      }

      const response = await fetch(
        `${API_URL}/upload/signed-url/${encodeURIComponent(s3Key)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.warn("Failed to get signed URL:", data.error);
        return imageUrl; // Return original URL as fallback
      }

      return data.data?.signedUrl || imageUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return imageUrl; // Return original URL as fallback
    }
  }

  /**
   * Extract S3 key from a full S3 URL
   */
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname.includes(".s3.")) {
        // Format: bucket-name.s3.region.amazonaws.com/key
        return urlObj.pathname.substring(1); // Remove leading slash
      } else if (urlObj.hostname.startsWith("s3.")) {
        // Format: s3.region.amazonaws.com/bucket-name/key
        const pathParts = urlObj.pathname.split("/");
        if (pathParts.length >= 3) {
          return pathParts.slice(2).join("/");
        }
      }

      return null;
    } catch (error) {
      console.error("Error extracting S3 key from URL:", error);
      return null;
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(imageKey: string): Promise<UploadResponse> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, error: "No authentication token found" };
      }

      const response = await fetch(
        `${API_URL}/upload/${encodeURIComponent(imageKey)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Delete failed with status ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }
}

export const uploadService = new UploadService();
