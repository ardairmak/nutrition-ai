import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import DateTimePicker from "@react-native-community/datetimepicker";

export function OnboardingStatsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();

  // Format a date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Parse YYYY-MM-DD to Date
  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Initialize state with existing user data if available
  const [height, setHeight] = useState(
    user?.height ? user.height.toString() : ""
  );
  const [weight, setWeight] = useState(
    user?.weight ? user.weight.toString() : ""
  );
  const [gender, setGender] = useState(user?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "");
  const [birthDate, setBirthDate] = useState(
    user?.dateOfBirth ? parseDate(user.dateOfBirth) : new Date(2000, 0, 1)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load existing data from user profile
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Reload profile data to ensure we have the latest
        const profile = await userService.getProfile();
        if (profile.success && profile.user) {
          // Update state with existing values
          if (profile.user.height) setHeight(profile.user.height.toString());
          if (profile.user.weight) setWeight(profile.user.weight.toString());
          if (profile.user.gender) setGender(profile.user.gender);
          if (profile.user.dateOfBirth) {
            setDateOfBirth(profile.user.dateOfBirth);
            setBirthDate(parseDate(profile.user.dateOfBirth));
          }
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadProfileData();
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
      setDateOfBirth(formatDate(selectedDate));
    }
  };

  const handleComplete = async () => {
    if (!height || !weight || !dateOfBirth || !gender) {
      Alert.alert(
        "Missing Information",
        "Please fill in all fields to continue"
      );
      return;
    }

    // Validate inputs
    const numHeight = parseFloat(height);
    const numWeight = parseFloat(weight);

    if (isNaN(numHeight) || isNaN(numWeight)) {
      Alert.alert("Error", "Height and weight must be valid numbers");
      return;
    }

    // Simple date validation
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateOfBirth)) {
      Alert.alert(
        "Invalid Date",
        "Please enter date in YYYY-MM-DD format (e.g. 1990-01-31)"
      );
      return;
    }

    setIsLoading(true);

    try {
      // Update profile with stats
      const response = await userService.updateProfile({
        height: numHeight,
        weight: numWeight,
        gender,
        dateOfBirth,
      });

      if (response.success) {
        console.log("Stats updated successfully");

        // Update the local user object if needed
        if (response.user) {
          setUser({
            ...user!,
            height: numHeight,
            weight: numWeight,
            gender,
            dateOfBirth,
          });
        }

        // Navigate to next screen
        navigation.navigate("OnboardingDiet");
      } else {
        console.error("Failed to update stats:", response.error);
        Alert.alert(
          "Error",
          response.error || "Failed to save your information"
        );
      }
    } catch (error) {
      console.error("Error updating stats:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Your Health Stats</Text>
          <Text style={styles.subtitle}>
            Help us get to know you better so we can personalize your experience
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter your height"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "male" && styles.genderButtonSelected,
                ]}
                onPress={() => setGender("male")}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === "male" && styles.genderButtonTextSelected,
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "female" && styles.genderButtonSelected,
                ]}
                onPress={() => setGender("female")}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === "female" && styles.genderButtonTextSelected,
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === "other" && styles.genderButtonSelected,
                ]}
                onPress={() => setGender("other")}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === "other" && styles.genderButtonTextSelected,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter your weight"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Birthday</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={dateOfBirth ? styles.dateText : styles.datePlaceholder}
              >
                {dateOfBirth || "Select your date of birth"}
              </Text>
            </TouchableOpacity>

            {showDatePicker &&
              (Platform.OS === "ios" ? (
                <Modal
                  transparent={true}
                  animationType="slide"
                  visible={showDatePicker}
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.cancelButton}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.doneButton}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={birthDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!height || !weight || !dateOfBirth || !gender) &&
              styles.buttonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!height || !weight || !dateOfBirth || !gender || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
    color: "#000",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  genderButtonSelected: {
    backgroundColor: "#4285F4",
    borderColor: "#4285F4",
  },
  genderButtonText: {
    fontSize: 16,
    color: "#000",
  },
  genderButtonTextSelected: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancelButton: {
    fontSize: 16,
    color: "#999",
  },
  doneButton: {
    fontSize: 16,
    color: "#4285F4",
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  button: {
    backgroundColor: "#4285F4",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A4C2F4",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
