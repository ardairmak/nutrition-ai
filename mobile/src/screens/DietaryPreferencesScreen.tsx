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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import { OnboardingStyles } from "../components/onboarding/OnboardingConstants";

// Using the same dietary preferences as in the onboarding
const DIETARY_PREFERENCES = [
  {
    id: "standard",
    title: "Classic",
    description: "Regular balanced diet with all food groups",
  },
  {
    id: "vegetarian",
    title: "Vegetarian",
    description: "Plant-based diet that excludes meat",
  },
  {
    id: "vegan",
    title: "Vegan",
    description: "Plant-based diet with no animal products",
  },
  {
    id: "pescatarian",
    title: "Pescatarian",
    description: "Plant-based with fish and seafood included",
  },
];

export function DietaryPreferencesScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();

      if (response.success && response.user) {
        setSelectedPreferences(response.user.dietaryPreferences || []);
      }
    } catch (error) {
      console.error("Error loading dietary preferences:", error);
      Alert.alert("Error", "Failed to load dietary preferences");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await userService.updateProfile({
        dietaryPreferences: selectedPreferences,
      });

      if (response.success) {
        Alert.alert("Success", "Dietary preferences saved successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving dietary preferences:", error);
      Alert.alert("Error", "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (preference: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(preference)
        ? prev.filter((p) => p !== preference)
        : [...prev, preference]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
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
        <Text style={styles.headerTitle}>Dietary Preferences</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>What's your diet preference?</Text>
          <Text style={styles.subtitle}>
            We'll customize your meal recommendations accordingly
          </Text>

          <View style={styles.section}>
            <View style={styles.optionsContainer}>
              {DIETARY_PREFERENCES.map((preference) => (
                <TouchableOpacity
                  key={preference.id}
                  style={[
                    styles.optionCard,
                    selectedPreferences.includes(preference.id) &&
                      styles.selectedCard,
                  ]}
                  onPress={() => togglePreference(preference.id)}
                >
                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.optionTitle,
                        selectedPreferences.includes(preference.id) &&
                          styles.selectedText,
                      ]}
                    >
                      {preference.title}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        selectedPreferences.includes(preference.id) &&
                          styles.selectedText,
                      ]}
                    >
                      {preference.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {selectedPreferences.length > 0 && (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedTitle}>Selected Preferences:</Text>
              <Text style={styles.selectedSummary}>
                {selectedPreferences
                  .map(
                    (id) => DIETARY_PREFERENCES.find((p) => p.id === id)?.title
                  )
                  .join(", ")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
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
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333333",
  },
  optionDescription: {
    fontSize: 14,
    color: "#666666",
  },
  selectedText: {
    color: "#FFFFFF",
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
  },
});
