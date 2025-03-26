import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create base axios instance
const api = axios.create({
  // Use localhost instead of IP address
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to all requests if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("@auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication service functions
export const authService = {
  // Initiate Google OAuth flow
  loginWithGoogle: async () => {
    try {
      // This endpoint will redirect to Google
      const response = await api.get("/auth/google", {
        headers: {
          // Browser will handle redirects
          Accept: "text/html,application/xhtml+xml",
        },
        // Important to specify we want the response URL
        maxRedirects: 0,
      });
      return response.request.responseURL;
    } catch (error: any) {
      // For redirects, axios throws an error but includes the redirect URL
      if (error.response && error.response.status === 302) {
        return error.response.headers.location;
      }
      throw error;
    }
  },

  // Handle authentication token from redirects
  handleAuthToken: async (token: string) => {
    if (token) {
      // Store the token
      await AsyncStorage.setItem("@auth_token", token);
      return true;
    }
    return false;
  },

  // Get current user profile
  getCurrentUser: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  // Logout
  logout: async () => {
    await AsyncStorage.removeItem("@auth_token");
  },
};

export default api;
