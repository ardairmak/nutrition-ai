import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { VerificationScreen } from "../screens/VerificationScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { OnboardingNameScreen } from "../screens/OnboardingNameScreen";
import { useAuth } from "../contexts/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth screen to handle redirects
const AuthRedirectScreen = () => {
  const { isAuthenticated } = useAuth();

  // This is just a placeholder for the deep link
  // The actual logic is in the AuthContext's handleUrlRedirect

  return null;
};

export function Navigation({ linking }: { linking?: any }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    // Show loading screen while checking authentication status
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is signed in
          user && user.profileSetupComplete !== true ? (
            // Show onboarding if profile is not complete
            // This handles both false and undefined values
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen
                name="OnboardingName"
                component={OnboardingNameScreen}
              />
              {/* Add other onboarding screens here */}
              {/* <Stack.Screen name="OnboardingStats" component={OnboardingStatsScreen} />
              <Stack.Screen name="OnboardingDiet" component={OnboardingDietScreen} />
              <Stack.Screen name="OnboardingGoals" component={OnboardingGoalsScreen} /> */}
            </>
          ) : (
            // Show main app
            <Stack.Screen name="Home" component={HomeScreen} />
          )
        ) : (
          // User is not signed in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="AuthRedirect" component={AuthRedirectScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
