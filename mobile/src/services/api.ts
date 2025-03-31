import axios, { AxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Server addresses
const LOCALHOST = "localhost";
const SERVER_IP = "192.168.0.18"; // Update this if your server IP changes
const SERVER_PORT = 3000;

// Get the correct API URL based on platform
const getBaseUrl = () => {
  if (Platform.OS === "web") {
    return `http://${LOCALHOST}:${SERVER_PORT}/api`;
  }

  // For iOS simulator
  if (Platform.OS === "ios" && !Platform.isPad) {
    return `http://${LOCALHOST}:${SERVER_PORT}/api`;
  }

  // For physical device or Android emulator
  return `http://${SERVER_IP}:${SERVER_PORT}/api`;
};

const API_URL = getBaseUrl();
const AUTH_TOKEN_KEY = "@auth_token";

// Create API instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        // Add token to headers for every request
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Added token to request:", config.url);
      }
    } catch (error) {
      console.error("Error adding auth token to request:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  // Login with email/password
  async login(email: string, password: string) {
    try {
      console.log(`Logging in with email: ${email}`);
      const response = await api.post("/auth/login", { email, password });
      console.log("Login response:", response.status);
      return response.data;
    } catch (error) {
      console.error("Login request failed:", error);
      throw error;
    }
  },

  // Register new user
  async register(userData: any) {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // Get current user data using token
  async getCurrentUser() {
    try {
      const response = await api.get("/users/me");
      return response.data;
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  },

  // Authenticate with Google token
  async authenticateWithGoogleToken(googleToken: string) {
    try {
      const response = await api.post("/auth/google-token", {
        idToken: googleToken,
      });
      return response.data.user;
    } catch (error) {
      console.error("Google auth error:", error);
      throw error;
    }
  },

  // Set password for social login user
  async setPasswordForSocialLogin(password: string) {
    try {
      const response = await api.post("/auth/set-password", { password });
      return response.data;
    } catch (error) {
      console.error("Error setting password:", error);
      throw error;
    }
  },
};

export default api;
