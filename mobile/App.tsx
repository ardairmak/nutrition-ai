import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { Routes } from "./src/navigation/Routes";
import * as Linking from "expo-linking";
import { Alert, LogBox } from "react-native";
import { LinkingOptions } from "@react-navigation/native";
import { RootStackParamList } from "./src/types/navigation";

// Ignore some harmless warnings
LogBox.ignoreLogs(["AsyncStorage has been extracted from react-native"]);

// Define link prefixes for deep linking
const prefix = Linking.createURL("/");

// Configure linking for deep links
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, "foodrecognition://", "exp://"],
  config: {
    screens: {
      Auth: "auth",
      Main: "home",
      AuthRedirect: "auth/redirect/:token?",
    },
  },
  // Debug linking
  async getInitialURL() {
    // First, get the initial URL from Expo's linking API
    const url = await Linking.getInitialURL();
    console.log("Deep link initial URL:", url);
    return url;
  },
  subscribe(listener) {
    // Listen for deep links while the app is open
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("Deep link event:", url);
      listener(url);
    });
    return () => subscription.remove();
  },
};

console.log("Deep link prefix:", prefix);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <Routes />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
