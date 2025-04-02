import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { VerificationScreen } from "../screens/VerificationScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { OnboardingNameScreen } from "../screens/OnboardingNameScreen";
import { OnboardingStatsScreen } from "../screens/OnboardingStatsScreen";
import { OnboardingDietScreen } from "../screens/PlaceholderScreens";
import { OnboardingGoalsScreen } from "../screens/OnboardingGoalsScreen";
import { useAuth } from "../contexts/AuthContext";

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Debug log for navigation state changes
  useEffect(() => {
    console.log("Navigation Auth State:", {
      isLoading,
      isAuthenticated,
      userEmail: user?.email,
      profileSetupComplete: user?.profileSetupComplete,
    });
  }, [isLoading, isAuthenticated, user]);

  // Show loading indicator while AuthContext is initializing
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          user?.profileSetupComplete ? (
            // User is authenticated and profile is complete
            <Stack.Screen name="Home" component={HomeScreen} />
          ) : (
            // User is authenticated but needs onboarding
            // The stack handles the flow internally, starting from Onboarding
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen
                name="OnboardingName"
                component={OnboardingNameScreen}
              />
              <Stack.Screen
                name="OnboardingStats"
                component={OnboardingStatsScreen}
              />
              <Stack.Screen
                name="OnboardingDiet"
                component={OnboardingDietScreen}
              />
              <Stack.Screen
                name="OnboardingGoals"
                component={OnboardingGoalsScreen}
              />
            </>
          )
        ) : (
          // User is not authenticated
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});
