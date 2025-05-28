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

// Using the same activity levels as in the database schema and EditGoalsScreen
const ACTIVITY_LEVELS = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise",
    details: "Desk job, minimal physical activity",
    icon: "chair-rolling",
  },
  {
    value: "lightly_active",
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
    details: "Light workouts, walking, some sports",
    icon: "walk",
  },
  {
    value: "moderately_active",
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
    details: "Regular gym sessions, active lifestyle",
    icon: "run",
  },
  {
    value: "very_active",
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
    details: "Daily intense workouts, athletic training",
    icon: "dumbbell",
  },
  {
    value: "extremely_active",
    label: "Extremely Active",
    description: "Very hard exercise, physical job",
    details: "Professional athlete, manual labor job",
    icon: "trophy",
  },
];

export function ActivityLevelScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] =
    useState<string>("moderately_active");

  useEffect(() => {
    loadUserActivityLevel();
  }, []);

  const loadUserActivityLevel = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();

      if (response.success && response.user) {
        setSelectedLevel(response.user.activityLevel || "moderately_active");
      }
    } catch (error) {
      console.error("Error loading activity level:", error);
      Alert.alert("Error", "Failed to load activity level");
    } finally {
      setLoading(false);
    }
  };

  const saveActivityLevel = async () => {
    try {
      setSaving(true);
      const response = await userService.updateProfile({
        activityLevel: selectedLevel,
      });

      if (response.success) {
        Alert.alert("Success", "Activity level saved successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.error || "Failed to save activity level");
      }
    } catch (error) {
      console.error("Error saving activity level:", error);
      Alert.alert("Error", "Failed to save activity level");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading activity level...</Text>
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
        <Text style={styles.headerTitle}>Activity Level</Text>
        <TouchableOpacity onPress={saveActivityLevel} disabled={saving}>
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
          <Text style={styles.title}>How often do you workout?</Text>
          <Text style={styles.subtitle}>
            This helps us understand your activity level and calculate your
            daily calorie needs more accurately.
          </Text>

          <View style={styles.section}>
            <View style={styles.levelsContainer}>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.levelOption,
                    selectedLevel === level.value && styles.levelOptionSelected,
                  ]}
                  onPress={() => setSelectedLevel(level.value)}
                >
                  <View style={styles.levelHeader}>
                    <View style={styles.levelIconContainer}>
                      <Icon
                        name={level.icon}
                        size={24}
                        color={
                          selectedLevel === level.value ? "#FFFFFF" : "#666666"
                        }
                      />
                    </View>
                    <View style={styles.levelInfo}>
                      <Text
                        style={[
                          styles.levelLabel,
                          selectedLevel === level.value &&
                            styles.levelLabelSelected,
                        ]}
                      >
                        {level.label}
                      </Text>
                      <Text
                        style={[
                          styles.levelDescription,
                          selectedLevel === level.value &&
                            styles.levelDescriptionSelected,
                        ]}
                      >
                        {level.description}
                      </Text>
                    </View>
                    {selectedLevel === level.value && (
                      <Icon name="check-circle" size={24} color="#FFFFFF" />
                    )}
                  </View>

                  <View style={styles.levelDetails}>
                    <Text
                      style={[
                        styles.levelDetailsText,
                        selectedLevel === level.value &&
                          styles.levelDetailsTextSelected,
                      ]}
                    >
                      {level.details}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>Current Selection:</Text>
            <Text style={styles.selectedText}>
              {ACTIVITY_LEVELS.find((l) => l.value === selectedLevel)?.label}
            </Text>
            <Text style={styles.selectedDescription}>
              {
                ACTIVITY_LEVELS.find((l) => l.value === selectedLevel)
                  ?.description
              }
            </Text>
          </View>
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
  levelsContainer: {
    gap: 16,
  },
  levelOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    backgroundColor: "#F8F8F8",
  },
  levelOptionSelected: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  levelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 2,
  },
  levelLabelSelected: {
    color: "#FFFFFF",
  },
  levelDescription: {
    fontSize: 14,
    color: "#666666",
  },
  levelDescriptionSelected: {
    color: "#FFFFFF",
  },
  levelDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  levelDetailsText: {
    fontSize: 13,
    color: "#888888",
  },
  levelDetailsTextSelected: {
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
  selectedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  selectedDescription: {
    fontSize: 14,
    color: "#666666",
  },
});
