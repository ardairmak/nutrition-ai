import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/api";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Platform } from "react-native";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
};

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleUrlRedirect: (url: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Initialize WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Your server address - use localhost for simulator, IP for real device
const SERVER_ADDRESS =
  Platform.OS === "ios" && !Platform.isPad ? "localhost" : "192.168.0.18";

// Storage keys
const AUTH_TOKEN_KEY = "@auth_token";
const USER_DATA_KEY = "@user_data";

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

      // Clean the token - remove any trailing hash or fragment
      if (token && token.includes("#")) {
        token = token.split("#")[0];
      }

      // Process the token if found
      if (token) {
        console.log("Found token in URL, saving cleaned token");

        // Save token
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

        // Get and store user data
        try {
          const userData = await authService.getCurrentUser();
          if (userData) {
            console.log("Successfully retrieved user data");
            setUser(userData);
            setIsAuthenticated(true);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            return true;
          } else {
            console.error("Got null user data with valid token");
            setIsAuthenticated(false);
            return false;
          }
        } catch (userError) {
          console.error("Error getting user data:", userError);
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );
      console.log("Auth session result:", JSON.stringify(result));

      if (result.type === "success" && result.url) {
        console.log("Successful auth redirect URL:", result.url);
        const success = await handleUrlRedirect(result.url);
        if (success) {
          console.log("Successfully authenticated with Google");
          // Successfully authenticated, now we can set the user as logged in
          setIsAuthenticated(true);
          return;
        }
      } else if (result.type === "cancel") {
        console.log("Authentication was cancelled by the user");
        Alert.alert(
          "Authentication Cancelled",
          "You cancelled the Google sign-in process."
        );
        return;
      }

      // If we get here, something went wrong
      Alert.alert(
        "Authentication Failed",
        "Could not sign in with Google. Please try again or use email login."
      );
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
      // Use our API login instead of Firebase
      return await signIn(email, password);
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
      setIsLoading(true);

      // Clear AsyncStorage
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);

      // Reset auth state
      setUser(null);
      setIsAuthenticated(false);

      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // Call the login API
      const response = await authService.login(email, password);

      if (response.token) {
        // Save the token
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);

        // Set user data
        setUser(response.user);
        setIsAuthenticated(true);

        // Save user data
        await AsyncStorage.setItem(
          USER_DATA_KEY,
          JSON.stringify(response.user)
        );

        console.log("Successfully logged in with email:", email);
        return true;
      } else {
        console.error("No token received from login");
        Alert.alert("Login Failed", "Invalid credentials. Please try again.");
        return false;
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Check if this is a Google-authenticated user trying to log in with password
      if (error.response?.status === 400 && error.response?.data?.error) {
        Alert.alert(
          "Login Failed",
          error.response.data.error || "Please use Google sign-in instead."
        );
      } else {
        Alert.alert(
          "Login Failed",
          "Could not login with email and password. Please check your credentials and try again."
        );
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing token and restore auth state
  const checkExistingToken = async () => {
    try {
      setIsLoading(true);

      // Check for token in AsyncStorage
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (token) {
        console.log("Found existing token");

        // Try to get user data with token
        try {
          const userData = await authService.getCurrentUser();
          if (userData) {
            console.log("Successfully restored user session");
            setUser(userData);
            setIsAuthenticated(true);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
          } else {
            // Clear invalid token
            console.log("Invalid token - clearing storage");
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(USER_DATA_KEY);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error restoring session:", error);
          // Clear invalid token
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem(USER_DATA_KEY);
          setIsAuthenticated(false);
        }
      } else {
        console.log("No existing token found");
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking for token:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
