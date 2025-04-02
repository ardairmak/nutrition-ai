import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";

export function OnboardingGoalsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [existingGoals, setExistingGoals] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const fitnessGoals = [
    { id: "gain_muscle", label: "Gain Muscle" },
    { id: "lose_fat", label: "Lose Fat" },
    { id: "improve_endurance", label: "Improve Endurance" },
    { id: "increase_strength", label: "Increase Strength" },
    { id: "increase_flexibility", label: "Increase Flexibility" },
    { id: "improve_overall_health", label: "Improve Overall Health" },
  ];

  useEffect(() => {
    const loadExistingGoals = async () => {
      try {
        if (user && user.fitnessGoals && Array.isArray(user.fitnessGoals)) {
          setExistingGoals(user.fitnessGoals);
          setSelectedGoals(user.fitnessGoals);
          console.log("Loaded existing goals from context:", user.fitnessGoals);
        }
      } catch (error) {
        console.error("Error loading existing goals:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadExistingGoals();
  }, [user]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prevSelected) => {
      if (prevSelected.includes(goalId)) {
        return prevSelected.filter((id) => id !== goalId);
      } else {
        return [...prevSelected, goalId];
      }
    });
  };

  const completeOnboarding = async () => {
    if (selectedGoals.length === 0) {
      Alert.alert("Please select at least one fitness goal");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Completing onboarding with goals:", selectedGoals);

      const completeResponse = await userService.completeOnboarding(
        selectedGoals
      );

      if (completeResponse.success && completeResponse.user) {
        console.log(
          "Onboarding completed successfully. Server user:",
          completeResponse.user
        );

        const finalUserData = {
          ...completeResponse.user,
          fitnessGoals: selectedGoals,
          profileSetupComplete: true,
        };
        setUser(finalUserData);

        console.log("User context updated with final data:", finalUserData);

        Alert.alert(
          "Setup Complete",
          "Your profile has been successfully set up!",
          [{ text: "Great!" }]
        );
      } else {
        console.error("Failed to complete onboarding:", completeResponse.error);
        Alert.alert(
          "Error",
          completeResponse.error ||
            "Failed to finalize onboarding. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during final onboarding step:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Your Fitness Goals</Text>
          <Text style={styles.subtitle}>
            Select the fitness goals you want to achieve. This will help us
            personalize your experience.
          </Text>
        </View>

        <View style={styles.goalsContainer}>
          {fitnessGoals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalButton,
                selectedGoals.includes(goal.id) && styles.goalButtonSelected,
                existingGoals.includes(goal.id) && styles.goalButtonExisting,
              ]}
              onPress={() => toggleGoal(goal.id)}
            >
              <Text
                style={[
                  styles.goalButtonText,
                  selectedGoals.includes(goal.id) &&
                    styles.goalButtonTextSelected,
                ]}
              >
                {goal.label}
                {existingGoals.includes(goal.id) &&
                  selectedGoals.includes(goal.id) &&
                  " ✓"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.helperText}>
          {existingGoals.length > 0
            ? "Your previously selected goals are highlighted. You can modify your selection."
            : "You can select multiple goals."}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            selectedGoals.length === 0 && styles.buttonDisabled,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={completeOnboarding}
          disabled={selectedGoals.length === 0 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  goalButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: "48%",
    alignItems: "center",
  },
  goalButtonSelected: {
    backgroundColor: "#4285F4",
  },
  goalButtonExisting: {
    borderWidth: 2,
    borderColor: "#4285F4",
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  goalButtonTextSelected: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 24,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  button: {
    backgroundColor: "#4285F4",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A4C2F4",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
