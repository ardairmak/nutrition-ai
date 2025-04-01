import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";

export function OnboardingNameScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Please enter both first and last name");
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile with name
      const response = await userService.updateProfile({
        firstName,
        lastName,
      });

      if (response.success) {
        // Update the user context with the new name
        setUser({
          ...user!,
          firstName,
          lastName,
        });

        // Move to next step
        navigation.navigate("OnboardingStats");
      } else {
        Alert.alert("Error", response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Tell us your name</Text>
            <Text style={styles.subtitle}>
              We'll use this to personalize your experience
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => navigation.navigate("OnboardingStats")}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextButton,
                (!firstName || !lastName) && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={isLoading || !firstName || !lastName}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: "#888",
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#A8C7FA",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
