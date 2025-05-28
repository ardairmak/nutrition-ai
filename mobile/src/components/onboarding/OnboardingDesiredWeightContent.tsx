import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { useAuth } from "../../contexts/AuthContext";

export interface OnboardingExactWeightContentProps {
  onDataChange: (data: { exactWeight: number }) => void;
  weightUnit?: "metric" | "imperial"; // Add prop to receive weight unit
}

// Extended User type to include weightGoal property
interface ExtendedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileSetupComplete?: boolean;
  weightGoal?: string;
  otherSettings?: {
    units?: {
      weight?: "metric" | "imperial";
      height?: "metric" | "imperial";
    };
    [key: string]: any;
  };
  [key: string]: any;
}

export function OnboardingExactWeightContent({
  onDataChange,
  weightUnit,
}: OnboardingExactWeightContentProps) {
  const { user } = useAuth();
  const extendedUser = user as ExtendedUser;

  // Use provided weightUnit, or check user preferences, or default to metric
  const [unit, setUnit] = useState<"metric" | "imperial">(
    weightUnit || extendedUser?.otherSettings?.units?.weight || "metric"
  );

  // Default values and ranges based on unit
  const defaultWeight = unit === "metric" ? 70 : 155;
  const minWeight = unit === "metric" ? 40 : 88;
  const maxWeight = unit === "metric" ? 150 : 330;

  const [exactWeight, setExactWeight] = useState<number>(defaultWeight);
  const [weightGoal, setWeightGoal] = useState<string>("maintain");
  const [dataInitialized, setDataInitialized] = useState(false);

  // Extract user's weight goal if available
  useEffect(() => {
    if (extendedUser?.weightGoal) {
      setWeightGoal(extendedUser.weightGoal);
    }

    // If user already has a target weight, use it as starting point
    if (extendedUser?.targetWeight && unit === "metric") {
      setExactWeight(extendedUser.targetWeight);
    } else if (extendedUser?.targetWeight && unit === "imperial") {
      // Convert from kg to lb
      setExactWeight(Math.round(extendedUser.targetWeight * 2.20462));
    } else if (
      extendedUser?.otherSettings?.originalTargetWeight?.lb &&
      unit === "imperial"
    ) {
      // Use original lb value if available
      setExactWeight(extendedUser.otherSettings.originalTargetWeight.lb);
    }
  }, [extendedUser, unit]);

  // When weight changes, update parent
  useEffect(() => {
    if (!dataInitialized) {
      setDataInitialized(true);
      return;
    }

    onDataChange({ exactWeight });
  }, [exactWeight, onDataChange, dataInitialized]);

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

  // Generate the tick marks for the slider
  const renderTicks = () => {
    // Create appropriate number of ticks based on weight range
    const tickCount = maxWeight - minWeight + 1;
    const ticks = Array.from({ length: tickCount }, (_, i) => (
      <View
        key={i}
        style={[
          styles.tick,
          // Make every 5th tick taller
          (i + minWeight) % 10 === 0 ? styles.tallTick : null,
          // Highlight the selected weight
          i + minWeight === Math.round(exactWeight)
            ? styles.selectedTick
            : null,
        ]}
      />
    ));

    return <View style={styles.ticksContainer}>{ticks}</View>;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your desired weight?</Text>

      <View style={styles.weightDisplaySection}>
        <Text style={styles.weightGoalText}>{getWeightGoalText()}</Text>

        <Text style={styles.weightValue}>
          {exactWeight.toFixed(1)} {unit === "metric" ? "kg" : "lb"}
        </Text>
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
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000000",
  },
  weightDisplaySection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    marginBottom: 100,
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
    marginHorizontal: 10,
    alignItems: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  ticksWrapper: {
    width: "100%",
    height: 50,
    overflow: "hidden",
    marginTop: -25,
  },
  ticksContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: windowWidth - 40, // Account for padding
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
});
