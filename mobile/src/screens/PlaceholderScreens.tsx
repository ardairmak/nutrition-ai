import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USER_DATA_KEY } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config/constants";
import { getAuthToken } from "../services/api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

// Reusable placeholder component
function PlaceholderScreen({
  title,
  description,
  buttonText,
  onButtonPress,
  isLoading,
}: {
  title: string;
  description: string;
  buttonText: string;
  onButtonPress: () => void;
  isLoading: boolean;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.comingSoon}>
          Coming Soon! This screen is not yet fully implemented.
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onButtonPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
      <SafeAreaView style={dashboardStyles.container}>
        <View style={dashboardStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={dashboardStyles.loadingText}>
            Loading your nutrition data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={dashboardStyles.container}>
        <View style={dashboardStyles.errorContainer}>
          <Text style={dashboardStyles.errorText}>{error}</Text>
          <TouchableOpacity
            style={dashboardStyles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={dashboardStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dashboardStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={dashboardStyles.header}>
          <View>
            <Text style={dashboardStyles.appName}>Nutrition AI</Text>
            <Text style={dashboardStyles.dateText}>
              Today, {new Date().toLocaleDateString()}
            </Text>
          </View>
          <View style={dashboardStyles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF9500" />
            <Text style={dashboardStyles.streakText}>
              {dashboardData.streak}
            </Text>
          </View>
        </View>

        {/* Day selector */}
        <View style={dashboardStyles.daySelector}>
          {days.map((item, index) => (
            <View
              key={index}
              style={[
                dashboardStyles.dayItem,
                selectedDay === index ? dashboardStyles.selectedDay : null,
              ]}
            >
              <Text
                style={[
                  dashboardStyles.dayText,
                  selectedDay === index
                    ? dashboardStyles.selectedDayText
                    : null,
                ]}
              >
                {item.day}
              </Text>
              <Text
                style={[
                  dashboardStyles.dateText,
                  selectedDay === index
                    ? dashboardStyles.selectedDayText
                    : null,
                ]}
              >
                {item.date}
              </Text>
            </View>
          ))}
        </View>

        {/* Calories card */}
        <View style={dashboardStyles.caloriesCard}>
          <Text style={dashboardStyles.caloriesTitle}>Calories Left</Text>
          <Text style={dashboardStyles.caloriesValue}>{caloriesLeft}</Text>
          <View style={dashboardStyles.progressContainer}>
            <View
              style={[
                dashboardStyles.progressBar,
                { width: `${caloriesProgress}%` },
              ]}
            />
          </View>
          <View style={dashboardStyles.caloriesDetails}>
            <View style={dashboardStyles.calorieItem}>
              <Text style={dashboardStyles.calorieItemValue}>
                {dashboardData.nutritionData.calories.goal}
              </Text>
              <Text style={dashboardStyles.calorieItemLabel}>Goal</Text>
            </View>
            <View style={dashboardStyles.calorieItem}>
              <Text style={dashboardStyles.calorieItemValue}>
                {dashboardData.nutritionData.calories.consumed}
              </Text>
              <Text style={dashboardStyles.calorieItemLabel}>Food</Text>
            </View>
            <View style={dashboardStyles.calorieItem}>
              <Text style={dashboardStyles.calorieItemValue}>0</Text>
              <Text style={dashboardStyles.calorieItemLabel}>Exercise</Text>
            </View>
          </View>
        </View>

        {/* Macronutrients section */}
        <View style={dashboardStyles.macroContainer}>
          <View style={dashboardStyles.macroRow}>
            {/* Protein Card */}
            <View style={dashboardStyles.macroCard}>
              <Text style={dashboardStyles.macroTitle}>Protein Left</Text>
              <Text style={dashboardStyles.macroValue}>
                {proteinLeft}
                {dashboardData.nutritionData.protein.unit}
              </Text>
              <View style={dashboardStyles.microProgressContainer}>
                <View
                  style={[
                    dashboardStyles.microProgressBar,
                    {
                      width: `${proteinProgress}%`,
                      backgroundColor: "#5E60CE",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs Card */}
            <View style={dashboardStyles.macroCard}>
              <Text style={dashboardStyles.macroTitle}>Carbs Left</Text>
              <Text style={dashboardStyles.macroValue}>
                {carbsLeft}
                {dashboardData.nutritionData.carbs.unit}
              </Text>
              <View style={dashboardStyles.microProgressContainer}>
                <View
                  style={[
                    dashboardStyles.microProgressBar,
                    { width: `${carbsProgress}%`, backgroundColor: "#48BFE3" },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Fat Card */}
          <View style={dashboardStyles.macroCard}>
            <Text style={dashboardStyles.macroTitle}>Fat Left</Text>
            <Text style={dashboardStyles.macroValue}>
              {fatLeft}
              {dashboardData.nutritionData.fat.unit}
            </Text>
            <View style={dashboardStyles.microProgressContainer}>
              <View
                style={[
                  dashboardStyles.microProgressBar,
                  { width: `${fatProgress}%`, backgroundColor: "#F72585" },
                ]}
              />
            </View>
          </View>

          {/* Page indicators */}
          <View style={dashboardStyles.pageIndicators}>
            <View
              style={[
                dashboardStyles.indicator,
                dashboardStyles.activeIndicator,
              ]}
            />
            <View style={dashboardStyles.indicator} />
            <View style={dashboardStyles.indicator} />
          </View>
        </View>

        {/* Recently logged section */}
        <View style={dashboardStyles.recentlyLoggedSection}>
          <Text style={dashboardStyles.sectionTitle}>Recently logged</Text>

          <View style={dashboardStyles.foodCard}>
            {dashboardData.recentFood ? (
              // Show completed food item
              <>
                {recentFood.imageUri && recentFood.imageUri !== "" ? (
                  <Image
                    source={{
                      uri: recentFood.imageUri,
                    }}
                    style={dashboardStyles.foodImage}
                    resizeMode="cover"
                  />
                ) : (
                  // Show icon placeholder when no photo
                  <View style={dashboardStyles.foodIconContainer}>
                    <Icon
                      name="silverware-fork-knife"
                      size={28}
                      color="#999999"
                    />
                  </View>
                )}
                <View style={dashboardStyles.foodInfo}>
                  <Text style={dashboardStyles.foodName}>
                    {recentFood.name}
                  </Text>
                  <Text style={dashboardStyles.foodCalories}>
                    {recentFood.calories} cal
                  </Text>
                  <View style={dashboardStyles.foodProgressContainer}>
                    <View
                      style={[
                        dashboardStyles.foodProgressBar,
                        { width: `${recentFood.progress || 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </>
            ) : (
              // Show empty state
              <View style={dashboardStyles.emptyFoodContainer}>
                <Icon
                  name="silverware-fork-knife-outline"
                  size={36}
                  color="#BBBBBB"
                />
                <Text style={dashboardStyles.emptyFoodText}>
                  No meals logged today
                </Text>
                <TouchableOpacity
                  style={dashboardStyles.logMealButton}
                  onPress={() => {
                    navigation.navigate("Camera", { mealType: "meal" });
                  }}
                >
                  <Text style={dashboardStyles.logMealButtonText}>
                    Log a meal
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Journal Screen - Daily food logging
export function JournalScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAddMeal = () => {
    navigation.navigate("Camera", { mealType: "meal" });
  };

  return (
    <PlaceholderScreen
      title="Food Journal"
      description="Track your meals and nutrition throughout the day."
      buttonText="Add Meal"
      onButtonPress={handleAddMeal}
      isLoading={false}
    />
  );
}

// Add Entry Screen - Central action button destination
export function AddEntryScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Entry</Text>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Log Food</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Log Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Log Weight</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Log Water</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Progress Screen - Charts and statistics
export function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Track your fitness journey</Text>

      <View style={styles.chartPlaceholder}>
        <Text>Weight Chart (Coming Soon)</Text>
      </View>

      <View style={styles.progressList}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Starting Weight</Text>
          <Text style={styles.progressValue}>--</Text>
        </View>

        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Current Weight</Text>
          <Text style={styles.progressValue}>--</Text>
        </View>

        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Goal Weight</Text>
          <Text style={styles.progressValue}>--</Text>
        </View>
      </View>
    </View>
  );
}

// More Screen - Additional features and settings
export function MoreScreen() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>More Options</Text>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Goals & Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Connected Apps & Devices</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.signOutItem]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  comingSoon: {
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 40,
    fontStyle: "italic",
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  optionsContainer: {
    width: "100%",
    flexDirection: "column",
    gap: 10,
  },
  optionButton: {
    backgroundColor: "#f0f0f0",
    padding: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: "#4285F4",
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 30,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statBox: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "30%",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  mealSection: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 10,
  },
  addButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#4285F4",
    fontWeight: "500",
  },
  actionButtonsContainer: {
    marginTop: 30,
  },
  actionButton: {
    backgroundColor: "#4285F4",
    padding: 18,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  progressList: {
    marginTop: 20,
  },
  progressItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  progressLabel: {
    fontSize: 16,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  menuList: {
    marginTop: 10,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuText: {
    fontSize: 16,
  },
  signOutItem: {
    backgroundColor: "#ff6b6b",
    marginTop: 20,
    borderRadius: 8,
    padding: 15,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

// Add dashboard styles at the end of the file
const dashboardStyles = StyleSheet.create({
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
});
