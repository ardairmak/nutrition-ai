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

export function OnboardingDietScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // State for dietary preferences and activity level
  const [selectedDiets, setSelectedDiets] = useState<string[]>(
    user?.dietaryPreferences || []
  );
  const [selectedActivity, setSelectedActivity] = useState<string>(
    user?.activityLevel || ""
  );

  // Debug logging
  useEffect(() => {
    console.log("OnboardingDietScreen - Current user data:", {
      dietaryPreferences: user?.dietaryPreferences,
      activityLevel: user?.activityLevel,
      email: user?.email,
      provider: user?.provider,
    });

    // Check token availability
    const checkToken = async () => {
      try {
        const token = await userService.getUserToken();
        console.log(`Token available: ${!!token}`);
      } catch (error) {
        console.error("Error checking token:", error);
      }
    };

    checkToken();
  }, [user]);

  // Available dietary preferences
  const dietaryOptions = [
    { id: "vegetarian", label: "Vegetarian" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten_free", label: "Gluten-Free" },
    { id: "dairy_free", label: "Dairy-Free" },
    { id: "keto", label: "Keto" },
    { id: "paleo", label: "Paleo" },
  ];

  // Activity level options
  const activityOptions = [
    { id: "sedentary", label: "Sedentary (office job)" },
    { id: "light", label: "Light Exercise (1-2 days/week)" },
    { id: "moderate", label: "Moderate Exercise (3-5 days/week)" },
    { id: "active", label: "Very Active (6-7 days/week)" },
    { id: "extra_active", label: "Extra Active (physical job + exercise)" },
  ];

  // Toggle diet selection
  const toggleDiet = (dietId: string) => {
    setSelectedDiets((prev) => {
      if (prev.includes(dietId)) {
        return prev.filter((id) => id !== dietId);
      } else {
        return [...prev, dietId];
      }
    });
  };

  // Set activity level
  const selectActivity = (activityId: string) => {
    setSelectedActivity(activityId);
  };

  // Submit diet preferences and activity level
  const handleComplete = async () => {
    // Validate selection
    if (!selectedActivity) {
      Alert.alert("Please select your activity level");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Saving diet preferences:", {
        dietaryPreferences: selectedDiets,
        activityLevel: selectedActivity,
      });

      // Update profile with diet preferences and activity level
      const response = await userService.updateProfile({
        dietaryPreferences: selectedDiets,
        activityLevel: selectedActivity,
      });

      if (response.success) {
        console.log("Diet preferences saved successfully:", response);

        // Update the local user object if needed
        if (response.user) {
          setUser({
            ...user!,
            dietaryPreferences: selectedDiets,
            activityLevel: selectedActivity,
          });
        }

        // Continue to goals screen
        navigation.navigate("OnboardingGoals");
      } else {
        console.error("Failed to save diet preferences:", response.error);
        Alert.alert(
          "Error",
          response.error || "Failed to save your preferences"
        );
      }
    } catch (error) {
      console.error("Error saving diet preferences:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
}
