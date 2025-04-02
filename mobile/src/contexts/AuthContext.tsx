import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authService from "../services/authService";
import userService from "../services/userService";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Platform } from "react-native";
import {
  AUTH_TOKEN_KEY,
  USER_DATA_KEY as GLOBAL_USER_DATA_KEY,
} from "../constants";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  profileSetupComplete: boolean;
  fitnessGoals?: string[];
  height?: number;
  weight?: number;
  gender?: string;
  dateOfBirth?: string;
  activityLevel?: string;
  dietaryPreferences?: string[];
  provider?: string; // 'google', 'email', etc.
};

type SignInResult = boolean | { requiresVerification: boolean; email: string };

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleUrlRedirect: (url: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Initialize WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Your server address - use localhost for simulator, IP for real device
const SERVER_ADDRESS =
  Platform.OS === "ios" && !Platform.isPad ? "localhost" : "192.168.0.18";

// Storage keys - make them user-specific to prevent token mixups
const getAuthTokenKey = (email: string) => `@auth_token_${email.toLowerCase()}`;
const getUserDataKey = (email: string) => `@user_data_${email.toLowerCase()}`;

// Generic keys for fallback and logout operations
const USER_DATA_KEY = GLOBAL_USER_DATA_KEY;

// Function to clear all auth data for secure logout
const clearAllAuthData = async () => {
  try {
    // Clear generic keys
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);

    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Find and remove all auth tokens and user data
    const authKeys = allKeys.filter(
      (key) => key.startsWith("@auth_token_") || key.startsWith("@user_data_")
    );

    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log(`Cleared ${authKeys.length} auth-related keys`);
    }
  } catch (error) {
    console.error("Failed to clear auth data:", error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Set up URL event listener for deep linking
  useEffect(() => {
    // For handling deep links in development
    const setupURLListener = async () => {
      // Get the initial URL
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log("Initial URL:", initialUrl);
        await handleUrlRedirect(initialUrl);
      }

      // Add event listener for deep links when app is running
      const subscription = Linking.addEventListener("url", async ({ url }) => {
        console.log("Linked URL event:", url);
        await handleUrlRedirect(url);
      });

      return () => {
        subscription.remove();
      };
    };

    setupURLListener();
  }, []);

  useEffect(() => {
    // Load user from storage on app start
    checkExistingToken();
  }, []);

  const handleUrlRedirect = async (url: string): Promise<boolean> => {
    console.log("Handling redirect URL:", url);

    try {
      // Skip if no URL
      if (!url) return false;

      // Extract token from URL
      let token = null;

      // Try to extract token using URL parsing
      try {
        // Parse URL manually
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        token = params.get("token");
        console.log("Parsed URL params:", params.toString());
      } catch (parseError) {
        console.error("Error parsing URL:", parseError);
      }

      // Fallback methods if URL parsing doesn't work
      if (!token) {
        // Method 1: Extract from token=xyz query parameter
        if (url.includes("token=")) {
          const tokenPart = url.split("token=")[1];
          if (tokenPart) {
            token = tokenPart.split("&")[0];
          }
        }

        // Method 2: Extract from path structure (e.g., /auth/token/xyz)
        if (!token && url.includes("/auth/")) {
          const parts = url.split("/");
          const tokenIndex = parts.findIndex((part) => part === "auth") + 2;
          if (tokenIndex < parts.length) {
            token = parts[tokenIndex];
          }
        }
      }

      // Process the token if found
      if (token) {
        console.log("Found token in URL, saving cleaned token");

        // Clean the token - remove any trailing hash or fragment
        if (token.includes("#")) {
          console.log("Token contains # fragment, cleaning it");
          token = token.split("#")[0];
        }

        // Log the final token (with some characters hidden for security)
        const tokenLength = token.length;
        console.log(
          `Cleaned token: ${token.substring(0, 10)}...${token.substring(
            tokenLength - 10
          )} (${tokenLength} chars)`
        );

        // Validate token before proceeding
        const { valid, payload } = authService.validateToken(token);
        if (!valid || !payload || !payload.email) {
          console.error("Invalid token received from server");
          Alert.alert(
            "Authentication Error",
            "Invalid authentication token received. Please try again."
          );
          return false;
        }

        console.log(`Token validated for: ${payload.email} (${payload.id})`);

        // Use email from token payload for storage keys
        const userEmail = payload.email;

        // First, clear all auth state completely
        await clearAllAuthData();
        setUser(null);
        setIsAuthenticated(false);

        console.log("Completely cleared auth state before Google login");

        // Wait a moment for AsyncStorage to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Save token directly
        try {
          console.log("Saving token to AsyncStorage...");
          await AsyncStorage.setItem(getAuthTokenKey(userEmail), token);
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token); // Also save to generic key as backup
          console.log(`Token saved (${token.length} chars)`);
        } catch (storageError) {
          console.error("AsyncStorage error:", storageError);
          Alert.alert("Login Error", "Could not save login credentials");
          return false;
        }

        // Get and store user data
        try {
          console.log("Getting user data with token...");

          // Pass the token directly to avoid AsyncStorage race condition
          console.log(
            `Using direct token pass instead of AsyncStorage retrieval`
          );

          // Call getCurrentUser with the token directly
          const response = await authService.getCurrentUserWithToken(token);

          if (!response.success) {
            // Handle the error case explicitly
            console.error("Failed to get user data:", response.error);
            Alert.alert(
              "Authentication Error",
              `Could not retrieve your account information: ${response.error}`
            );
            return false;
          }

          if (!response.user) {
            console.error("Success response but no user data!");
            Alert.alert(
              "Authentication Error",
              "Your account information appears to be missing"
            );
            return false;
          }

          console.log(
            "Successfully retrieved user data from Google auth:",
            JSON.stringify(response.user)
          );

          // For Google login users, check if they need to complete onboarding
          let userData = response.user;

          // Force a fresh profile check to get the most up-to-date data
          console.log(
            "Forcing a fresh profile check from server for Google login"
          );
          const freshProfileCheck = await userService.getProfile();

          if (freshProfileCheck.success && freshProfileCheck.user) {
            // Update userData with the most current server data
            userData = {
              ...userData,
              fitnessGoals: freshProfileCheck.user.fitnessGoals || [],
              dietaryPreferences:
                freshProfileCheck.user.dietaryPreferences || [],
              activityLevel: freshProfileCheck.user.activityLevel,
              height: freshProfileCheck.user.height,
              weight: freshProfileCheck.user.weight,
              profileSetupComplete: freshProfileCheck.user.profileSetupComplete,
            };
          } else {
            console.warn("Could not get fresh profile data from server");
          }

          // Verify profile completion
          const isComplete = await userService.verifyProfileCompletion();
          console.log(
            `Profile completion verified for Google login: ${isComplete}`
          );

          // Use the verified status
          userData.profileSetupComplete = isComplete;

          // Set user directly with updated profile status
          setUser(userData);
          setIsAuthenticated(true);

          // Store in AsyncStorage only after state is set
          await AsyncStorage.setItem(
            getUserDataKey(userData.email),
            JSON.stringify(userData)
          );

          console.log("Google login complete, user data stored");
          return true;
        } catch (userError) {
          console.error("Error getting user data:", userError);
          await clearAllAuthData();
          setIsAuthenticated(false);
          return false;
        }
      } else {
        console.log("No token found in URL:", url);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error("Error handling URL redirect:", error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // The redirect URI for your app
      const redirectUri = "foodrecognition://auth";

      // Use localhost for iOS simulator, IP for physical devices
      const isIosSimulator = Platform.OS === "ios" && Platform.isPad === false;
      const host = isIosSimulator ? "localhost" : "192.168.0.18";
      const port = 3000;

      // Ensure mobile=true is properly passed and encoded
      const authUrl = `http://${host}:${port}/api/auth/google?mobile=true&redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      console.log(`Opening Google Auth URL: ${authUrl}`);

      // Use openAuthSessionAsync for a better authentication flow
      let result;
      try {
        result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        console.log("Auth session result:", JSON.stringify(result));
      } catch (browserError) {
        console.error("WebBrowser error:", browserError);
        Alert.alert(
          "Browser Error",
          "Failed to open the authentication browser. Please try again."
        );
        return;
      }

      if (result.type === "success" && result.url) {
        console.log("Successful auth redirect URL:", result.url);

        // Add timeout to handle URL redirect
        try {
          const redirectPromise = handleUrlRedirect(result.url);
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Redirect timed out")), 15000)
          );

          const success = await Promise.race([
            redirectPromise,
            timeoutPromise,
          ]).catch((err) => {
            console.error("Redirect error or timeout:", err);
            return false;
          });

          if (success) {
            console.log("Successfully authenticated with Google");
            // Successfully authenticated, now we can set the user as logged in
            setIsAuthenticated(true);
            return;
          } else {
            throw new Error("Failed to process authentication redirect");
          }
        } catch (redirectError) {
          console.error("Redirect processing error:", redirectError);
          Alert.alert(
            "Authentication Error",
            "Failed to process the login response. Please try again."
          );
          return;
        }
      } else if (result.type === "cancel") {
        console.log("Authentication was cancelled by the user");
        Alert.alert(
          "Authentication Cancelled",
          "You cancelled the Google sign-in process."
        );
        return;
      } else {
        console.error("WebBrowser returned unexpected result:", result);
        Alert.alert(
          "Authentication Failed",
          "Could not sign in with Google. Please try again or use email login."
        );
        return;
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      Alert.alert(
        "Authentication Error",
        "An error occurred while signing in with Google."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return false;
    }

    try {
      setIsLoading(true);
      // Use our new signIn function
      const result = await signIn(email, password);
      // If result is true, login was successful
      return result === true;
    } catch (error: any) {
      console.error("Email sign in error:", error);
      let message = "Failed to sign in";
      Alert.alert("Authentication Failed", message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new account with email and password
  const createAccount = async (email: string, password: string) => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Register using our server API
      const userData = {
        email,
        password,
        firstName: "",
        lastName: "",
        phoneNumber: "",
      };

      const response = await authService.register(userData);
      console.log("Created account for:", email);

      // Log the user in
      await signIn(email, password);
    } catch (error: any) {
      console.error("Account creation error:", error);
      let message = "Failed to create account";

      if (error.response?.status === 400) {
        message = error.response.data.error || "Email already in use";
      }

      Alert.alert("Registration Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out user");

      // Store email before clearing state for proper key cleanup
      const userEmail = user?.email;

      // Clear auth service state
      await authService.signOut();

      // Clear AsyncStorage with email-specific keys if available
      await clearAllAuthData();

      // Reset state
      setUser(null);
      setIsAuthenticated(false);

      console.log("Sign out complete");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<SignInResult> => {
    try {
      console.log(`Signing in with email: ${email}`);
      const response = await authService.signIn(email, password);

      if (response.success && response.token) {
        await clearAllAuthData();
        setUser(null);
        setIsAuthenticated(false);
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Save token ONLY to user-specific location
        await AsyncStorage.setItem(getAuthTokenKey(email), response.token);

        // Fetch FRESH user data using the token to ensure consistency
        const currentUserResponse = await authService.getCurrentUserWithToken(
          response.token
        );

        if (!currentUserResponse.success || !currentUserResponse.user) {
          console.error(
            "Failed to fetch user data after login:",
            currentUserResponse.error
          );
          await clearAllAuthData(); // Clean up failed login
          Alert.alert(
            "Login Error",
            "Could not retrieve user profile after login."
          );
          return false;
        }

        const userDataFromApi = currentUserResponse.user;

        // *** ADD PROFILE VERIFICATION ***
        console.log("Verifying profile completion for email login...");
        const isComplete = await userService.verifyProfileCompletion();
        console.log(`Profile completion verified for ${email}: ${isComplete}`);

        const finalUserData = {
          ...userDataFromApi,
          profileSetupComplete: isComplete, // Use verified status
        };

        // Update state
        setUser(finalUserData);
        setIsAuthenticated(true);

        // Store FINAL verified data ONLY in user-specific location
        await AsyncStorage.setItem(
          getUserDataKey(email),
          JSON.stringify(finalUserData)
        );
        console.log(`User data saved for ${email}`);

        return true;
      } else if (response.requiresVerification) {
        return { requiresVerification: true, email: response.email || email };
      } else {
        Alert.alert("Login Error", response.error || "Authentication failed");
        return false;
      }
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert("Login Error", "An unexpected error occurred.");
      return false;
    }
  };

  const checkExistingToken = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      setIsAuthenticated(false);

      // Try to get user profile directly using userService
      // This internally handles token retrieval logic
      const response = await userService.getProfile();

      if (!response.success || !response.user) {
        console.log("No valid session found or user data not available");
        await clearAllAuthData();
        setIsLoading(false);
        return;
      }

      const userDataFromApi = response.user;

      try {
        // Verify profile completion
        const isComplete = await userService.verifyProfileCompletion();
        console.log(
          `Profile completion verified for existing session: ${isComplete}`
        );

        const finalUserData = {
          ...userDataFromApi,
          profileSetupComplete: isComplete,
        };

        // Set state
        setUser(finalUserData);
        setIsAuthenticated(true);

        // Save verified data ONLY to user-specific key
        if (finalUserData.email) {
          await AsyncStorage.setItem(
            getUserDataKey(finalUserData.email),
            JSON.stringify(finalUserData)
          );
          console.log(`Verified session data saved for ${finalUserData.email}`);
        }

        console.log("Session restored successfully");
      } catch (verifyError) {
        console.error("Error verifying profile completion:", verifyError);
        // Even if verification fails, still set the user with server-provided profileSetupComplete
        setUser(userDataFromApi);
        setIsAuthenticated(true);
        console.log(
          "Session restored with unverified profile completion status"
        );
      }
    } catch (error) {
      console.error("Error checking for token:", error);
      await clearAllAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure state is updated before navigation
  const setUserWithRefresh = (newUser: User | null) => {
    console.log("Setting user with refresh:", newUser?.email);

    // Set user with a slight delay to ensure the state updates completely
    setUser(newUser);

    // If user was updated with profileSetupComplete = true, we need to refresh auth state
    if (newUser && newUser.profileSetupComplete === true) {
      console.log("User profile completed, refreshing auth state");

      // Small delay to ensure navigation changes catch the new state
      setTimeout(() => {
        console.log("Auth state refresh complete");
        // Force a re-render by toggling and resetting the state
        setIsAuthenticated(false);
        setTimeout(() => setIsAuthenticated(true), 50);
      }, 100);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        createAccount,
        signOut,
        handleUrlRedirect,
        signIn,
        setUser: setUserWithRefresh,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
