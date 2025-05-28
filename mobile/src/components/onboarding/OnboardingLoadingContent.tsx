import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

type OnboardingLoadingContentProps = {
  onComplete: () => void;
};

export function OnboardingLoadingContent({
  onComplete,
}: OnboardingLoadingContentProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Applying BMR formula...");
  const [calculationDetails, setCalculationDetails] = useState<{
    [key: string]: any;
  }>({});

  // Simulate loading process with different status messages and calculations
  useEffect(() => {
    const steps = [
      {
        message: "Applying BMR formula...",
        progress: 20,
        details: {
          bmr: Math.floor(Math.random() * 500) + 1500, // Simulated BMR value
        },
      },
      {
        message: "Calculating nutrient requirements...",
        progress: 40,
        details: {
          calories: Math.floor(Math.random() * 800) + 1800, // Simulated calorie value
        },
      },
      {
        message: "Creating meal plan...",
        progress: 60,
        details: {
          protein: Math.floor(Math.random() * 50) + 100, // Simulated protein
          calories: Math.floor(Math.random() * 800) + 1800, // Simulated calorie value
        },
      },
      {
        message: "Applying activity adjustments...",
        progress: 80,
        details: {
          protein: Math.floor(Math.random() * 50) + 100, // Simulated protein
          carbs: Math.floor(Math.random() * 100) + 200, // Simulated carbs
          calories: Math.floor(Math.random() * 800) + 1800, // Simulated calorie value
        },
      },
      {
        message: "Finalizing your plan...",
        progress: 95,
        details: {
          protein: Math.floor(Math.random() * 50) + 100, // Simulated protein
          carbs: Math.floor(Math.random() * 100) + 200, // Simulated carbs
          fats: Math.floor(Math.random() * 40) + 40, // Simulated fats
          calories: Math.floor(Math.random() * 800) + 1800, // Simulated calorie value
          healthScore: Math.floor(Math.random() * 3) + 7, // Simulated health score
        },
      },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.progress);
        setStatus(step.message);
        setCalculationDetails(step.details);
        currentStep++;
      } else {
        clearInterval(interval);
        // Wait a moment before completing
        setTimeout(() => {
          setProgress(100);
          onComplete();
        }, 1000);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Get the appropriate checkmark or loading indicator for each item
  const getStatusIndicator = (item: string) => {
    if (item === "calories" && progress >= 40) {
      return (
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      );
    } else if (item === "carbs" && progress >= 80) {
      return (
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      );
    } else if (item === "protein" && progress >= 60) {
      return (
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      );
    } else if (item === "fats" && progress >= 95) {
      return (
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      );
    } else if (item === "healthScore" && progress >= 95) {
      return (
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      );
    } else {
      return <ActivityIndicator size="small" color="#666" />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.percentText}>{progress}%</Text>
      <Text style={styles.title}>We're setting everything up for you</Text>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <Text style={styles.statusText}>{status}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Daily recommendation for</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>• Calories</Text>
          {getStatusIndicator("calories")}
          {calculationDetails.calories && progress >= 40 && (
            <Text style={styles.calculatedValue}>
              {calculationDetails.calories}
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>• Carbs</Text>
          {getStatusIndicator("carbs")}
          {calculationDetails.carbs && progress >= 80 && (
            <Text style={styles.calculatedValue}>
              {calculationDetails.carbs}g
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>• Protein</Text>
          {getStatusIndicator("protein")}
          {calculationDetails.protein && progress >= 60 && (
            <Text style={styles.calculatedValue}>
              {calculationDetails.protein}g
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>• Fats</Text>
          {getStatusIndicator("fats")}
          {calculationDetails.fats && progress >= 95 && (
            <Text style={styles.calculatedValue}>
              {calculationDetails.fats}g
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>• Health Score</Text>
          {getStatusIndicator("healthScore")}
          {calculationDetails.healthScore && progress >= 95 && (
            <Text style={styles.calculatedValue}>
              {calculationDetails.healthScore}/10
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 40,
    textAlign: "center",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#EEEEEE",
    borderRadius: 3,
    marginBottom: 30,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(127, 159, 249, 1)",
    borderRadius: 3,
  },
  statusText: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 40,
  },
  infoBox: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 20,
    width: "90%",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 16,
    color: "#FFFFFF",
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkmark: {
    color: "#000000",
    fontWeight: "bold",
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    width: 70,
    textAlign: "right",
  },
});
