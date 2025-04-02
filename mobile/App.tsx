import React from "react";
import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import Navigation from "./src/navigation"; // Import default export
import { LogBox } from "react-native";

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate` with no listeners registered",
]);

export default function App() {
  // Define deep linking configuration
  const linking = {
    prefixes: ["foodrecognition://", "exp://"],
    config: {
      screens: {
        AuthRedirect: "auth",
        Login: "login",
        Home: "home",
        Verification: "verify",
        Onboarding: "onboarding",
        OnboardingName: "onboarding/name",
      },
    },
  };

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Navigation />
    </AuthProvider>
  );
}
