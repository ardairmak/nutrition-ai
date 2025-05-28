import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import CircularProgress from "../components/CircularProgress";

const { width } = Dimensions.get("window");

export const HomeScreen = () => {
  const { user, signOut: logout, isLoading: loading } = useAuth();
  const [selectedDay, setSelectedDay] = useState(3); // Default to current day (Thursday in this example)

  // Sample data - in a real app, this would come from an API or local storage
  const [nutritionData, setNutritionData] = useState({
    calories: {
      goal: 2000,
      consumed: 611,
    },
    protein: {
      goal: 150,
      consumed: 42,
      unit: "g",
    },
    carbs: {
      goal: 200,
      consumed: 49,
      unit: "g",
    },
    fat: {
      goal: 65,
      consumed: 27,
      unit: "g",
    },
  });

  const days = [
    { day: "W", date: "1" },
    { day: "T", date: "2" },
    { day: "F", date: "3" },
    { day: "S", date: "4" },
    { day: "S", date: "5" },
    { day: "M", date: "6" },
    { day: "T", date: "7" },
  ];

  const recentFood = {
    name: "Grilled Chicken Salad",
    calories: 320,
    imageUri:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
    progress: 57,
  };

  // Calculate remaining values
  const caloriesLeft =
    nutritionData.calories.goal - nutritionData.calories.consumed;
  const proteinLeft =
    nutritionData.protein.goal - nutritionData.protein.consumed;
  const carbsLeft = nutritionData.carbs.goal - nutritionData.carbs.consumed;
  const fatLeft = nutritionData.fat.goal - nutritionData.fat.consumed;

  // Calculate percentages for circular progress
  const caloriesPercentage =
    nutritionData.calories.goal > 0 &&
    Number.isFinite(nutritionData.calories.consumed)
      ? (nutritionData.calories.consumed / nutritionData.calories.goal) * 100
      : 0;
  const proteinPercentage =
    nutritionData.protein.goal > 0 &&
    Number.isFinite(nutritionData.protein.consumed)
      ? (nutritionData.protein.consumed / nutritionData.protein.goal) * 100
      : 0;
  const carbsPercentage =
    nutritionData.carbs.goal > 0 &&
    Number.isFinite(nutritionData.carbs.consumed)
      ? (nutritionData.carbs.consumed / nutritionData.carbs.goal) * 100
      : 0;
  const fatPercentage =
    nutritionData.fat.goal > 0 && Number.isFinite(nutritionData.fat.consumed)
      ? (nutritionData.fat.consumed / nutritionData.fat.goal) * 100
      : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>Nutrition AI</Text>
            <Text style={styles.dateText}>
              Today, {new Date().toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF9500" />
            <Text style={styles.streakText}>27</Text>
          </View>
        </View>

        {/* Day selector */}
        <View style={styles.daySelector}>
          {days.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayItem,
                selectedDay === index ? styles.selectedDay : null,
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDay === index ? styles.selectedDayText : null,
                ]}
              >
                {item.day}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  selectedDay === index ? styles.selectedDayText : null,
                ]}
              >
                {item.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calories card with circular progress */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesTitle}>Calories Left</Text>

          <View style={styles.caloriesCircularContainer}>
            <CircularProgress
              percentage={caloriesPercentage}
              color="#007AFF"
              size={150}
              strokeWidth={15}
              showPercentage={false}
            >
              <Text style={styles.caloriesValue}>{caloriesLeft}</Text>
              <Text style={styles.caloriesLabel}>remaining</Text>
            </CircularProgress>
          </View>

          <View style={styles.caloriesDetails}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieItemValue}>
                {nutritionData.calories.goal}
              </Text>
              <Text style={styles.calorieItemLabel}>Goal</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieItemValue}>
                {nutritionData.calories.consumed}
              </Text>
              <Text style={styles.calorieItemLabel}>Food</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieItemValue}>0</Text>
              <Text style={styles.calorieItemLabel}>Exercise</Text>
            </View>
          </View>
        </View>

        {/* Macronutrients section with circular progress */}
        <View style={styles.macroContainer}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>

          <View style={styles.macroRow}>
            {/* Protein Card */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Protein</Text>
              <View style={styles.macroCircularContainer}>
                <CircularProgress
                  percentage={proteinPercentage}
                  color="#5E60CE"
                  size={80}
                  strokeWidth={8}
                  showPercentage={false}
                >
                  <Text style={styles.macroValue}>
                    {proteinLeft}
                    <Text style={styles.macroUnit}>
                      {nutritionData.protein.unit}
                    </Text>
                  </Text>
                  <Text style={styles.macroLeftLabel}>left</Text>
                </CircularProgress>
              </View>
            </View>

            {/* Carbs Card */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Carbs</Text>
              <View style={styles.macroCircularContainer}>
                <CircularProgress
                  percentage={carbsPercentage}
                  color="#FF9F1C"
                  size={80}
                  strokeWidth={8}
                  showPercentage={false}
                >
                  <Text style={styles.macroValue}>
                    {carbsLeft}
                    <Text style={styles.macroUnit}>
                      {nutritionData.carbs.unit}
                    </Text>
                  </Text>
                  <Text style={styles.macroLeftLabel}>left</Text>
                </CircularProgress>
              </View>
            </View>
          </View>

          <View style={styles.macroRow}>
            {/* Fat Card */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Fat</Text>
              <View style={styles.macroCircularContainer}>
                <CircularProgress
                  percentage={fatPercentage}
                  color="#2EC4B6"
                  size={80}
                  strokeWidth={8}
                  showPercentage={false}
                >
                  <Text style={styles.macroValue}>
                    {fatLeft}
                    <Text style={styles.macroUnit}>
                      {nutritionData.fat.unit}
                    </Text>
                  </Text>
                  <Text style={styles.macroLeftLabel}>left</Text>
                </CircularProgress>
              </View>
            </View>

            {/* Empty space to balance the row */}
            <View style={styles.macroCard}>
              {/* Intentionally left empty */}
            </View>
          </View>
        </View>

        {/* Recently logged section */}
        <View style={styles.recentlyLoggedSection}>
          <Text style={styles.sectionTitle}>Recently Logged</Text>
          <View style={styles.foodCard}>
            <Image
              source={{ uri: recentFood.imageUri }}
              style={styles.foodImage}
            />
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{recentFood.name}</Text>
              <Text style={styles.foodCalories}>
                {recentFood.calories} kcal
              </Text>
              <View style={styles.foodProgressContainer}>
                <View
                  style={[
                    styles.foodProgressBar,
                    { width: `${recentFood.progress}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  dateText: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF9500",
    marginLeft: 4,
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 60,
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: "#007AFF",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  caloriesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  caloriesTitle: {
    fontSize: 18,
    color: "#8E8E93",
    marginBottom: 16,
  },
  caloriesCircularContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  caloriesLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  caloriesDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  calorieItem: {
    alignItems: "center",
  },
  calorieItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  calorieItemLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  macroContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  macroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  macroCircularContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  macroTitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  macroUnit: {
    fontSize: 12,
    fontWeight: "normal",
  },
  macroLeftLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 15,
  },
  recentlyLoggedSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  foodImage: {
    width: 80,
    height: 80,
  },
  foodInfo: {
    flex: 1,
    padding: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  foodCalories: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  foodProgressContainer: {
    height: 4,
    backgroundColor: "#E9E9EB",
    borderRadius: 2,
  },
  foodProgressBar: {
    height: 4,
    backgroundColor: "#34C759",
    borderRadius: 2,
  },
  debugSection: {
    margin: 20,
    padding: 15,
    backgroundColor: "#FFE8E6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFCCCC",
  },
  debugTitle: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#FF3B30",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
