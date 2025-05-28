import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { FoodAnalysis, FoodItem } from "../services/imageService";
import { userService } from "../services";
import EditFoodItemModal from "./EditFoodItemModal";

interface NutritionPopupProps {
  visible: boolean;
  onClose: () => void;
  photoUri: string | null;
  analysis: FoodAnalysis | null;
  rawText?: string;
  mealType: string;
}

const { width } = Dimensions.get("window");

const NutritionPopup: React.FC<NutritionPopupProps> = ({
  visible,
  onClose,
  photoUri,
  analysis,
  rawText,
  mealType,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<FoodAnalysis | null>(
    null
  );
  const [isLogging, setIsLogging] = useState(false);

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleOpenEditModal = () => {
    // Make sure we're editing a copy, not the original
    setEditedAnalysis(analysis ? { ...analysis } : null);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleSaveEdits = (editedItems: FoodItem[]) => {
    if (!editedAnalysis) return;

    // Calculate new total calories
    const totalCalories = editedItems.reduce(
      (sum, item) => sum + item.calories,
      0
    );

    // Update the analysis with edited items and total
    const updatedAnalysis: FoodAnalysis = {
      ...editedAnalysis,
      foodItems: editedItems,
      totalCalories: totalCalories,
    };

    setEditedAnalysis(updatedAnalysis);
    setShowEditModal(false);
  };

  // Use edited data if available, otherwise use original
  const displayData = editedAnalysis || analysis;

  if (!displayData) {
    return null;
  }

  // Calculate scaled nutritional values based on quantity
  const scaledCalories = Math.round(displayData.totalCalories * quantity);
  const scaledProtein = Math.round(
    displayData.foodItems.reduce((sum, item) => sum + item.protein, 0) *
      quantity
  );
  const scaledCarbs = Math.round(
    displayData.foodItems.reduce((sum, item) => sum + item.carbs, 0) * quantity
  );
  const scaledFat = Math.round(
    displayData.foodItems.reduce((sum, item) => sum + item.fat, 0) * quantity
  );

  // Determine health score (example logic - modify as needed)
  const healthScore = 7; // This could be calculated based on nutritional balance

  // Get the main food item name from all food items
  const foodName = displayData.foodItems.map((item) => item.name).join(", ");

  // Handle logging the meal to the database
  const handleLogMeal = async () => {
    if (!displayData) return;

    setIsLogging(true);

    try {
      // Prepare meal data
      const mealData = {
        mealType: mealType,
        mealName:
          foodName.length > 30 ? foodName.substring(0, 30) + "..." : foodName,
        totalCalories: scaledCalories,
        totalProtein: scaledProtein,
        totalCarbs: scaledCarbs,
        totalFat: scaledFat,
        foodItems: displayData.foodItems.map((item) => ({
          name: item.name,
          portionSize: item.portionSize,
          portionUnit: "serving", // Default unit
          calories: item.calories * quantity,
          protein: item.protein * quantity,
          carbs: item.carbs * quantity,
          fat: item.fat * quantity,
        })),
        // Store just the analysis data, not the photo
        gptAnalysisJson: displayData,
      };

      // Call the API
      const response = await userService.logMeal(mealData);

      if (response.success) {
        Alert.alert("Success", "Meal logged successfully");
        onClose();
      } else {
        Alert.alert("Error", response.error || "Failed to log meal");
      }
    } catch (error) {
      console.error("Error logging meal:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Nutrition</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {photoUri && (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.foodImage} />
                </View>
              )}

              <View style={styles.bookmarkRow}>
                <TouchableOpacity style={styles.bookmarkButton}>
                  <Icon name="bookmark-outline" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.timestamp}>
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </Text>
              </View>

              <View style={styles.foodTitleContainer}>
                <Text style={styles.foodTitle}>{foodName}</Text>

                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    onPress={decreaseQuantity}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={increaseQuantity}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.calorieCard}>
                <View style={styles.calorieIconContainer}>
                  <Icon name="fire" size={28} color="#000" />
                </View>
                <Text style={styles.calorieLabel}>Calories</Text>
                <Text style={styles.calorieValue}>{scaledCalories}</Text>
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View style={styles.macroIconContainer}>
                    <Icon
                      name="silverware-fork-knife"
                      size={16}
                      color="#E73C3E"
                    />
                  </View>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{scaledProtein}g</Text>
                </View>

                <View style={styles.macroItem}>
                  <View style={styles.macroIconContainer}>
                    <Icon name="grain" size={16} color="#F9A825" />
                  </View>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{scaledCarbs}g</Text>
                </View>

                <View style={styles.macroItem}>
                  <View style={styles.macroIconContainer}>
                    <Icon name="water-opacity" size={16} color="#42A5F5" />
                  </View>
                  <Text style={styles.macroLabel}>Fats</Text>
                  <Text style={styles.macroValue}>{scaledFat}g</Text>
                </View>
              </View>

              <View style={styles.healthScoreContainer}>
                <View style={styles.healthScoreHeader}>
                  <View style={styles.healthScoreIconContainer}>
                    <Icon name="heart" size={20} color="#FF5252" />
                  </View>
                  <Text style={styles.healthScoreLabel}>Health Score</Text>
                  <Text style={styles.healthScoreValue}>{healthScore}/10</Text>
                </View>

                <View style={styles.healthScoreBar}>
                  <View
                    style={[
                      styles.healthScoreProgress,
                      { width: `${(healthScore / 10) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Ingredients</Text>

              <View style={styles.ingredientsContainer}>
                {displayData.foodItems.map((item, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientPortion}>
                      {item.portionSize}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.fixResultsButton}
                  onPress={handleOpenEditModal}
                >
                  <Icon name="sparkles" size={18} color="#333" />
                  <Text style={styles.fixResultsText}>Fix Results</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleLogMeal}
                  disabled={isLogging}
                >
                  {isLogging ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.doneButtonText}>Save Meal</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <EditFoodItemModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveEdits}
        foodItems={displayData.foodItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
    position: "absolute",
    right: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 16,
  },
  foodImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  bookmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookmarkButton: {
    padding: 4,
  },
  timestamp: {
    color: "#666",
    fontSize: 14,
  },
  foodTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  foodTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    paddingRight: 8,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    fontSize: 20,
    color: "#333",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 12,
  },
  calorieCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  calorieIconContainer: {
    marginBottom: 8,
  },
  calorieLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#000",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  macroItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  macroIconContainer: {
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  healthScoreContainer: {
    marginBottom: 20,
  },
  healthScoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthScoreIconContainer: {
    marginRight: 8,
  },
  healthScoreLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  healthScoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  healthScoreBar: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  healthScoreProgress: {
    height: "100%",
    backgroundColor: "#7CB342",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 16,
    color: "#333",
  },
  ingredientsContainer: {
    marginBottom: 24,
  },
  ingredientItem: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  ingredientPortion: {
    fontSize: 14,
    color: "#666",
  },
  buttonRow: {
    flexDirection: "row",
    marginBottom: 32,
  },
  fixResultsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25,
    padding: 14,
    marginRight: 8,
  },
  fixResultsText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  doneButton: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 25,
    padding: 14,
    alignItems: "center",
    marginLeft: 8,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  foodItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  portionSize: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  nutrientItem: {
    alignItems: "center",
    minWidth: (width - 80) / 4,
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  nutrientLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
});

export default NutritionPopup;
