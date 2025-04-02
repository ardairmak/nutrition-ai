import React, { useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY } from "../constants";

export function OnboardingNameScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("OnboardingNameScreen - Current user data:", {
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      provider: user?.provider,
    });

    // Debug token availability
    const checkToken = async () => {
      try {
        console.log("Checking all AsyncStorage keys...");
        const allKeys = await AsyncStorage.getAllKeys();
        console.log("Available keys:", allKeys);

        // Check if we can get a token via userService
        const token = await userService.getUserToken();
        console.log(`Token available via userService: ${!!token}`);

        // Look for user-specific token
        if (user?.email) {
          const userKey = `@auth_token_${user.email.toLowerCase()}`;
          const userToken = await AsyncStorage.getItem(userKey);
          console.log(`User-specific token (${userKey}): ${!!userToken}`);
        }

        // Check generic token
        const genericToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        console.log(`Generic token: ${!!genericToken}`);
      } catch (error) {
        console.error("Error checking token:", error);
      }
    };

    checkToken();
  }, [user]);

  const handleComplete = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Please enter both your first and last name");
      return;
    }

    setIsLoading(true);

    try {
      // Update profile with names but don't mark as complete yet
      const response = await userService.updateProfile({
        firstName,
        lastName,
        // We removed profileSetupComplete: true to continue the onboarding flow
      });

      if (response.success) {
        console.log("Names updated successfully, continuing to stats screen");
        // Navigate to the next onboarding screen instead of completing
        navigation.navigate("OnboardingStats");
      } else {
        Alert.alert("Error", response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Name</Text>
            <Text style={styles.subtitle}>Let us know what to call you.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                (!firstName || !lastName) && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!firstName || !lastName || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Next</Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
  },
  button: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A8C7FA",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
