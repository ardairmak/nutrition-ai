import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { OnboardingStyles } from "./OnboardingConstants";
import { AnimatedTouchable } from "./OnboardingAnimatedTouchable";

type WeightGoalType = "lose" | "maintain" | "gain";

interface OnboardingTargetWeightContentProps {
  onDataChange: (data: { weightGoal: WeightGoalType | null }) => void;
  initialData?: { weightGoal?: WeightGoalType | null };
}

interface GoalOption {
  id: WeightGoalType;
  title: string;
}

export function OnboardingTargetWeightContent({
  onDataChange,
  initialData = {},
}: OnboardingTargetWeightContentProps) {
  // Initialize state with any previously selected value
  const [selectedGoal, setSelectedGoal] = useState<WeightGoalType | null>(
    initialData?.weightGoal || null
  );

  // Goal options
  const goalOptions: GoalOption[] = [
    {
      id: "lose",
      title: "Lose Weight",
    },
    {
      id: "maintain",
      title: "Maintain Weight",
    },
    {
      id: "gain",
      title: "Gain Weight",
    },
  ];

  // Send data to parent when selection changes
  useEffect(() => {
    // Allow null selection to be passed
    onDataChange({
      weightGoal: selectedGoal,
    });
  }, [selectedGoal, onDataChange]);

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>What's your weight goal?</Text>
      <Text style={OnboardingStyles.subtitle}>
        This helps us create the right nutrition plan
      </Text>

      <View style={styles.goalsContainer}>
        {goalOptions.map((option) => (
          <AnimatedTouchable
            key={option.id}
            style={[
              styles.goalCard,
              selectedGoal === option.id && styles.selectedGoalCard,
            ]}
            onPress={() => setSelectedGoal(option.id)}
            scaleValue={0.95}
            scaleDuration={80}
          >
            <Text
              style={[
                styles.goalTitle,
                selectedGoal === option.id && styles.selectedText,
              ]}
            >
              {option.title}
            </Text>
          </AnimatedTouchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalsContainer: {
    marginTop: 30,
    gap: 16,
  },
  goalCard: {
    padding: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  selectedGoalCard: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  selectedText: {
    color: "#FFFFFF",
  },
});
