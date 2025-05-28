import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

interface OnboardingHeightWeightContentProps {
  onDataChange: (data: {
    height: { cm?: number; ft?: number; in?: number };
    weight: { kg?: number; lb?: number };
    units: { height: "metric" | "imperial"; weight: "metric" | "imperial" };
  }) => void;
}

interface HeightWeightData {
  height: string;
  weight: string;
}

export function OnboardingHeightWeightContent({
  onDataChange,
}: OnboardingHeightWeightContentProps) {
  const [heightWeightData, setHeightWeightData] = useState<HeightWeightData>({
    height: "",
    weight: "",
  });
  const [activeField, setActiveField] = useState<"height" | "weight" | null>(
    null
  );
  const [units, setUnits] = useState({
    height: "metric" as "metric" | "imperial",
    weight: "metric" as "metric" | "imperial",
  });

  useEffect(() => {
    const height = parseFloat(heightWeightData.height);
    const weight = parseFloat(heightWeightData.weight);

    if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
      // Convert data based on selected units
      const heightData =
        units.height === "metric"
          ? { cm: height }
          : { ft: Math.floor(height), in: Math.round((height % 1) * 12) };

      const weightData =
        units.weight === "metric" ? { kg: weight } : { lb: weight };

      onDataChange({
        height: heightData,
        weight: weightData,
        units: units,
      });
    }
  }, [heightWeightData, units, onDataChange]);

  const handleInputChange = (field: "height" | "weight", value: string) => {
    // Only allow numeric input with decimal point
    if (/^(\d*\.?\d{0,2})?$/.test(value)) {
      setHeightWeightData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const toggleHeightUnit = () => {
    setUnits((prev) => ({
      ...prev,
      height: prev.height === "metric" ? "imperial" : "metric",
    }));
  };

  const toggleWeightUnit = () => {
    setUnits((prev) => ({
      ...prev,
      weight: prev.weight === "metric" ? "imperial" : "metric",
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your height and weight?</Text>
      <Text style={styles.subtitle}>
        This helps us personalize your nutrition plan
      </Text>

      <View style={styles.inputsContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Height</Text>
          <View style={styles.unitToggleRow}>
            <View
              style={[
                styles.inputWrapper,
                activeField === "height" && styles.activeInput,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder={`Enter height ${
                  units.height === "metric" ? "(cm)" : "(ft)"
                }`}
                value={heightWeightData.height}
                onChangeText={(value) => handleInputChange("height", value)}
                keyboardType="numeric"
                onFocus={() => setActiveField("height")}
                onBlur={() => setActiveField(null)}
              />
              <Text style={styles.unitText}>
                {units.height === "metric" ? "cm" : "ft"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={toggleHeightUnit}
            >
              <Text style={styles.unitToggleText}>
                {units.height === "metric" ? "Use ft/in" : "Use cm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight</Text>
          <View style={styles.unitToggleRow}>
            <View
              style={[
                styles.inputWrapper,
                activeField === "weight" && styles.activeInput,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder={`Enter weight ${
                  units.weight === "metric" ? "(kg)" : "(lb)"
                }`}
                value={heightWeightData.weight}
                onChangeText={(value) => handleInputChange("weight", value)}
                keyboardType="numeric"
                onFocus={() => setActiveField("weight")}
                onBlur={() => setActiveField(null)}
              />
              <Text style={styles.unitText}>
                {units.weight === "metric" ? "kg" : "lb"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={toggleWeightUnit}
            >
              <Text style={styles.unitToggleText}>
                {units.weight === "metric" ? "Use lb" : "Use kg"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 40,
  },
  inputsContainer: {
    marginTop: 10,
    gap: 24,
  },
  inputGroup: {
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333333",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 16,
    height: 60,
    flex: 1,
  },
  unitToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  unitToggle: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  unitToggleText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  activeInput: {
    borderColor: "#007AFF",
    backgroundColor: "rgba(0, 122, 255, 0.05)",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 18,
  },
  unitText: {
    fontSize: 16,
    color: "#666666",
    marginLeft: 4,
  },
  imperialHeightContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "58%",
  },
  heightPickerImperial: {
    width: "45%",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    height: 220,
    overflow: "hidden",
  },
});
