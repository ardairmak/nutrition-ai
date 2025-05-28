import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { useAuth } from "../../contexts/AuthContext";
import { OnboardingStyles } from "./OnboardingConstants";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type OnboardingMotivationContentProps = {
  onDataChange: (data: { motivationType: string; speedValue: number }) => void;
};

export function OnboardingMotivationContent({
  onDataChange,
}: OnboardingMotivationContentProps) {
  const { user } = useAuth();
  const [speedValue, setSpeedValue] = useState(0.7);
  const [showRecommended, setShowRecommended] = useState(true);

  useEffect(() => {
    // Send data to parent when selection changes
    onDataChange({
      motivationType: speedValue <= 0.5 ? "consistent" : "fast",
      speedValue: speedValue,
    });
  }, [speedValue, onDataChange]);

  // Get appropriate icon based on speed value
  const getIconForSpeed = (position: "left" | "right") => {
    if (position === "left") {
      return "turtle";
    } else {
      return "rabbit";
    }
  };

  return (
    <View style={OnboardingStyles.container}>
      <Text style={styles.title}>How fast do you want to reach your goal?</Text>

      <Text style={styles.weightLabel}>Gain weight speed per week</Text>

      <Text style={styles.weightValue}>{speedValue.toFixed(1)} kg</Text>

      <View style={styles.sliderContainer}>
        <MaterialCommunityIcons
          name={getIconForSpeed("left")}
          size={40}
          color="#555555"
        />

        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={1.5}
          value={speedValue}
          onValueChange={setSpeedValue}
          minimumTrackTintColor="#000000"
          maximumTrackTintColor="#EEEEEE"
          thumbTintColor="#FFFFFF"
          step={0.1}
        />

        <MaterialCommunityIcons
          name={getIconForSpeed("right")}
          size={40}
          color="#555555"
        />
      </View>

      <View style={styles.markerContainer}>
        <Text style={styles.markerText}>0.1 kg</Text>
        <Text style={styles.markerText}>0.8 kg</Text>
        <Text style={styles.markerText}>1.5 kg</Text>
      </View>

      {showRecommended && (
        <View style={styles.recommendedContainer}>
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 50,
    marginTop: 20,
    textAlign: "center",
    color: "#000000",
  },
  weightLabel: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    color: "#666666",
  },
  weightValue: {
    fontSize: 42,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000000",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    width: "100%",
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  markerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  markerText: {
    fontSize: 16,
    color: "#666666",
  },
  recommendedContainer: {
    backgroundColor: "#F0F9F0",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: "center",
  },
  recommendedText: {
    fontSize: 18,
    color: "#666666",
    textAlign: "center",
  },
});
