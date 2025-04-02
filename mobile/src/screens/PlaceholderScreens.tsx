import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import needed constants
const USER_DATA_KEY = "user_data";

export function OnboardingStatsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <PlaceholderScreen
      title="Health Statistics"
      description="This screen will collect your health statistics like height, weight, and activity level."
      buttonText="Next"
      onButtonPress={() => navigation.navigate("OnboardingDiet")}
      isLoading={false}
    />
  );
}

export function OnboardingDietScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [dietGoal, setDietGoal] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const dietGoalOptions = [
    { label: "Cut (Lose Weight)", value: "cut" },
    { label: "Maintain", value: "maintain" },
    { label: "Bulk (Gain Weight)", value: "bulk" },
  ];

  const activityLevelOptions = [
    { label: "Sedentary (Little to no exercise)", value: "sedentary" },
    { label: "Light (1-2 workouts/week)", value: "light" },
    { label: "Moderate (3-5 workouts/week)", value: "moderate" },
    { label: "Active (Daily exercise)", value: "active" },
    { label: "Extreme (Intense training 2x/day)", value: "extreme" },
  ];

  // Load existing data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile.success && profile.user) {
          // Load diet goal from dietaryPreferences array
          if (
            profile.user.dietaryPreferences &&
            profile.user.dietaryPreferences.length > 0
          ) {
            const savedDietGoal = profile.user.dietaryPreferences.find(
              (pref: string) => ["cut", "maintain", "bulk"].includes(pref)
            );
            if (savedDietGoal) {
              setDietGoal(savedDietGoal);
            }
          }

          // Load activity level
          if (profile.user.activityLevel) {
            setActivityLevel(profile.user.activityLevel);
          }
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadProfileData();
  }, []);

  const handleNext = async () => {
    if (!dietGoal || !activityLevel) {
      Alert.alert("Please select both your diet goal and activity level");
      return;
    }

    setIsLoading(true);
    try {
      // Update profile with diet goal and activity level
      const response = await userService.updateProfile({
        dietaryPreferences: [dietGoal],
        activityLevel: activityLevel,
      });

      if (response.success) {
        console.log("Diet and activity preferences saved successfully");
        navigation.navigate("OnboardingGoals");
      } else {
        Alert.alert("Error", response.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Your Diet & Activity</Text>
        <Text style={styles.description}>
          Let us know your fitness goals and activity level so we can
          personalize your experience
        </Text>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Diet Goal</Text>
          <View style={styles.optionsContainer}>
            {dietGoalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dietGoal === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setDietGoal(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    dietGoal === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <View style={styles.optionsContainer}>
            {activityLevelOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  activityLevel === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setActivityLevel(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    activityLevel === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!dietGoal || !activityLevel) && styles.buttonDisabled,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!dietGoal || !activityLevel || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function OnboardingGoalsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Mark profile as complete
      console.log("Completing onboarding...");
      const response = await userService.completeOnboarding();

      if (response.success && response.user) {
        console.log("Onboarding completed successfully:", response.user);
        // Update user in context
        setUser(response.user);

        // Double-check to make sure it worked
        const profileStatus = await userService.getProfile();
        if (profileStatus.success) {
          console.log("Profile after completion:", profileStatus.user);
        }

        // Save the updated user to AsyncStorage
        await AsyncStorage.setItem(
          USER_DATA_KEY,
          JSON.stringify(response.user)
        );

        // Show success alert
        Alert.alert(
          "Setup Complete",
          "Your profile has been successfully set up!",
          [{ text: "Great!", style: "default" }]
        );
      } else {
        console.error("Failed to complete onboarding:", response.error);
        Alert.alert(
          "Error",
          "Failed to complete onboarding. Please try again."
        );
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PlaceholderScreen
      title="Your Goals"
      description="This screen will collect your nutrition and fitness goals."
      buttonText={isLoading ? "Completing..." : "Complete Setup"}
      onButtonPress={completeOnboarding}
      isLoading={isLoading}
    />
  );
}

// Reusable placeholder component
function PlaceholderScreen({
  title,
  description,
  buttonText,
  onButtonPress,
  isLoading,
}: {
  title: string;
  description: string;
  buttonText: string;
  onButtonPress: () => void;
  isLoading: boolean;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.comingSoon}>
          Coming Soon! This screen is not yet fully implemented.
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onButtonPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  comingSoon: {
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 40,
    fontStyle: "italic",
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  optionsContainer: {
    width: "100%",
    flexDirection: "column",
    gap: 10,
  },
  optionButton: {
    backgroundColor: "#f0f0f0",
    padding: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: "#4285F4",
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 30,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
});
