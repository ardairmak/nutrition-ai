import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import { OnboardingStyles } from "../components/onboarding/OnboardingConstants";

// Common food allergies and dietary restrictions
const COMMON_ALLERGIES = [
  "Nuts",
  "Peanuts",
  "Tree Nuts",
  "Shellfish",
  "Fish",
  "Eggs",
  "Dairy",
  "Soy",
  "Wheat",
  "Gluten",
  "Sesame",
  "Sulfites",
];

export function AllergiesScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");

  useEffect(() => {
    loadUserAllergies();
  }, []);

  const loadUserAllergies = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();

      if (response.success && response.user) {
        setSelectedAllergies(response.user.allergies || []);
      }
    } catch (error) {
      console.error("Error loading allergies:", error);
      Alert.alert("Error", "Failed to load allergies");
    } finally {
      setLoading(false);
    }
  };

  const saveAllergies = async () => {
    try {
      setSaving(true);
      const response = await userService.updateProfile({
        allergies: selectedAllergies,
      });

      if (response.success) {
        Alert.alert("Success", "Allergies saved successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.error || "Failed to save allergies");
      }
    } catch (error) {
      console.error("Error saving allergies:", error);
      Alert.alert("Error", "Failed to save allergies");
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addCustomAllergy = () => {
    const trimmedAllergy = customAllergy.trim();
    if (trimmedAllergy && !selectedAllergies.includes(trimmedAllergy)) {
      setSelectedAllergies((prev) => [...prev, trimmedAllergy]);
      setCustomAllergy("");
    }
  };

  const removeCustomAllergy = (allergy: string) => {
    setSelectedAllergies((prev) => prev.filter((a) => a !== allergy));
  };

  // Separate common allergies from custom ones
  const commonSelectedAllergies = selectedAllergies.filter((allergy) =>
    COMMON_ALLERGIES.includes(allergy)
  );
  const customSelectedAllergies = selectedAllergies.filter(
    (allergy) => !COMMON_ALLERGIES.includes(allergy)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading allergies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Allergies & Restrictions</Text>
        <TouchableOpacity onPress={saveAllergies} disabled={saving}>
          {saving ? (
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
            <Text style={styles.title}>Food allergies & restrictions</Text>
            <Text style={styles.subtitle}>
              Select any food allergies or restrictions you have. This helps us
              provide safer food recommendations.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Common Allergies</Text>
              <View style={styles.optionsContainer}>
                {COMMON_ALLERGIES.map((allergy) => (
                  <TouchableOpacity
                    key={allergy}
                    style={[
                      styles.optionCard,
                      selectedAllergies.includes(allergy) &&
                        styles.selectedCard,
                    ]}
                    onPress={() => toggleAllergy(allergy)}
                  >
                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.optionText,
                          selectedAllergies.includes(allergy) &&
                            styles.selectedText,
                        ]}
                      >
                        {allergy}
                      </Text>
                    </View>
                    {selectedAllergies.includes(allergy) && (
                      <Icon name="alert-circle" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Custom Allergy</Text>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter a custom allergy or restriction..."
                  value={customAllergy}
                  onChangeText={setCustomAllergy}
                  onSubmitEditing={addCustomAllergy}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !customAllergy.trim() && styles.addButtonDisabled,
                  ]}
                  onPress={addCustomAllergy}
                  disabled={!customAllergy.trim()}
                >
                  <Icon
                    name="plus"
                    size={20}
                    color={customAllergy.trim() ? "#FFFFFF" : "#999999"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {customSelectedAllergies.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Custom Allergies</Text>
                <View style={styles.customAllergiesContainer}>
                  {customSelectedAllergies.map((allergy) => (
                    <View key={allergy} style={styles.customAllergyChip}>
                      <Text style={styles.customAllergyText}>{allergy}</Text>
                      <TouchableOpacity
                        onPress={() => removeCustomAllergy(allergy)}
                      >
                        <Icon name="close" size={16} color="#666666" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedAllergies.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedTitle}>
                  Your Allergies & Restrictions:
                </Text>
                <Text style={styles.selectedSummary}>
                  {selectedAllergies.join(", ")}
                </Text>
                <Text style={styles.selectedNote}>
                  We'll help you avoid these ingredients when analyzing your
                  food.
                </Text>
              </View>
            )}

            {selectedAllergies.length === 0 && (
              <View style={styles.noAllergiesContainer}>
                <Icon name="check-circle" size={48} color="#333333" />
                <Text style={styles.noAllergiesTitle}>
                  No Allergies Selected
                </Text>
                <Text style={styles.noAllergiesText}>
                  Great! You haven't selected any food allergies or
                  restrictions. You can always update this later if needed.
                </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "left",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: "left",
    color: "#666",
    fontWeight: "400",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  selectedCard: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  selectedText: {
    color: "#FFFFFF",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  customInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8F8F8",
    color: "#333333",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#EEEEEE",
  },
  customAllergiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  customAllergyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 8,
  },
  customAllergyText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  selectedContainer: {
    marginTop: 10,
    padding: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  selectedSummary: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 8,
  },
  selectedNote: {
    fontSize: 13,
    color: "#888888",
    fontStyle: "italic",
  },
  noAllergiesContainer: {
    marginTop: 10,
    padding: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    alignItems: "center",
  },
  noAllergiesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginTop: 12,
    marginBottom: 8,
  },
  noAllergiesText: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
});
