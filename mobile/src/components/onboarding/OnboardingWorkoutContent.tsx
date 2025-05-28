import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { OnboardingStyles } from "./OnboardingConstants";
import { AnimatedTouchable } from "./OnboardingAnimatedTouchable";

export type WorkoutFrequency = "low" | "medium" | "high";

interface OnboardingWorkoutContentProps {
  onDataChange: (data: { workoutFrequency: WorkoutFrequency }) => void;
  initialData?: { workoutFrequency?: WorkoutFrequency };
}

interface WorkoutOption {
  id: WorkoutFrequency;
  title: string;
  description: string;
}

export function OnboardingWorkoutContent({
  onDataChange,
  initialData = {},
}: OnboardingWorkoutContentProps) {
  // Initialize state with any previously selected value
  const [selectedFrequency, setSelectedFrequency] =
    useState<WorkoutFrequency | null>(initialData?.workoutFrequency || null);

  // Workout frequency options
  const workoutOptions: WorkoutOption[] = [
    {
      id: "low",
      title: "0-2 workouts",
      description: "Now and then",
    },
    {
      id: "medium",
      title: "3-5 workouts",
      description: "A few workouts per week",
    },
    {
      id: "high",
      title: "6+ workouts",
      description: "Dedicated athlete",
    },
  ];

  // Send data to parent when selection changes
  useEffect(() => {
    if (selectedFrequency) {
      onDataChange({ workoutFrequency: selectedFrequency });
    }
  }, [selectedFrequency, onDataChange]);

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>How often do you workout?</Text>
      <Text style={OnboardingStyles.subtitle}>
        This helps us understand your activity level
      </Text>

      <View style={styles.optionsContainer}>
        {workoutOptions.map((option) => (
          <AnimatedTouchable
            key={option.id}
            style={[
              styles.optionCard,
              selectedFrequency === option.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedFrequency(option.id)}
            scaleValue={0.95}
            scaleDuration={80}
          >
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.optionTitle,
                  selectedFrequency === option.id && styles.selectedText,
                ]}
              >
                {option.title}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedFrequency === option.id && styles.selectedText,
                ]}
              >
                {option.description}
              </Text>
            </View>
          </AnimatedTouchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    marginTop: 30,
    gap: 16,
  },
  optionCard: {
    padding: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    alignItems: "flex-start",
  },
  selectedCard: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  textContainer: {
    alignItems: "flex-start",
    width: "100%",
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333333",
    textAlign: "left",
  },
  optionDescription: {
    fontSize: 14,
    color: "#666666",
    textAlign: "left",
  },
  selectedText: {
    color: "#FFFFFF",
  },
});
