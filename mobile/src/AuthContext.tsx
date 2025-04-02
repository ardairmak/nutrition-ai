import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService, userService } from "./services";
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from "./constants";

// Define User interface
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileSetupComplete: boolean;
  [key: string]: any; // Allow for other properties
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkExistingToken: () => Promise<void>;
  clearAllAuthData: () => Promise<void>;
  getUserDataKey: (email: string) => string;
  getAuthTokenKey: (email: string) => string;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  checkExistingToken: async () => {},
  clearAllAuthData: async () => {},
  getUserDataKey: (email: string) => `@user_data_${email.toLowerCase()}`,
  getAuthTokenKey: (email: string) => `@auth_token_${email.toLowerCase()}`,
});

// Helper functions to get user-specific keys
const getUserDataKey = (email: string) => `@user_data_${email.toLowerCase()}`;
const getAuthTokenKey = (email: string) => `@auth_token_${email.toLowerCase()}`;

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkExistingToken = async () => {
    try {
      setIsLoading(true);
      console.log("Checking for existing authentication token...");

      // Reset state first
      setUser(null);
      setIsAuthenticated(false);

      // Try to get any stored user data first to get the email
      const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
      console.log(`Found stored user data: ${!!storedUserData}`);

      // Parse stored user data if available
      let parsedUserData: User | null = null;
      if (storedUserData) {
        try {
          parsedUserData = JSON.parse(storedUserData) as User;
          console.log("Loaded stored user data for:", parsedUserData.email);
        } catch (parseError) {
          console.error("Error parsing stored user data:", parseError);
        }
      }

      // Try to get a token - either user-specific or generic
      let token = null;

      // If we have user data with email, try the user-specific token first
      if (parsedUserData?.email) {
        token = await AsyncStorage.getItem(
          getAuthTokenKey(parsedUserData.email)
        );
        if (token) {
          console.log(`Found user-specific token for ${parsedUserData.email}`);
        }
      }

      // If no user-specific token, fall back to generic token
      if (!token) {
        token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          console.log("Found generic token");
        }
      }

      // If no token found at all, we're done
      if (!token) {
        console.log("No token found, user is not authenticated");
        await clearAllAuthData(); // Clear any stale data
        setIsLoading(false);
        return;
      }

      console.log("Found existing token, validating with server...");

      // Try to get user data with token from API
      try {
        // Force a direct token validation first
        const isValid = authService.validateToken(token);
        if (!isValid.valid) {
          console.error("Token validation failed - clearing storage");
          await clearAllAuthData();
          setIsLoading(false);
          return;
        }

        console.log("Token validated, fetching current user data...");
        const response = await authService.getCurrentUserWithToken(token);

        if (!response.success || !response.user) {
          console.log("Invalid token or user data - clearing storage");
          await clearAllAuthData();
          setIsLoading(false);
          return;
        }

        console.log("User data from API:", JSON.stringify(response.user));

        // Check and update profile status for existing users
        const profileStatus = await userService.ensureProfileStatus();
        console.log("Profile status response:", JSON.stringify(profileStatus));

        // Get a fresh profile directly to ensure we have the most up-to-date data
        console.log("Getting fresh profile data for existing token");
        const freshProfileData = await userService.getProfile();

        // Verify profile completion status based on actual data
        // Get user info from response, prioritizing fresh data
        const userInfo =
          freshProfileData.success && freshProfileData.user
            ? freshProfileData.user
            : response.user;

        console.log(
          "Fresh profile data for fitness goals:",
          userInfo.fitnessGoals || []
        );

        // Use verified profile completion status
        const isComplete = await userService.verifyProfileCompletion();
        console.log("Profile completion verified:", isComplete);

        // Use API data, with our verified profile status
        const userData = {
          ...(profileStatus.success && profileStatus.user
            ? profileStatus.user
            : response.user),
          // Override with our verified profile status
          profileSetupComplete: isComplete,
        };

        console.log("Final user data being set:", JSON.stringify(userData));

        // Set user and authentication state
        setUser(userData);
        setIsAuthenticated(true);

        // Save updated user data to storage (both user-specific and generic keys)
        if (userData.email) {
          await AsyncStorage.setItem(
            getUserDataKey(userData.email),
            JSON.stringify(userData)
          );
        }
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

        console.log("Session restored successfully for:", userData.email);
      } catch (error) {
        console.error("Error restoring session:", error);
        // Clear invalid token
        await clearAllAuthData();
      }
    } catch (error) {
      console.error("Error checking for token:", error);
      await clearAllAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllAuthData = async () => {
    // Implement the logic to clear all authentication data from storage
    // This might involve removing tokens, user data, and any other related information
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);

    // Also clear any user-specific tokens
    const allKeys = await AsyncStorage.getAllKeys();
    const authKeys = allKeys.filter(
      (key) => key.startsWith("@auth_token_") || key.startsWith("@user_data_")
    );

    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }

    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    checkExistingToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        checkExistingToken,
        clearAllAuthData,
        getUserDataKey,
        getAuthTokenKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
