import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { VerificationScreen } from "../screens/VerificationScreen";
import { CameraScreen } from "../screens/CameraScreen";
import { useAuth } from "../contexts/AuthContext";
import { MainTabNavigator } from "./MainTabNavigator";
import { OnboardingNewScreen } from "../screens/OnboardingNewScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { EditGoalsScreen } from "../screens/EditGoalsScreen";
import { DietaryPreferencesScreen } from "../screens/DietaryPreferencesScreen";
import { AllergiesScreen } from "../screens/AllergiesScreen";
import { ActivityLevelScreen } from "../screens/ActivityLevelScreen";
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";
import { USER_DATA_KEY } from "../constants";
import { RootStackParamList } from "./types";
import FriendProfileScreen from "../screens/FriendProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
            <>
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen name="Camera" component={CameraScreen} />
              <Stack.Screen
                name="Friends"
                component={FriendsScreen}
                options={{
                  headerShown: true,
                  title: "Friends",
                  headerBackTitle: "Profile",
                  headerStyle: {
                    backgroundColor: "#fff",
                  },
                  headerTintColor: "#4285F4",
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                  headerShown: true,
                  title: "Edit Profile",
                  headerBackTitle: "Profile",
                  headerStyle: {
                    backgroundColor: "#fff",
                  },
                  headerTintColor: "#4285F4",
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="EditGoals"
                component={EditGoalsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="DietaryPreferences"
                component={DietaryPreferencesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Allergies"
                component={AllergiesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ActivityLevel"
                component={ActivityLevelScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="FriendProfile"
                component={FriendProfileScreen}
                options={{
                  headerShown: false,
                }}
              />
            </>
          ) : (
            // User is authenticated but needs onboarding
            <>
              {/* Intro onboarding */}
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />

              {/* Unified Onboarding Experience */}
              <Stack.Screen
                name="OnboardingNew"
                component={OnboardingNewScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />

              <Stack.Screen name="Home" component={HomeScreen} />
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
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555555",
  },
});
