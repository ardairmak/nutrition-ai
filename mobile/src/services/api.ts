import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AUTH_TOKEN_KEY } from "../constants";

// Server addresses
const getBaseUrl = () => {
  // Use localhost for iOS simulator, IP for physical devices (except iPad)
  const isIosSimulator = Platform.OS === "ios" && Platform.isPad === false;
  const host = isIosSimulator ? "localhost" : "192.168.0.18";
  const port = 3000;

  return `http://${host}:${port}/api`;
};

// Export the API URL for use in other files
export const API_URL = getBaseUrl();

// Get user-specific auth token key
const getAuthTokenKey = (email: string) => `@auth_token_${email.toLowerCase()}`;

// Helper function to get any available auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Try to get user data to find user-specific token
    const allKeys = await AsyncStorage.getAllKeys();
    const userDataKeys = allKeys.filter((key) => key.startsWith("@user_data_"));

    // If we have user data keys, try to get the first user's token
    if (userDataKeys.length > 0) {
      try {
        const userData = await AsyncStorage.getItem(userDataKeys[0]);
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.email) {
            const userToken = await AsyncStorage.getItem(
              getAuthTokenKey(user.email)
            );
            if (userToken) {
              console.log(`API: Found user-specific token for ${user.email}`);
              return userToken;
            }
          }
        }
      } catch (error) {
        console.error("API: Error getting user-specific token:", error);
      }
    }

    // If no user-specific token found, try the generic token
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      console.log("API: Using generic auth token");
      return token;
    }

    // Check all possible token keys as last resort
    const authTokenKeys = allKeys.filter((key) =>
      key.startsWith("@auth_token_")
    );
    if (authTokenKeys.length > 0) {
      const lastToken = await AsyncStorage.getItem(authTokenKeys[0]);
      if (lastToken) {
        console.log(`API: Using fallback token from ${authTokenKeys[0]}`);
        return lastToken;
      }
    }

    console.log("API: No authentication token found");
    return null;
  } catch (error) {
    console.error("API: Error retrieving auth token:", error);
    return null;
  }
};

// API call helper function
export const apiCall = async (
  endpoint: string,
  method: string = "GET",
  data: any = null,
  requiresAuth: boolean = true,
  customHeaders: Record<string, string> = {}
) => {
  try {
    // Prepare URL
    const url = `${API_URL}${endpoint}`;
    console.log(`API ${method} call to: ${url}`);

    // Debug log the request payload for easier debugging
    if (data) {
      console.log("Request payload:", JSON.stringify(data, null, 2));
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // Add auth token if required
    if (requiresAuth) {
      const token = await getAuthToken();
      if (!token) {
        console.error("API: Authentication required but no token found");
        return {
          success: false,
          error: "Authentication required",
        };
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    // Make the request with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 30000);
    });

    // Execute the fetch with timeout
    const response = (await Promise.race([
      fetch(url, options),
      timeoutPromise,
    ])) as Response;

    // Process the response
    try {
      // Try to parse as JSON first
      const text = await response.text();
      let responseData;

      try {
        responseData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error(`API: Error parsing response as JSON: ${parseError}`);
        responseData = { text };
      }

      // Check if the request was successful
      if (response.ok) {
        return {
          success: true,
          ...responseData,
        };
      } else {
        // Log detailed error information
        console.error(`API Error ${response.status}: ${response.statusText}`);
        console.error("Response data:", responseData);

        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: responseData.error || responseData.message || "Request failed",
          ...responseData,
        };
      }
    } catch (responseError) {
      console.error(`API: Error processing response: ${responseError}`);
      return {
        success: false,
        error: "Error processing server response",
      };
    }
  } catch (error) {
    // Handle network errors or timeouts
    const isTimeout =
      error instanceof Error && error.message === "Request timeout";
    const errorMessage = isTimeout
      ? "Request timed out"
      : `Network error: ${error}`;

    console.error(`API call failed: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Removed axios instance, interceptors, and exported authService object
