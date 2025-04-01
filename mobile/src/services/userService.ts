import { API_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY } from "../constants";

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  targetWeight?: number;
  activityLevel?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  profileSetupComplete?: boolean;
}

const userService = {
  /**
   * Update user profile
   */
  updateProfile: async (
    profileData: ProfileUpdateData
  ): Promise<ApiResponse> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        return { success: false, error: "Authentication required" };
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || "Profile updated successfully",
          user: data.user,
        };
      }

      return {
        success: false,
        error: data.error || "Failed to update profile",
      };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Complete onboarding
   */
  completeOnboarding: async (): Promise<ApiResponse> => {
    try {
      return await userService.updateProfile({
        profileSetupComplete: true,
      });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      return { success: false, error: "Failed to complete onboarding" };
    }
  },

  /**
   * Get user profile data
   */
  getProfile: async (): Promise<ApiResponse> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        return { success: false, error: "Authentication required" };
      }

      const response = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, user: data };
      }

      return {
        success: false,
        error: data.error || "Failed to get profile data",
      };
    } catch (error) {
      console.error("Get profile error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Check if user has a complete profile
   * This helps handle existing users created before the profileSetupComplete field was added
   */
  ensureProfileStatus: async (): Promise<ApiResponse> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        return { success: false, error: "Authentication required" };
      }

      // Get current user profile
      const response = await userService.getProfile();

      if (!response.success) {
        return response;
      }

      const user = response.user;

      // If profileSetupComplete is undefined but they have name and basic info set,
      // automatically mark their profile as complete
      if (
        user.profileSetupComplete === undefined &&
        user.firstName &&
        user.lastName
      ) {
        return await userService.updateProfile({
          profileSetupComplete: true,
        });
      }

      return response;
    } catch (error) {
      console.error("Error ensuring profile status:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },
};

export default userService;
