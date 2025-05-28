import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";

const screenWidth = Dimensions.get("window").width;

// Helper functions to format dates
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

interface MealSection {
  title: string;
  meals: Meal[];
}

interface ServerMeal {
  id: string;
  mealType: string;
  mealName: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  consumedAt: string;
  foodItems: any[];
}

export function JournalScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealSections, setMealSections] = useState<MealSection[]>([
    { title: "Breakfast", meals: [] },
    { title: "Lunch", meals: [] },
    { title: "Dinner", meals: [] },
    { title: "Snacks", meals: [] },
  ]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetails, setShowMealDetails] = useState(false);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchMeals();
      setInitialLoading(false);
    };

    loadInitialData();
  }, []);

  // Update data when selected date changes
  useEffect(() => {
    if (!initialLoading) {
      fetchMeals();
    }
  }, [selectedDate, initialLoading]);

  // Refresh meals when screen comes into focus (after meal logging)
  useFocusEffect(
    React.useCallback(() => {
      if (!initialLoading) {
        fetchMeals();
      }
    }, [initialLoading])
  );

  const fetchMeals = async () => {
    try {
      setLoading(true);

      // Get selected date at midnight
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      // Get end of selected date (23:59:59.999)
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      console.log("Fetching meals for date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Fetch meals for selected date
      const response = await userService.getMeals({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch meals");
      }

      console.log("Received meals:", response.meals);

      // Group meals by meal type
      const mealsByType = (response.meals as ServerMeal[]).reduce(
        (acc: { [key: string]: Meal[] }, meal: ServerMeal) => {
          // Convert meal type to lowercase for case-insensitive matching
          const mealType = meal.mealType.toLowerCase();

          // Map server meal types to section titles
          let sectionType = mealType;
          if (mealType === "breakfast") sectionType = "breakfast";
          else if (mealType === "lunch") sectionType = "lunch";
          else if (mealType === "dinner") sectionType = "dinner";
          else if (mealType === "snack" || mealType === "snacks")
            sectionType = "snacks";

          if (!acc[sectionType]) {
            acc[sectionType] = [];
          }

          acc[sectionType].push({
            id: meal.id,
            name: meal.mealName,
            calories: meal.totalCalories,
            protein: meal.totalProtein,
            carbs: meal.totalCarbs,
            fat: meal.totalFat,
            timestamp: new Date(meal.consumedAt).getTime(),
          });

          return acc;
        },
        {}
      );

      console.log("Grouped meals by type:", mealsByType);

      // Update sections with meals
      const updatedSections = mealSections.map((section) => {
        // Convert section title to lowercase for case-insensitive matching
        const sectionType = section.title.toLowerCase();
        return {
          ...section,
          meals: mealsByType[sectionType] || [],
        };
      });

      console.log("Updated sections:", updatedSections);

      setMealSections(updatedSections);
    } catch (error) {
      console.error("Error fetching meals:", error);
      Alert.alert("Error", "Failed to load meals. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = (sectionTitle: string) => {
    // Only allow adding meals for the current day
    const today = new Date();
    if (!isSameDay(selectedDate, today)) {
      Alert.alert("Notice", "You can only add meals for today");
      return;
    }

    navigation.navigate("Camera", { mealType: sectionTitle });
  };

  const handleMealPress = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowMealDetails(true);
  };

  const closeMealDetails = () => {
    setShowMealDetails(false);
    setSelectedMeal(null);
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (direction === "next") {
      // Don't allow navigating to future dates
      const today = new Date();
      if (isSameDay(selectedDate, today)) {
        return;
      }
      newDate.setDate(newDate.getDate() + 1);
      // Ensure we don't go beyond today
      if (newDate > today) {
        newDate.setTime(today.getTime());
      }
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (loading && initialLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading your journal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Food Journal</Text>
          <Text style={styles.headerSubtitle}>
            Track your meals and nutrition throughout the day.
          </Text>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            onPress={() => navigateDay("prev")}
            style={styles.dateNavButton}
          >
            <Icon name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.dateContainer}>
            <Text style={styles.headerSubtitle}>
              {formatDate(selectedDate)}
            </Text>
            {!isToday && (
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigateDay("next")}
            style={[
              styles.dateNavButton,
              isToday && styles.dateNavButtonDisabled,
            ]}
            disabled={isToday}
          >
            <Icon
              name="chevron-right"
              size={24}
              color={isToday ? "#BBBBBB" : "#000000"}
            />
          </TouchableOpacity>
        </View>

        {/* Meal Sections */}
        {mealSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon
                  name={
                    section.title === "Breakfast"
                      ? "coffee"
                      : section.title === "Lunch"
                      ? "food"
                      : section.title === "Dinner"
                      ? "silverware-fork-knife"
                      : "cookie"
                  }
                  size={24}
                  color="#000000"
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, !isToday && styles.addButtonDisabled]}
                onPress={() => handleAddMeal(section.title)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Meal</Text>
              </TouchableOpacity>
            </View>

            {section.meals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon
                  name={
                    section.title === "Breakfast"
                      ? "coffee-outline"
                      : section.title === "Lunch"
                      ? "food-outline"
                      : section.title === "Dinner"
                      ? "silverware-fork-knife-outline"
                      : "cookie-outline"
                  }
                  size={40}
                  color="#666666"
                />
                <Text style={styles.emptyText}>No meals logged</Text>
              </View>
            ) : (
              <View style={styles.mealsContainer}>
                {section.meals.map((meal, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.mealCard}
                    onPress={() => handleMealPress(meal)}
                  >
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealTime}>
                        {new Date(meal.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.mealDetails}>
                      <Text style={styles.mealCalories}>
                        {meal.calories} calories
                      </Text>
                      <View style={styles.macrosContainer}>
                        <Text style={styles.macroText}>P: {meal.protein}g</Text>
                        <Text style={styles.macroText}>C: {meal.carbs}g</Text>
                        <Text style={styles.macroText}>F: {meal.fat}g</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {selectedMeal && (
        <Modal
          visible={showMealDetails}
          animationType="slide"
          transparent={true}
          onRequestClose={closeMealDetails}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedMeal.name}</Text>
                <TouchableOpacity onPress={closeMealDetails}>
                  <Icon name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <View style={styles.mealDetailsContainer}>
                <Text style={styles.mealDetailsTime}>
                  {new Date(selectedMeal.timestamp).toLocaleString()}
                </Text>

                <View style={styles.nutritionSummary}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {selectedMeal.calories}
                    </Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {selectedMeal.protein}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {selectedMeal.carbs}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {selectedMeal.fat}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666666",
  },
  header: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateNavButton: {
    padding: 8,
  },
  dateNavButtonDisabled: {
    opacity: 0.5,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666666",
  },
  todayButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#000000",
    borderRadius: 16,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginLeft: 8,
  },
  emptyContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },
  mealsContainer: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  mealTime: {
    fontSize: 14,
    color: "#666666",
  },
  mealDetails: {
    gap: 4,
  },
  mealCalories: {
    fontSize: 16,
    color: "#000000",
  },
  macrosContainer: {
    flexDirection: "row",
    gap: 12,
  },
  macroText: {
    fontSize: 14,
    color: "#666666",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonDisabled: {
    backgroundColor: "#999999",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  mealDetailsContainer: {
    gap: 16,
  },
  mealDetailsTime: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  nutritionSummary: {
    flexDirection: "row",
    gap: 12,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 16,
    color: "#000000",
  },
  nutritionLabel: {
    fontSize: 14,
    color: "#666666",
  },
});
