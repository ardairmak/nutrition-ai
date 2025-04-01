import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

const { width } = Dimensions.get("window");

export function OnboardingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome to Food Recognition</Text>
        <Text style={styles.subtitle}>
          Let's set up your profile to provide personalized nutrition
          recommendations.
        </Text>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Basic Information</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Health Statistics</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Dietary Preferences</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Goals Setting</Text>
          </View>
        </View>

        <Text style={styles.note}>
          You can always change your profile settings later.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("OnboardingName")}
        >
          <Text style={styles.buttonText}>Let's Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
    lineHeight: 22,
  },
  stepsContainer: {
    width: "100%",
    marginBottom: 40,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  stepText: {
    fontSize: 16,
    color: "#333",
  },
  note: {
    fontSize: 14,
    color: "#888",
    marginBottom: 30,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: "#888",
    fontSize: 16,
  },
});
