import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from "../constants";
import { apiCall, API_URL } from "./api";
import { getAuthToken } from "./api";

// Helper to get user-specific token key
const getUserTokenKey = (email: string) => `@auth_token_${email.toLowerCase()}`;
const getUserDataKey = (email: string) => `@user_data_${email.toLowerCase()}`;

// Interface for user profile data
interface UserProfile {
  id?: string;
  email?: string;
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
  fitnessGoals?: string[];
  dailyCalorieGoal?: number;
  profileSetupComplete?: boolean;
  [key: string]: any; // For any additional properties
}

interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any; // For additional response fields
}

interface GetMealsParams {
  startDate: string;
  endDate: string;
}

interface Meal {
  id: string;
  mealType: string;
  mealName: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  consumedAt: string;
  foodItems: any[];
}

/**
 * User service with profile management functions
 */
const userService = {
  // Get the currently authenticated user's profile
  getProfile: async (): Promise<ApiResponse> => {
    try {
      console.log("UserService: Getting user profile");
      const response = await apiCall("/users/me", "GET", null, true);

      if (response.success && response.id) {
        console.log(
          `UserService: Retrieved profile for user ${response.email}`
        );
        // The response is already in the correct format from apiCall
        return { success: true, user: response };
      } else {
        console.error("UserService: Profile retrieval failed:", response.error);
        return {
          success: false,
          error: response.error || "Failed to retrieve user profile",
        };
      }
    } catch (error) {
      console.error("UserService: Error in getProfile:", error);
      return {
        success: false,
        error: "An unexpected error occurred while retrieving profile",
      };
    }
  },

  // Update the user's profile with new data
  updateProfile: async (profileData: UserProfile): Promise<ApiResponse> => {
    try {
      console.log(
        "UserService: Updating profile with data:",
        JSON.stringify(profileData)
      );

      // Make the API call to update the profile
      const response = await apiCall(
        "/users/profile",
        "PUT",
        profileData,
        true
      );

      if (response.success) {
        console.log("UserService: Profile updated successfully");

        // Update the cached user data if possible
        try {
          // Get user email from the response or existing data
          const currentProfile = await userService.getProfile();
          if (currentProfile.success && currentProfile.user?.email) {
            const email = currentProfile.user.email;

            // Get existing user data
            const userDataStr = await AsyncStorage.getItem(
              getUserDataKey(email)
            );

            if (userDataStr) {
              // Parse existing data and merge with updated fields
              const userData = JSON.parse(userDataStr);
              const updatedData = { ...userData, ...profileData };

              // Save back to storage
              await AsyncStorage.setItem(
                getUserDataKey(email),
                JSON.stringify(updatedData)
              );
              console.log(`UserService: Updated cached data for ${email}`);
            }
          }
        } catch (cacheError) {
          // Non-critical error, just log it
          console.warn(
            "UserService: Failed to update cached user data:",
            cacheError
          );
        }

        return response;
      } else {
        console.error("UserService: Profile update failed:", response.error);
        return response;
      }
    } catch (error) {
      console.error("UserService: Error in updateProfile:", error);
      return {
        success: false,
        error: "An unexpected error occurred while updating profile",
      };
    }
  },

  // Complete the onboarding process
  completeOnboarding: async (fitnessGoals?: string[]): Promise<ApiResponse> => {
    try {
      console.log("UserService: Completing onboarding");

      // If fitness goals were provided, update them first
      if (
        fitnessGoals &&
        Array.isArray(fitnessGoals) &&
        fitnessGoals.length > 0
      ) {
        console.log(
          "UserService: Updating fitness goals:",
          JSON.stringify(fitnessGoals)
        );

        try {
          const goalsUpdate = await userService.updateProfile({ fitnessGoals });

          if (!goalsUpdate.success) {
            console.error(
              "UserService: Failed to update fitness goals:",
              goalsUpdate.error
            );

            // Try the alternative goals endpoint as fallback
            console.log("UserService: Trying alternative goals endpoint");
            const fallbackUpdate = await apiCall(
              "/users/force-update-goals",
              "POST",
              { fitnessGoals },
              true
            );

            if (!fallbackUpdate.success) {
              console.error(
                "UserService: Fallback goals update failed:",
                fallbackUpdate.error
              );
              // Continue anyway - we'll try to complete the profile even if goals update failed
            } else {
              console.log("UserService: Fallback goals update succeeded");
            }
          }
        } catch (goalsError) {
          console.error("UserService: Error updating goals:", goalsError);
          // Continue anyway - we'll try to complete the profile even if goals update failed
        }
      }

      // Mark profile as complete - make a direct API call for more control
      console.log("UserService: Marking profile as complete");
      try {
        const response = await apiCall(
          "/users/profile",
          "PUT",
          { profileSetupComplete: true },
          true
        );

        console.log(
          "UserService: Complete profile response:",
          JSON.stringify(response)
        );

        if (response.success) {
          console.log("UserService: Onboarding completed successfully");

          // Update local storage to match
          try {
            const currentProfile = await userService.getProfile();
            if (currentProfile.success && currentProfile.user) {
              const userData = currentProfile.user;
              if (userData.email) {
                await AsyncStorage.setItem(
                  getUserDataKey(userData.email),
                  JSON.stringify({ ...userData, profileSetupComplete: true })
                );
              }
            }
          } catch (storageError) {
            console.warn(
              "UserService: Error updating local storage:",
              storageError
            );
          }

          return {
            success: true,
            message: "Onboarding completed successfully",
            user: response.user,
          };
        } else {
          console.error(
            "UserService: Failed to complete onboarding:",
            response.error
          );
          return {
            success: false,
            error: response.error || "Failed to finalize onboarding",
          };
        }
      } catch (finalizeError) {
        console.error(
          "UserService: Error finalizing onboarding:",
          finalizeError
        );
        return {
          success: false,
          error: "Network error while finalizing onboarding",
        };
      }
    } catch (error) {
      console.error("UserService: Error in completeOnboarding:", error);
      return {
        success: false,
        error: "An unexpected error occurred while completing onboarding",
      };
    }
  },

  // Log a meal entry
  logMeal: async (mealData: {
    mealType: string;
    mealName: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    consumedAt?: Date;
    foodItems: any[];
    gptAnalysisJson?: any;
  }): Promise<ApiResponse> => {
    try {
      console.log("UserService: Logging meal:", JSON.stringify(mealData));

      const response = await apiCall(
        "/users/meals",
        "POST",
        mealData,
        true // This endpoint requires authentication
      );

      if (response.success) {
        console.log("UserService: Meal logged successfully");
        return {
          success: true,
          message: "Meal logged successfully",
          mealEntry: response.mealEntry,
        };
      } else {
        console.error("UserService: Failed to log meal:", response.error);
        return {
          success: false,
          error: response.error || "Failed to log meal",
        };
      }
    } catch (error) {
      console.error("UserService: Error logging meal:", error);
      return {
        success: false,
        error: "An unexpected error occurred while logging meal",
      };
    }
  },

  // Verify if the user's profile is complete with all required data
  verifyProfileCompletion: async (): Promise<boolean> => {
    try {
      console.log("UserService: Verifying profile completion");

      // Get the latest profile data from server
      const response = await userService.getProfile();

      if (!response.success || !response.user) {
        console.error("UserService: Failed to get profile for verification");
        return false;
      }

      const userData = response.user;

      // Check if all required fields exist
      const hasName = !!(userData.firstName && userData.lastName);
      const hasStats = !!(
        userData.height &&
        userData.weight &&
        typeof userData.height === "number" &&
        typeof userData.weight === "number" &&
        userData.height > 0 &&
        userData.weight > 0
      );

      // Check dietaryPreferences is a non-empty array and activityLevel exists
      const hasDiet = !!(
        userData.dietaryPreferences &&
        Array.isArray(userData.dietaryPreferences) &&
        userData.dietaryPreferences.length > 0 &&
        userData.activityLevel &&
        typeof userData.activityLevel === "string" &&
        userData.activityLevel.length > 0
      );

      // Check fitnessGoals is a non-empty array
      const hasGoals = !!(
        userData.fitnessGoals &&
        Array.isArray(userData.fitnessGoals) &&
        userData.fitnessGoals.length > 0 &&
        // Make sure we actually have valid string values
        userData.fitnessGoals.every(
          (goal: any) => typeof goal === "string" && goal.length > 0
        )
      );

      // All required fields must be present
      const isComplete = hasName && hasStats && hasDiet && hasGoals;

      console.log("UserService: Profile completion verification result:", {
        isComplete,
        missingFields: {
          name: !hasName,
          stats: !hasStats,
          diet: !hasDiet,
          goals: !hasGoals,
        },
      });

      // If server says complete but we find it's not, correct it
      if (userData.profileSetupComplete && !isComplete) {
        console.log(
          "UserService: Correcting incorrect profileSetupComplete status"
        );
        try {
          await userService.updateProfile({
            profileSetupComplete: false,
          });
        } catch (updateError) {
          console.error(
            "UserService: Failed to correct profile status:",
            updateError
          );
        }
      }

      return isComplete;
    } catch (error) {
      console.error("UserService: Error in verifyProfileCompletion:", error);
      return false;
    }
  },

  // Helper: Get user token with fallback mechanisms
  getUserToken: async (): Promise<string | null> => {
    try {
      // Try to get user data to find email
      const allKeys = await AsyncStorage.getAllKeys();

      // First check user-specific data keys
      const userDataKeys = allKeys.filter((key) =>
        key.startsWith("@user_data_")
      );

      // If we have user data keys, try to get the token
      if (userDataKeys.length > 0) {
        const userDataKey = userDataKeys[0]; // Use the first one
        const userDataStr = await AsyncStorage.getItem(userDataKey);

        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            if (userData && userData.email) {
              const userTokenKey = getUserTokenKey(userData.email);
              console.log(`Checking token for ${userData.email}`);

              const token = await AsyncStorage.getItem(userTokenKey);
              if (token) {
                console.log(`Found token for ${userData.email}`);
                return token;
              }
            }
          } catch (parseError) {
            console.error("Error parsing user data:", parseError);
          }
        }
      }

      // If no user-specific token, try generic token
      const genericToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (genericToken) {
        console.log("Using generic token");
        return genericToken;
      }

      // Last resort: check all auth tokens
      const authTokenKeys = allKeys.filter((key) =>
        key.startsWith("@auth_token_")
      );

      if (authTokenKeys.length > 0) {
        const tokenKey = authTokenKeys[0]; // Use the first one
        const token = await AsyncStorage.getItem(tokenKey);
        if (token) {
          console.log(`Using fallback token from ${tokenKey}`);
          return token;
        }
      }

      console.log("No token found");
      return null;
    } catch (error) {
      console.error("Error getting user token:", error);
      return null;
    }
  },

  /**
   * Check if user has a complete profile
   * This helps handle existing users created before the profileSetupComplete field was added
   */
  ensureProfileStatus: async (): Promise<ApiResponse> => {
    try {
      const response = await userService.getProfile();

      if (!response.success) {
        return response;
      }

      const user = response.user;
      console.log("Checking profile status for user:", user.email);
      console.log(
        "Current profileSetupComplete value:",
        user.profileSetupComplete
      );

      // For existing users with undefined profileSetupComplete field
      // If they already have first and last name, mark them as complete
      if (user.profileSetupComplete === undefined) {
        console.log("User has undefined profileSetupComplete status");

        if (user.firstName && user.lastName) {
          console.log(
            "User has first and last name, marking profile as complete"
          );
          return await userService.updateProfile({
            profileSetupComplete: true,
          });
        } else {
          console.log(
            "User is missing name info, marking profile as incomplete"
          );
          return await userService.updateProfile({
            profileSetupComplete: false,
          });
        }
      }

      // For new users who need onboarding, leave their profileSetupComplete as false
      console.log(
        "Returning user with profileSetupComplete:",
        user.profileSetupComplete
      );
      return response;
    } catch (error) {
      console.error("Error ensuring profile status:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Get onboarding progress - which steps have been completed
   */
  getOnboardingProgress: async (): Promise<{
    completedSteps: string[];
    lastCompletedStep: string | null;
  }> => {
    try {
      const response = await userService.getProfile();

      if (!response.success) {
        return { completedSteps: [], lastCompletedStep: null };
      }

      const { user } = response;
      const completedSteps: string[] = [];
      let lastCompletedStep: string | null = null;

      // Check which steps are completed based on data presence
      // Use stricter validation to ensure each step is truly complete

      // Name step is complete if both first and last name are present
      if (user.firstName && user.lastName) {
        completedSteps.push("name");
        lastCompletedStep = "name";
        console.log("Name step is complete");
      } else {
        console.log("Name step is incomplete - missing required fields");
        return { completedSteps, lastCompletedStep };
      }

      // Stats step is complete if height, weight and DOB are present
      if (user.height && user.weight && user.dateOfBirth) {
        completedSteps.push("stats");
        lastCompletedStep = "stats";
        console.log("Stats step is complete");
      } else {
        console.log("Stats step is incomplete - missing required fields");
        return { completedSteps, lastCompletedStep };
      }

      // Diet step is complete if dietary preferences and activity level are present
      if (
        user.dietaryPreferences &&
        Array.isArray(user.dietaryPreferences) &&
        user.dietaryPreferences.length > 0 &&
        user.activityLevel
      ) {
        completedSteps.push("diet");
        lastCompletedStep = "diet";
        console.log("Diet step is complete");
      } else {
        console.log("Diet step is incomplete - missing required fields");
        return { completedSteps, lastCompletedStep };
      }

      // Goals step is complete if fitness goals are present
      if (
        user.fitnessGoals &&
        Array.isArray(user.fitnessGoals) &&
        user.fitnessGoals.length > 0
      ) {
        completedSteps.push("goals");
        lastCompletedStep = "goals";
        console.log("Goals step is complete");
      } else {
        console.log("Goals step is incomplete - missing required fields");
      }

      return { completedSteps, lastCompletedStep };
    } catch (error) {
      console.error("Error getting onboarding progress:", error);
      return { completedSteps: [], lastCompletedStep: null };
    }
  },

  // Friend-related API calls
  getFriends: async () => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch friends");
    }

    return response.json();
  },

  getFriendRequests: async () => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends/requests`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch friend requests");
    }

    return response.json();
  },

  sendFriendRequest: async (friendId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends/request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      throw new Error("Failed to send friend request");
    }

    return response.json();
  },

  acceptFriendRequest: async (friendId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      throw new Error("Failed to accept friend request");
    }

    return response.json();
  },

  rejectFriendRequest: async (friendId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      throw new Error("Failed to reject friend request");
    }

    return response.json();
  },

  removeFriend: async (friendId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      throw new Error("Failed to remove friend");
    }

    return response.json();
  },

  getFriendProfile: async (friendId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/friends/${friendId}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get friend profile");
    }

    return response.json();
  },

  // Get meals for a specific date range
  getMeals: async (params: GetMealsParams): Promise<ApiResponse> => {
    try {
      console.log("UserService: Fetching meals:", params);

      const response = await apiCall(
        `/users/meals?startDate=${params.startDate}&endDate=${params.endDate}`,
        "GET",
        null,
        true // This endpoint requires authentication
      );

      if (response.success) {
        console.log("UserService: Meals fetched successfully");
        return {
          success: true,
          message: "Meals fetched successfully",
          meals: response.meals as Meal[],
        };
      } else {
        console.error("UserService: Failed to fetch meals:", response.error);
        return {
          success: false,
          error: response.error || "Failed to fetch meals",
        };
      }
    } catch (error) {
      console.error("UserService: Error fetching meals:", error);
      return {
        success: false,
        error: "An unexpected error occurred while fetching meals",
      };
    }
  },

  // Search users
  searchUsers: async (query: string) => {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_URL}/users/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search users");
    }

    return response.json();
  },

  // Fetch dashboard data (nutrition, streak, recent food)
  getDashboardData: async (): Promise<any> => {
    try {
      const response = await apiCall(
        "/users/dashboard-data",
        "GET",
        null,
        true
      );
      return response;
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return { success: false, error: "Failed to fetch dashboard data" };
    }
  },

  // Get user's notification settings
  getNotificationSettings: async (): Promise<ApiResponse> => {
    try {
      console.log("UserService: Getting notification settings");
      const response = await apiCall(
        "/users/notification-settings",
        "GET",
        null,
        true
      );

      if (response.success) {
        console.log(
          "UserService: Retrieved notification settings successfully"
        );
        return response;
      } else {
        console.error(
          "UserService: Failed to get notification settings:",
          response.error
        );
        return response;
      }
    } catch (error) {
      console.error("UserService: Error in getNotificationSettings:", error);
      return {
        success: false,
        error:
          "An unexpected error occurred while retrieving notification settings",
      };
    }
  },

  // Update user's notification settings
  updateNotificationSettings: async (settings: any): Promise<ApiResponse> => {
    try {
      console.log("UserService: Updating notification settings");
      const response = await apiCall(
        "/users/notification-settings",
        "PUT",
        { settings },
        true
      );

      if (response.success) {
        console.log("UserService: Notification settings updated successfully");
        return response;
      } else {
        console.error(
          "UserService: Failed to update notification settings:",
          response.error
        );
        return response;
      }
    } catch (error) {
      console.error("UserService: Error in updateNotificationSettings:", error);
      return {
        success: false,
        error:
          "An unexpected error occurred while updating notification settings",
      };
    }
  },
};

export default userService;
