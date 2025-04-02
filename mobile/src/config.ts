// API configuration
import { Platform } from "react-native";

// Correctly handle different environments
export const API_URL = __DEV__
  ? Platform.OS === "ios" && !Platform.isPad
    ? "http://localhost:3000/api" // iOS simulator uses localhost
    : "http://192.168.0.18:3000/api" // Physical devices need IP address
  : "https://your-production-api.com/api"; // Production API URL

// Console log to verify configuration on app start
console.log(`Using API URL: ${API_URL} (Platform: ${Platform.OS})`);
