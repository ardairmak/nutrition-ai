import React, { useEffect } from "react";
import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import Navigation from "./src/navigation"; // Import default export
import { LogBox } from "react-native";
import notificationService from "./src/services/notificationService";

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate` with no listeners registered",
  "expo-notifications: Android Push notifications", // Ignore expo-notifications warnings
]);

export default function App() {
  // Initialize notifications when app starts (non-blocking)
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const success = await notificationService.initialize();

        if (success) {
          // Schedule smart daily reminders
          await notificationService.scheduleSmartDailyReminders();
        }
      } catch (error) {
        // Don't throw - let the app continue without notifications
      }
    };

    // Run initialization in background, don't block app startup
    setTimeout(initializeNotifications, 2000);
  }, []);

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
