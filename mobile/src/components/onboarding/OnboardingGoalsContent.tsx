import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { OnboardingStyles } from "./OnboardingConstants";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MaterialIcons as MaterialIconsType } from "@expo/vector-icons/build/Icons";
import { MaterialCommunityIcons as MaterialCommunityIconsType } from "@expo/vector-icons/build/Icons";
import { AnimatedTouchable } from "./OnboardingAnimatedTouchable";

interface Goal {
  id: string;
  name: string;
  iconType: "material" | "fontAwesome";
  iconName: string;
}

interface OnboardingGoalsContentProps {
  onDataChange: (data: { goals: string[] }) => void;
  initialData?: { goals?: string[] };
}

export function OnboardingGoalsContent({
  onDataChange,
  initialData = {},
}: OnboardingGoalsContentProps) {
  const goals: Goal[] = [
    {
      id: "lose_weight",
      name: "Lose Weight",
      iconType: "material",
      iconName: "fitness-center",
    },
    {
      id: "build_muscle",
      name: "Build Muscle",
      iconType: "fontAwesome",
      iconName: "dumbbell",
    },
    {
      id: "improve_fitness",
      name: "Improve Fitness",
      iconType: "material",
      iconName: "directions-run",
    },
    {
      id: "healthy_eating",
      name: "Healthy Eating",
      iconType: "material",
      iconName: "restaurant",
    },
  ];

  // Initialize state with any previously selected value
  const [selectedGoal, setSelectedGoal] = useState<string | null>(
    initialData?.goals && initialData.goals.length > 0
      ? initialData.goals[0]
      : null
  );

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  useEffect(() => {
    // Only update if we've made a selection
    if (selectedGoal) {
      onDataChange({ goals: [selectedGoal] });
    }
  }, [selectedGoal, onDataChange]);

  const renderIcon = (goal: Goal) => {
    if (goal.iconType === "material") {
      return (
        <MaterialIcons
          name={goal.iconName as keyof typeof MaterialIconsType.glyphMap}
          size={24}
          color={selectedGoal === goal.id ? "#FFFFFF" : "#000000"}
        />
      );
    } else {
      return (
        <MaterialCommunityIcons
          name={
            goal.iconName as keyof typeof MaterialCommunityIconsType.glyphMap
          }
          size={24}
          color={selectedGoal === goal.id ? "#FFFFFF" : "#000000"}
        />
      );
    }
  };

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>Select your fitness goal</Text>
      <Text style={OnboardingStyles.subtitle}>
        Choose the goal that best matches your fitness aspiration
      </Text>

      <View style={styles.goalsContainer}>
        {goals.map((goal) => (
          <AnimatedTouchable
            key={goal.id}
            style={[
              styles.goalItem,
              selectedGoal === goal.id && styles.selectedGoal,
            ]}
            onPress={() => handleSelectGoal(goal.id)}
            scaleValue={0.95}
            scaleDuration={80}
          >
            <View style={styles.iconContainer}>{renderIcon(goal)}</View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.goalName,
                  selectedGoal === goal.id && styles.selectedText,
                ]}
              >
                {goal.name}
              </Text>
            </View>
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
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  selectedGoal: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  iconContainer: {
    marginRight: 16,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  selectedText: {
    color: "#FFFFFF",
  },
});
