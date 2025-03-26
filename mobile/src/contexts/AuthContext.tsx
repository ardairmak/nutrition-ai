import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/api";
import * as WebBrowser from "expo-web-browser";
import {
  Alert,
  Linking,
  Platform,
  TextInput,
  View,
  StyleSheet,
  Button,
  Modal,
} from "react-native";

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
  signOut: () => Promise<void>;
  handleUrlRedirect: (url: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Initialize WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Your server address
const SERVER_ADDRESS = "localhost"; // Changed from IP address to localhost

// Storage keys
const AUTH_TOKEN_KEY = "@auth_token";
const USER_DATA_KEY = "@user_data";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [manualToken, setManualToken] = useState("");

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
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    setIsLoading(true);

    try {
      // Load both token and user data from storage
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (token && userData) {
        // We have cached user data, use it immediately
        setUser(JSON.parse(userData));

        try {
          // Silently try to refresh user data from server
          const freshUserData = await authService.getCurrentUser();
          setUser(freshUserData);
          // Update the cached user data
          await AsyncStorage.setItem(
            USER_DATA_KEY,
            JSON.stringify(freshUserData)
          );
        } catch (error) {
          console.log("Could not refresh user data, using cached data");
          // If server refresh fails, we still have the cached data
        }
      } else if (token) {
        // We have a token but no cached user data
        try {
          // Get user data from server
          const userData = await authService.getCurrentUser();
          setUser(userData);
          // Cache the user data
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        } catch (error) {
          console.error("Failed to get user data:", error);
          // Clear invalid token
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      // If loading fails, clear storage
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlRedirect = async (url: string): Promise<boolean> => {
    console.log("Handling redirect URL:", url);

    try {
      if (url.includes("token=")) {
        // Extract token from URL
        const params = new URLSearchParams(url.split("?")[1]);
        const token = params.get("token");

        if (token) {
          console.log("Found token in URL, saving...");
          // Save token
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

          // Get and save user data
          const userData = await authService.getCurrentUser();
          setUser(userData);
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error handling URL redirect:", error);
      return false;
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      Alert.alert("Error", "Please enter a valid token");
      return;
    }

    setIsLoading(true);
    try {
      // Save token
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, manualToken);

      // Get and save user data
      const userData = await authService.getCurrentUser();
      setUser(userData);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      setTokenModalVisible(false);
      setManualToken("");
    } catch (error) {
      console.error("Error authenticating with token:", error);
      Alert.alert(
        "Authentication Failed",
        "The token is invalid. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // For iOS, use the IP address for better connectivity
      console.log(
        `Opening Google Auth URL: http://${SERVER_ADDRESS}:3000/api/auth/google`
      );

      // Open the browser for authentication
      const result = await WebBrowser.openBrowserAsync(
        `http://${SERVER_ADDRESS}:3000/api/auth/google`
      );

      console.log("Browser result:", JSON.stringify(result, null, 2));

      // In iOS simulator, show the token entry modal if auth was likely completed
      if (result.type === "dismiss" || result.type === "cancel") {
        // First check if the token was set via URL scheme
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          // If no token was set, show the manual entry dialog
          setTokenModalVisible(true);
        } else {
          // Token exists, try to load user data
          try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            Alert.alert("Success", "You have been logged in successfully!");
          } catch (error) {
            console.error("Error loading user data:", error);
            Alert.alert(
              "Authentication Failed",
              "Invalid or expired token. Please try again."
            );
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      Alert.alert(
        "Authentication Failed",
        "Could not connect to authentication server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);

    try {
      // Clear local storage
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      // Reset state
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          isLoading,
          signInWithGoogle,
          signOut,
          handleUrlRedirect,
        }}
      >
        {children}
      </AuthContext.Provider>

      {/* Token Entry Modal */}
      <Modal
        visible={tokenModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTokenModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.tokenInput}
              placeholder="Paste your authentication token"
              value={manualToken}
              onChangeText={setManualToken}
              multiline
              numberOfLines={4}
            />
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={() => setTokenModalVisible(false)}
              />
              <Button title="Submit" onPress={handleManualTokenSubmit} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tokenInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});

export const useAuth = () => useContext(AuthContext);
