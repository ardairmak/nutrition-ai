import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { FoodItem } from "../services/imageService";

interface EditFoodItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (items: FoodItem[]) => void;
  foodItems: FoodItem[];
}

interface FoodItemEditable extends FoodItem {
  [key: string]: any;
}

const EditFoodItemModal: React.FC<EditFoodItemModalProps> = ({
  visible,
  onClose,
  onSave,
  foodItems,
}) => {
  const [editedItems, setEditedItems] = useState<FoodItemEditable[]>([]);

  // Reset edited items when modal opens with new data
  useEffect(() => {
    if (visible && foodItems) {
      setEditedItems(
        JSON.parse(JSON.stringify(foodItems)) as FoodItemEditable[]
      ); // Deep copy
    }
  }, [visible, foodItems]);

  const updateItem = (
    index: number,
    field: keyof FoodItem,
    value: string | number
  ) => {
    const newItems = [...editedItems];
    const item = { ...newItems[index] };

    // Handle numeric fields
    if (field === "protein" || field === "carbs" || field === "fat") {
      // Convert to number, default to 0 if NaN
      const numericValue = parseFloat(value as string);
      item[field] = isNaN(numericValue) ? 0 : numericValue;
      // Auto-calculate calories
      item.calories =
        Number(item.protein) * 4 +
        Number(item.carbs) * 4 +
        Number(item.fat) * 9;
    } else if (field === "name" || field === "portionSize") {
      // String fields
      item[field] = value as string;
    }

    newItems[index] = item;
    setEditedItems(newItems);
  };

  const addNewItem = () => {
    setEditedItems([
      ...editedItems,
      {
        name: "New Item",
        portionSize: "1 serving",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = [...editedItems];
    newItems.splice(index, 1);
    setEditedItems(newItems);
  };

  const handleSave = () => {
    // Calculate new total calories
    const updatedItems = editedItems.map((item) => ({
      ...item,
      // Ensure all numeric values are numbers, not strings
      calories: Number(item.calories),
      protein: Number(item.protein),
      carbs: Number(item.carbs),
      fat: Number(item.fat),
    }));

    onSave(updatedItems);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Edit Food Analysis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {editedItems.map((item, index) => (
              <View key={index} style={styles.foodItemContainer}>
                <View style={styles.foodItemHeader}>
                  <Text style={styles.foodItemNumber}>Item {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.removeButton}
                  >
                    <Icon name="delete-outline" size={24} color="#FF5252" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Food Name:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.name}
                    onChangeText={(text) => updateItem(index, "name", text)}
                    placeholder="Enter food name"
                  />
                </View>

                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Portion Size:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.portionSize}
                    onChangeText={(text) =>
                      updateItem(index, "portionSize", text)
                    }
                    placeholder="e.g., 100g, 1 cup"
                  />
                </View>

                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionInput}>
                    <Text style={styles.nutritionLabel}>Calories (auto)</Text>
                    <TextInput
                      style={[
                        styles.numberInput,
                        { backgroundColor: "#f0f0f0", color: "#888" },
                      ]}
                      value={item.calories.toString()}
                      editable={false}
                      selectTextOnFocus={false}
                    />
                  </View>

                  <View style={styles.nutritionInput}>
                    <Text style={styles.nutritionLabel}>Protein (g)</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.protein.toString()}
                      onChangeText={(text) =>
                        updateItem(index, "protein", text)
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.nutritionInput}>
                    <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.carbs.toString()}
                      onChangeText={(text) => updateItem(index, "carbs", text)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.nutritionInput}>
                    <Text style={styles.nutritionLabel}>Fat (g)</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.fat.toString()}
                      onChangeText={(text) => updateItem(index, "fat", text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addItemButton} onPress={addNewItem}>
              <Icon name="plus-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.addItemText}>Add another food item</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 60,
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
  foodItemContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  foodItemNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  removeButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    width: 100,
    fontSize: 14,
    color: "#555",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  nutritionInput: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
    textAlign: "center",
  },
  numberInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    textAlign: "center",
    fontSize: 14,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginBottom: 24,
  },
  addItemText: {
    color: "#4CAF50",
    fontSize: 16,
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditFoodItemModal;
