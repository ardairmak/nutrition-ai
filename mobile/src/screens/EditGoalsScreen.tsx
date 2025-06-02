import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const FITNESS_GOALS = [
  // Weight Management
  {
    id: "lose_weight",
    label: "Lose Weight",
    icon: "scale-bathroom",
    color: "#FF6B35",
    category: "Weight Management",
  },
  {
    id: "gain_muscle",
    label: "Gain Muscle",
    icon: "dumbbell",
    color: "#4CAF50",
    category: "Weight Management",
  },
  {
    id: "maintain_weight",
    label: "Maintain Weight",
    icon: "weight-lifter",
    color: "#2196F3",
    category: "Weight Management",
  },
  {
    id: "build_lean_muscle",
    label: "Build Lean Muscle",
    icon: "muscle",
    color: "#795548",
    category: "Weight Management",
  },
  {
    id: "tone_body",
    label: "Tone Body",
    icon: "human-handsup",
    color: "#607D8B",
    category: "Weight Management",
  },
  // Fitness & Performance
  {
    id: "improve_endurance",
    label: "Improve Endurance",
    icon: "run",
    color: "#FF9800",
    category: "Fitness & Performance",
  },
  {
    id: "increase_strength",
    label: "Increase Strength",
    icon: "arm-flex",
    color: "#9C27B0",
    category: "Fitness & Performance",
  },
  {
    id: "improve_flexibility",
    label: "Improve Flexibility",
    icon: "yoga",
    color: "#E91E63",
    category: "Fitness & Performance",
  },
  {
    id: "improve_cardiovascular_health",
    label: "Improve Cardiovascular Health",
    icon: "heart",
    color: "#E91E63",
    category: "Fitness & Performance",
  },
  // Health & Wellness
  {
    id: "improve_overall_health",
    label: "Improve Overall Health",
    icon: "heart-pulse",
    color: "#F44336",
    category: "Health & Wellness",
  },
  {
    id: "healthy_eating",
    label: "Healthy Eating",
    icon: "food-apple",
    color: "#4CAF50",
    category: "Health & Wellness",
  },
  {
    id: "better_sleep",
    label: "Better Sleep",
    icon: "sleep",
    color: "#3F51B5",
    category: "Health & Wellness",
  },
  {
    id: "reduce_stress",
    label: "Reduce Stress",
    icon: "meditation",
    color: "#00BCD4",
    category: "Health & Wellness",
  },
  {
    id: "increase_energy",
    label: "Increase Energy",
    icon: "lightning-bolt",
    color: "#FFC107",
    category: "Health & Wellness",
  },
  {
    id: "improve_mental_health",
    label: "Improve Mental Health",
    icon: "brain",
    color: "#673AB7",
    category: "Health & Wellness",
  },
];

// Group goals by category
const GOAL_CATEGORIES = FITNESS_GOALS.reduce((acc, goal) => {
  if (!acc[goal.category]) {
    acc[goal.category] = [];
  }
  acc[goal.category].push(goal);
  return acc;
}, {} as Record<string, typeof FITNESS_GOALS>);

// Utility: Calculate calorie goal (Mifflin-St Jeor + default activity multiplier)
function calculateCalorieGoal({ weight }: { weight: number }) {
  // For simplicity, use default values for gender, height, age, and moderate activity
  const gender = "male";
  const height = 175;
  const age = 30;
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  let activityMultiplier = 1.55; // Moderate activity as default
  return Math.round(bmr * activityMultiplier);
}

