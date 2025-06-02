import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config/constants";
import { getAuthToken } from "../services/api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { S3Image } from "../components/S3Image";

// Dashboard Screen - Main summary view
export function DashboardScreen() {
  const selectedDay = 6; // Last day in the array (today)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dashboardData, setDashboardData] = useState({
    streak: 0,
    nutritionData: {
      calories: {
        goal: 2000,
        consumed: 0,
      },
      protein: {
        goal: 150,
        consumed: 0,
        unit: "g",
      },
      carbs: {
        goal: 200,
        consumed: 0,
        unit: "g",
      },
      fat: {
        goal: 65,
        consumed: 0,
        unit: "g",
      },
    },
    recentFood: null,
  });
  const [loginHistory, setLoginHistory] = useState<string[]>([]);

  // Get the day labels for current week
  const days = useMemo(() => {
    const today = new Date();
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      result.push({
        day: dayNames[date.getDay()],
        date: date.getDate().toString(),
        fullDate: date,
        dateString: date.toISOString().split("T")[0], // Add date string for comparison
      });
    }

    return result;
  }, []);

  // Define fetchDashboardData outside useEffect so it can be reused
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get token using the proper API method
      const token = await getAuthToken();

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Record login streak first
      const loginResponse = await fetch(`${API_URL}/api/users/login-streak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!loginResponse.ok) {
        console.error(
          "Failed to record login streak:",
          await loginResponse.text()
        );
      }

      // Fetch login history for last 7 days
      const loginHistoryResponse = await fetch(
        `${API_URL}/api/users/login-history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (loginHistoryResponse.ok) {
        const loginHistoryData = await loginHistoryResponse.json();
        if (loginHistoryData.success) {
          setLoginHistory(loginHistoryData.loginDates);
        }
      }

      // Fetch dashboard data for today
      const today = new Date();
      const response = await fetch(
        `${API_URL}/api/users/dashboard-data?date=${today.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Dashboard API error:", errorText);
        setError(
          `Error: ${response.status} - ${
            errorText || "Failed to fetch dashboard data"
          }`
        );
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setDashboardData(data.dashboardData);
      } else {
        setError(data.error || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  // Refresh dashboard data when screen comes into focus (after meal logging)
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // Calculate remaining values
  const caloriesLeft =
    dashboardData.nutritionData.calories.goal -
    dashboardData.nutritionData.calories.consumed;

  const proteinLeft =
    dashboardData.nutritionData.protein.goal -
    dashboardData.nutritionData.protein.consumed;

  const carbsLeft =
    dashboardData.nutritionData.carbs.goal -
    dashboardData.nutritionData.carbs.consumed;

  const fatLeft =
    dashboardData.nutritionData.fat.goal -
    dashboardData.nutritionData.fat.consumed;

  // Default food item if no recent food
  const recentFood = dashboardData.recentFood || {
    name: "No meals logged yet",
    calories: 0,
    imageUri:
      "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
    progress: 0,
  };

  // Calories progress bar width
  const caloriesGoal = dashboardData.nutritionData.calories.goal;
  const caloriesConsumed = dashboardData.nutritionData.calories.consumed;
  const caloriesProgress =
    caloriesGoal > 0
      ? Math.min((caloriesConsumed / caloriesGoal) * 100, 100)
      : 0;
  // Protein progress bar width
  const proteinGoal = dashboardData.nutritionData.protein.goal;
  const proteinConsumed = dashboardData.nutritionData.protein.consumed;
  const proteinProgress =
    proteinGoal > 0 ? Math.min((proteinConsumed / proteinGoal) * 100, 100) : 0;
  // Carbs progress bar width
  const carbsGoal = dashboardData.nutritionData.carbs.goal;
  const carbsConsumed = dashboardData.nutritionData.carbs.consumed;
  const carbsProgress =
    carbsGoal > 0 ? Math.min((carbsConsumed / carbsGoal) * 100, 100) : 0;
  // Fat progress bar width
  const fatGoal = dashboardData.nutritionData.fat.goal;
  const fatConsumed = dashboardData.nutritionData.fat.consumed;
  const fatProgress =
    fatGoal > 0 ? Math.min((fatConsumed / fatGoal) * 100, 100) : 0;

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your nutrition data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.streakText}>{dashboardData.streak}</Text>
          </View>
        </View>

        {/* Day selector */}
        <View style={styles.daySelector}>
          {days.map((item, index) => {
            const hasLoggedIn = loginHistory.includes(item.dateString);
            return (
              <View
                key={index}
                style={[
                  styles.dayItem,
                  selectedDay === index ? styles.selectedDay : null,
                ]}
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
                {/* Login indicator */}
                {hasLoggedIn && (
                  <View style={styles.loginIndicator}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#34C759"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Calories card */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesTitle}>Calories Left</Text>
          <Text style={styles.caloriesValue}>{caloriesLeft}</Text>
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { width: `${caloriesProgress}%` }]}
            />
          </View>
          <View style={styles.caloriesDetails}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieItemValue}>
                {dashboardData.nutritionData.calories.goal}
              </Text>
              <Text style={styles.calorieItemLabel}>Goal</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieItemValue}>
                {dashboardData.nutritionData.calories.consumed}
              </Text>
              <Text style={styles.calorieItemLabel}>Food</Text>
            </View>
          </View>
        </View>

        {/* Macronutrients section */}
        <View style={styles.macroContainer}>
          <View style={styles.macroRow}>
            {/* Protein Card */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Protein Left</Text>
              <Text style={styles.macroValue}>
                {proteinLeft}
                {dashboardData.nutritionData.protein.unit}
              </Text>
              <View style={styles.microProgressContainer}>
                <View
                  style={[
                    styles.microProgressBar,
                    {
                      width: `${proteinProgress}%`,
                      backgroundColor: "#5E60CE",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs Card */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Carbs Left</Text>
              <Text style={styles.macroValue}>
                {carbsLeft}
                {dashboardData.nutritionData.carbs.unit}
              </Text>
              <View style={styles.microProgressContainer}>
                <View
                  style={[
                    styles.microProgressBar,
                    { width: `${carbsProgress}%`, backgroundColor: "#48BFE3" },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Fat Card */}
          <View style={styles.macroCard}>
            <Text style={styles.macroTitle}>Fat Left</Text>
            <Text style={styles.macroValue}>
              {fatLeft}
              {dashboardData.nutritionData.fat.unit}
            </Text>
            <View style={styles.microProgressContainer}>
              <View
                style={[
                  styles.microProgressBar,
                  { width: `${fatProgress}%`, backgroundColor: "#F72585" },
                ]}
              />
            </View>
          </View>

          {/* Page indicators */}
          <View style={styles.pageIndicators}>
            <View style={[styles.indicator, styles.activeIndicator]} />
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>
        </View>

        {/* Recently logged section */}
        <View style={styles.recentlyLoggedSection}>
          <Text style={styles.sectionTitle}>Recently logged</Text>

          <View style={styles.foodCard}>
            {dashboardData.recentFood ? (
              // Show completed food item
              <>
                {recentFood.imageUri && recentFood.imageUri !== "" ? (
                  <S3Image
                    imageUrl={recentFood.imageUri}
                    style={styles.foodImage}
                  />
                ) : (
                  // Show icon placeholder when no photo
                  <View style={styles.foodIconContainer}>
                    <Icon
                      name="silverware-fork-knife"
                      size={28}
                      color="#999999"
                    />
                  </View>
                )}
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{recentFood.name}</Text>
                  <Text style={styles.foodCalories}>
                    {recentFood.calories} cal
                  </Text>
                  <View style={styles.foodProgressContainer}>
                    <View
                      style={[
                        styles.foodProgressBar,
                        { width: `${recentFood.progress || 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </>
            ) : (
              // Show empty state
              <View style={styles.emptyFoodContainer}>
                <Icon
                  name="silverware-fork-knife-outline"
                  size={36}
                  color="#BBBBBB"
                />
                <Text style={styles.emptyFoodText}>No meals logged today</Text>
                <TouchableOpacity
                  style={styles.logMealButton}
                  onPress={() => {
                    navigation.navigate("Camera", { mealType: "meal" });
                  }}
                >
                  <Text style={styles.logMealButtonText}>Log a meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF9500",
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
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
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  caloriesTitle: {
    fontSize: 18,
    color: "#8E8E93",
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#E9E9EB",
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  caloriesDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  macroTitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  microProgressContainer: {
    height: 6,
    backgroundColor: "#E9E9EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  microProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  pageIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D1D6",
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: "#007AFF",
    width: 16,
  },
  recentlyLoggedSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 15,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#8E8E93",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  emptyFoodContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  emptyFoodText: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 10,
  },
  logMealButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logMealButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  foodIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  loginIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
  },
});
