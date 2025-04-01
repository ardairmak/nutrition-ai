import { API_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY } from "../constants";

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

const authService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token
        if (data.token) {
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
        return { success: true, ...data };
      }

      return {
        success: false,
        error: data.error || "Authentication failed",
        requiresVerification: data.requiresVerification || false,
        email: data.email,
      };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Register a new user account
   */
  register: async (userData: any): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, ...data };
      }

      return { success: false, error: data.error || "Registration failed" };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Send a verification email
   */
  sendVerificationEmail: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/verify/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || "Verification email sent",
        };
      }

      return {
        success: false,
        error: data.error || "Failed to send verification email",
      };
    } catch (error) {
      console.error("Send verification error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Verify email with code
   */
  verifyEmail: async (email: string, code: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || "Email verified successfully",
        };
      }

      return { success: false, error: data.error || "Verification failed" };
    } catch (error) {
      console.error("Verification error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  },

  // Validate a JWT token
  validateToken: (token: string): { valid: boolean; payload?: any } => {
    try {
      // Basic structure validation
      if (!token || !token.includes(".") || token.split(".").length !== 3) {
        console.error("Invalid token structure");
        return { valid: false };
      }

      // Parse the payload (middle part)
      const payload = JSON.parse(atob(token.split(".")[1]));

      // Check for required fields
      if (!payload.id || !payload.email) {
        console.error("Token missing required fields");
        return { valid: false };
      }

      // Log valid token info
      console.log(`Token validated for user: ${payload.email} (${payload.id})`);
      return { valid: true, payload };
    } catch (error) {
      console.error("Error validating token:", error);
      return { valid: false };
    }
  },

  /**
   * Get current user details (using stored token)
   * @deprecated Use getCurrentUserWithToken when possible to avoid race conditions
   */
  getCurrentUser: async (): Promise<ApiResponse> => {
    try {
      console.log("Getting token from storage...");
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        console.warn("No token found in AsyncStorage");
        return { success: false, error: "No authentication token found" };
      }

      // Use the direct token method to avoid duplicating code
      return authService.getCurrentUserWithToken(token);
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return {
        success: false,
        error: "Error accessing secure storage",
      };
    }
  },

  /**
   * Get current user details with direct token input
   * (Avoids AsyncStorage race conditions)
   */
  getCurrentUserWithToken: async (token: string): Promise<ApiResponse> => {
    if (!token) {
      console.error("No token provided");
      return { success: false, error: "No authentication token provided" };
    }

    // Log token info (truncated for security)
    const tokenLength = token.length;
    const tokenPreview =
      token.substring(0, 10) + "..." + token.substring(tokenLength - 5);
    console.log(`Using token: ${tokenPreview} (${tokenLength} chars)`);

    try {
      // Make API request
      console.log(`Making request to ${API_URL}/users/me`);
      const response = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`Response status: ${response.status}`);

      // Handle response status
      if (response.status === 401) {
        console.warn("Token is invalid (401)");
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        return {
          success: false,
          error: "Authentication expired",
        };
      }

      // Parse response
      const data = await response.json();

      if (response.ok && data) {
        console.log(`Got user data: ${data.email}`);
        return { success: true, user: data };
      } else {
        console.error("API error:", data.error);
        return {
          success: false,
          error: data.error || "Failed to get user data",
        };
      }
    } catch (error) {
      console.error("Network error:", error);
      return {
        success: false,
        error: "Network error",
      };
    }
  },
};

export default authService;