export function EditGoalsScreen() {
  const { user, setUser } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // State for user's goals
  const [weight, setWeight] = useState(user?.weight?.toString() || "");
  const [weightUnit] = useState("kg");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    user?.fitnessGoals || []
  );
  const [targetCalories, setTargetCalories] = useState<number>(2000);

  // UI state
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successFade = useRef(new Animated.Value(0)).current;

  // Calculate calorie goal when weight changes
  useEffect(() => {
    const weightNum =
      weightUnit === "kg" ? parseFloat(weight) : parseFloat(weight) * 0.453592;
    if (weightNum > 0) {
      setTargetCalories(calculateCalorieGoal({ weight: weightNum }));
    } else {
      setTargetCalories(2000); // Default value
    }
  }, [weight, weightUnit]);

  // Handle goal toggle
  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prevGoals) => {
      if (prevGoals.includes(goalId)) {
        return prevGoals.filter((id) => id !== goalId);
      } else {
        return [...prevGoals, goalId];
      }
    });
  };

  // Success toast animation
  useEffect(() => {
    if (showSuccess) {
      Animated.sequence([
        Animated.timing(successFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successFade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        successFade.setValue(0);
      });
    }
  }, [showSuccess]);

  // Save all changes
  const handleSave = async () => {
    // Convert weight to number and validate
    const weightNum = weight ? parseFloat(weight) : undefined;
    if (weight && (isNaN(weightNum!) || weightNum! <= 0 || weightNum! > 500)) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    try {
      setLoading(true);
      const goalsData = {
        weight: weightNum,
        fitnessGoals: selectedGoals.length > 0 ? selectedGoals : undefined,
        dailyCalorieGoal: targetCalories > 0 ? targetCalories : undefined,
      };
      const response = await userService.updateProfile(goalsData);
      if (response.success) {
        if (user) {
          setUser({ ...user, ...goalsData });
        }
        setShowSuccess(true);
        setTimeout(() => {
          navigation.goBack();
        }, 1800);
      } else {
        Alert.alert("Error", response.error || "Failed to update goals");
      }
    } catch (error) {
      console.error("Error updating goals:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Goals</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Success Toast */}
            {showSuccess && (
              <Animated.View
                style={[styles.successToast, { opacity: successFade }]}
              >
                <Icon name="check-circle" size={24} color="#fff" />
                <Text style={styles.successText}>
                  Goals updated successfully!
                </Text>
              </Animated.View>
            )}

            {/* Weight Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Weight</Text>
              <View style={styles.weightCard}>
                <View style={styles.weightInputContainer}>
                  <TextInput
                    style={styles.weightInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="Enter weight (kg)"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            {/* Calorie Goal Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Calorie Goal</Text>
              <View style={styles.calorieCard}>
                <Icon name="fire" size={32} color="#FF6B35" />
                <View style={styles.calorieInfo}>
                  <Text style={styles.calorieValue}>
                    {targetCalories > 0
                      ? targetCalories.toLocaleString()
                      : "--"}
                  </Text>
                  <Text style={styles.calorieUnit}>kcal/day</Text>
                </View>
              </View>
              <Text style={styles.calorieNote}>
                Automatically calculated based on your weight and goals
              </Text>
            </View>

            {/* Fitness Goals Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness Goals</Text>
              <Text style={styles.sectionSubtitle}>
                Select all goals that apply to you
              </Text>

              {Object.entries(GOAL_CATEGORIES).map(([category, goals]) => (
                <View key={category} style={styles.goalCategory}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.goalsGrid}>
                    {goals.map((goal) => (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.goalCard,
                          selectedGoals.includes(goal.id) &&
                            styles.goalCardSelected,
                        ]}
                        onPress={() => handleGoalToggle(goal.id)}
                      >
                        <Icon
                          name={goal.icon}
                          size={20}
                          color={
                            selectedGoals.includes(goal.id)
                              ? "#FFFFFF"
                              : goal.color
                          }
                        />
                        <Text
                          style={[
                            styles.goalLabel,
                            selectedGoals.includes(goal.id) &&
                              styles.goalLabelSelected,
                          ]}
                        >
                          {goal.label}
                        </Text>
                        {selectedGoals.includes(goal.id) && (
                          <Icon
                            name="check-circle"
                            size={16}
                            color="#FFFFFF"
                            style={styles.goalCheck}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Selected Goals Summary */}
            {selectedGoals.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Your Selected Goals</Text>
                <View style={styles.summaryContainer}>
                  {selectedGoals.map((goalId) => {
                    const goal = FITNESS_GOALS.find((g) => g.id === goalId);
                    if (!goal) return null;
                    return (
                      <View key={goalId} style={styles.summaryGoal}>
                        <Icon name={goal.icon} size={16} color={goal.color} />
                        <Text style={styles.summaryGoalText}>{goal.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  successToast: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  weightCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  weightInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  weightInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
  },
  calorieCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  calorieInfo: {
    flex: 1,
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  calorieUnit: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  calorieNote: {
    fontSize: 13,
    color: "#888",
    marginTop: 8,
    fontStyle: "italic",
  },
  goalCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: "48%",
    flex: 1,
  },
  goalCardSelected: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  goalLabelSelected: {
    color: "#FFFFFF",
  },
  goalCheck: {
    marginLeft: 4,
  },
  summarySection: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryGoal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  summaryGoalText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
});
