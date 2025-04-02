import { API_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from "../constants";
import { apiCall } from "./api"; // Import the apiCall helper

// Helper to get user-specific token key
const getAuthTokenKey = (email: string) => `@auth_token_${email.toLowerCase()}`;

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

interface LoginResponse extends ApiResponse {
  token?: string;
  user?: any; // Add other expected fields from the login response
}

const authService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<ApiResponse> => {
    try {
      // Use apiCall helper
      const response: LoginResponse = await apiCall(
        "/auth/login",
        "POST",
        { email, password },
        false
      );

      // Check if the response was successful and contains a token
      if (response.success && response.token) {
        // Now TypeScript knows response might have a token if success is true
        const token = response.token;
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        if (email) {
          await AsyncStorage.setItem(getAuthTokenKey(email), token);
          console.log(`Token saved to user-specific key for ${email}`);
        }
      }

      return response;
    } catch (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: "Network error or unexpected issue during sign in.",
      };
    }
  },

  /**
   * Register a new user account
   */
  register: async (userData: any): Promise<ApiResponse> => {
    return apiCall("/auth/register", "POST", userData, false);
  },

  /**
   * Send a verification email
   */
  sendVerificationEmail: async (email: string): Promise<ApiResponse> => {
    return apiCall("/auth/verify/send", "POST", { email }, false);
  },

  /**
   * Verify email with code
   */
  verifyEmail: async (email: string, code: string): Promise<ApiResponse> => {
    return apiCall("/auth/verify", "POST", { email, code }, false);
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    try {
      console.log("AuthService: Signing out...");

      // First, clear the generic token
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);

      // Get all keys
      const allKeys = await AsyncStorage.getAllKeys();

      // Find and remove all auth tokens
      const authTokenKeys = allKeys.filter((key) =>
        key.startsWith("@auth_token_")
      );

      if (authTokenKeys.length > 0) {
        console.log(
          `AuthService: Clearing ${authTokenKeys.length} user-specific tokens`
        );
        await AsyncStorage.multiRemove(authTokenKeys);
      }

      console.log("AuthService: Sign out complete");
    } catch (error) {
      console.error("AuthService: Error during sign out:", error);
      // Don't throw, just log the error for sign out
    }
  },

  // Validate a JWT token (client-side basic check)
  validateToken: (token: string): { valid: boolean; payload?: any } => {
    try {
      if (!token || !token.includes(".") || token.split(".").length !== 3) {
        return { valid: false };
      }
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.id || !payload.email) {
        return { valid: false };
      }
      return { valid: true, payload };
    } catch (error) {
      return { valid: false };
    }
  },

  /**
   * Get current user details with direct token input
   */
  getCurrentUserWithToken: async (token: string): Promise<ApiResponse> => {
    if (!token) {
      return { success: false, error: "No authentication token provided" };
    }

    try {
      console.log(`Making request to /users/me with direct token`);

      // Create a custom fetch implementation that uses the provided token
      const customFetch = async (url: string, options: RequestInit = {}) => {
        const headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const response = await fetch(url, {
          ...options,
          headers,
        });

        const text = await response.text();
        let data = {};

        try {
          if (text) {
            data = JSON.parse(text);
          }
        } catch (error) {
          console.error("Error parsing response:", error);
          return { success: false, error: "Invalid server response" };
        }

        if (response.ok) {
          return { success: true, user: data };
        } else {
          return {
            success: false,
            error: (data as any)?.error || "Failed to get user data",
          };
        }
      };

      // Make the request with our custom fetch
      return await customFetch(`${API_URL}/users/me`);
    } catch (error) {
      console.error("Error in getCurrentUserWithToken:", error);
      return {
        success: false,
        error: "Network error or unexpected error fetching user data",
      };
    }
  },
};

export default authService;
