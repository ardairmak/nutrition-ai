import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

// Define the nutrition data interface
interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  healthScore: number;
  targetWeight?: number;
  targetDate?: string;
}

type OnboardingPlanReadyContentProps = {
  onDataChange?: (data: any) => void;
  nutritionData?: NutritionData;
};

export function OnboardingPlanReadyContent({
  onDataChange,
  nutritionData,
}: OnboardingPlanReadyContentProps) {
  const { user } = useAuth();

  // Default nutrition data if none is provided
  const defaultNutritionData: NutritionData = {
    calories: 2219,
    carbs: 285,
    protein: 130,
    fats: 61,
    healthScore: 7,
    targetWeight: 70,
    targetDate: "October 23",
  };

  // Use provided nutrition data or fallback to default
  const planData = nutritionData || defaultNutritionData;

  // Calculate current weight from user data (or use a default)
  const currentWeight = user?.weight || 65;

  // Calculate weight change (always show as positive number)
  const weightChange = planData.targetWeight
    ? Math.abs(planData.targetWeight - currentWeight).toFixed(1)
    : "19.2";

  // Send data to parent immediately (no user interaction required on this screen)
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange({ planReady: true });
    }
  }, [onDataChange]);

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkmark}>✓</Text>
      </View>

      <Text style={styles.title}>
        Congratulations your custom plan is ready!
      </Text>

      <Text style={styles.subtitle}>You should gain:</Text>
      <View style={styles.targetBox}>
        <Text style={styles.targetText}>
          {weightChange} kg by {planData.targetDate}
        </Text>
      </View>

      <View style={styles.nutritionContainer}>
        <Text style={styles.sectionTitle}>Daily recommendation</Text>
        <Text style={styles.editText}>You can edit this anytime</Text>

        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionIcon}>🔥</Text>
            <Text style={styles.nutritionType}>Calories</Text>
            <View style={styles.nutritionValueBox}>
              <Text style={styles.nutritionValue}>{planData.calories}</Text>
            </View>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionIcon}>🌾</Text>
            <Text style={styles.nutritionType}>Carbs</Text>
            <View style={styles.nutritionValueBox}>
              <Text style={styles.nutritionValue}>{planData.carbs}g</Text>
            </View>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionIcon}>🍗</Text>
            <Text style={styles.nutritionType}>Protein</Text>
            <View style={styles.nutritionValueBox}>
              <Text style={styles.nutritionValue}>{planData.protein}g</Text>
            </View>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionIcon}>🥑</Text>
            <Text style={styles.nutritionType}>Fats</Text>
            <View style={styles.nutritionValueBox}>
              <Text style={styles.nutritionValue}>{planData.fats}g</Text>
            </View>
          </View>
        </View>

        <View style={styles.healthScoreRow}>
          <View style={styles.healthScoreIcon}>
            <Text style={styles.healthHeartIcon}>❤️</Text>
          </View>
          <Text style={styles.healthScoreType}>Health Score</Text>
          <Text style={styles.healthScoreValue}>{planData.healthScore}/10</Text>
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
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  checkmark: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  targetBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  targetText: {
    fontSize: 18,
    fontWeight: "600",
  },
  nutritionContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 20,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  editText: {
    fontSize: 14,
    color: "#999999",
    marginBottom: 24,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  nutritionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nutritionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  nutritionType: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  nutritionValueBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  healthScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  healthScoreIcon: {
    marginRight: 12,
  },
  healthHeartIcon: {
    fontSize: 20,
  },
  healthScoreType: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
  },
  healthScoreValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
});
