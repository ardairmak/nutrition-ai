import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { useAuth } from "../../contexts/AuthContext";
import { OnboardingStyles } from "./OnboardingConstants";

interface OnboardingExactWeightContentProps {
  onDataChange: (data: { exactWeight: number }) => void;
  initialData?: {
    weightGoal?: string;
    unitPreference?: "metric" | "imperial";
  };
}

// Extended User type to include weightGoal property
interface ExtendedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileSetupComplete?: boolean;
  weightGoal?: string;
  [key: string]: any;
}

export function OnboardingExactWeightContent({
  onDataChange,
  initialData = {},
}: OnboardingExactWeightContentProps) {
  const { user } = useAuth();
  const extendedUser = user as ExtendedUser;
  const unitPreference = initialData.unitPreference || "metric";
  const isImperial = unitPreference === "imperial";

  // Starting values with proper unit defaults
  const startWeightKg = 70;
  const startWeightLbs = Math.round(startWeightKg * 2.20462);

  // For displayed value purposes
  const [exactWeight, setExactWeight] = useState<number>(
    isImperial ? startWeightLbs : startWeightKg
  );

  const [weightGoal, setWeightGoal] = useState<string>(
    initialData.weightGoal || "maintain"
  );
  const [dataInitialized, setDataInitialized] = useState(false);

  // Slider ranges based on unit
  const minWeight = isImperial ? 88 : 40; // 40kg ≈ 88lbs
  const maxWeight = isImperial ? 330 : 150; // 150kg ≈ 330lbs

  // Extract user's weight goal from either initialData or user object
  useEffect(() => {
    if (initialData?.weightGoal) {
      setWeightGoal(initialData.weightGoal);
    } else if (extendedUser?.weightGoal) {
      setWeightGoal(extendedUser.weightGoal);
    }
  }, [extendedUser, initialData]);

  // When weight changes, update parent (always save in kg for backend)
  useEffect(() => {
    if (!dataInitialized) {
      setDataInitialized(true);
      return;
    }

    // Convert to kg if needed before sending to parent
    const weightInKg = isImperial ? exactWeight / 2.20462 : exactWeight;
    onDataChange({ exactWeight: Math.round(weightInKg) });
  }, [exactWeight, onDataChange, dataInitialized, isImperial]);

  // Get text to display based on weight goal
  const getWeightGoalText = () => {
    switch (weightGoal) {
      case "lose":
        return "Lose weight";
      case "gain":
        return "Gain weight";
      case "maintain":
      default:
        return "Maintain weight";
    }
  };

  // Calculate positions for slider ticks
  const renderTicks = () => {
    const totalRange = maxWeight - minWeight;
    const ticksCount = 11; // Show fewer ticks for better spacing
    const step = totalRange / (ticksCount - 1);

    const ticks = [];
    for (let i = 0; i < ticksCount; i++) {
      const value = minWeight + i * step;
      const isSelected = Math.abs(value - exactWeight) < step / 2;

      ticks.push(
        <View key={i} style={styles.tickContainer}>
          <View
            style={[
              styles.tick,
              i % 2 === 0 ? styles.tallTick : null,
              isSelected ? styles.selectedTick : null,
            ]}
          />
          {i % 2 === 0 && (
            <Text style={styles.tickLabel}>{Math.round(value)}</Text>
          )}
        </View>
      );
    }

    return <View style={styles.ticksContainer}>{ticks}</View>;
  };

  // Format weight with units
  const getFormattedWeight = () => {
    const unit = isImperial ? "lb" : "kg";
    return `${exactWeight.toFixed(1)} ${unit}`;
  };

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>What is your desired weight?</Text>
      <Text style={OnboardingStyles.subtitle}>
        This will help us set realistic goals for your journey
      </Text>

      <View style={styles.weightDisplaySection}>
        <Text style={styles.weightGoalText}>{getWeightGoalText()}</Text>

        <Text style={styles.weightValue}>{getFormattedWeight()}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={minWeight}
          maximumValue={maxWeight}
          step={0.1}
          value={exactWeight}
          onValueChange={(value: number) => setExactWeight(value)}
          minimumTrackTintColor="#CCCCCC"
          maximumTrackTintColor="#CCCCCC"
          thumbTintColor="#000000"
        />
        <View style={styles.ticksWrapper}>{renderTicks()}</View>
      </View>
    </View>
  );
}

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  weightDisplaySection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    marginBottom: 60,
  },
  weightGoalText: {
    fontSize: 20,
    color: "#666666",
    marginBottom: 24,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#000000",
  },
  sliderContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  ticksWrapper: {
    width: "100%",
    height: 60,
    marginTop: 10,
  },
  ticksContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  tickContainer: {
    alignItems: "center",
  },
  tick: {
    width: 1,
    height: 10,
    backgroundColor: "#CCCCCC",
  },
  tallTick: {
    height: 20,
    width: 2,
  },
  selectedTick: {
    backgroundColor: "#000000",
    height: 30,
    width: 3,
  },
  tickLabel: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
});
