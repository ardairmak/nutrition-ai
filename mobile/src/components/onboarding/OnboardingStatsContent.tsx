import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../contexts/AuthContext";
import { OnboardingStyles } from "./OnboardingConstants";

type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lb";

type Height = { cm: number } | { ft: number; in: number };
type Weight = { kg: number } | { lb: number };

interface OnboardingStatsContentProps {
  onDataChange: (data: any) => void;
  initialData?: any;
}

const OnboardingStatsContent: React.FC<OnboardingStatsContentProps> = ({
  onDataChange,
  initialData = {},
}) => {
  const { user } = useAuth();

  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  // For metric system - using strings for picker compatibility
  const [heightCm, setHeightCm] = useState(String(initialData.height || 170));
  const [weightKg, setWeightKg] = useState(String(initialData.weight || 70));

  // For imperial system - using strings for picker compatibility
  const [heightFt, setHeightFt] = useState(
    String(Math.floor((initialData.height || 170) / 30.48))
  );
  const [heightIn, setHeightIn] = useState(
    String(Math.round(((initialData.height || 170) / 2.54) % 12))
  );
  const [weightLbs, setWeightLbs] = useState(
    String(Math.round((initialData.weight || 70) * 2.20462))
  );

  // Generate arrays for pickers as strings
  const cmArray = Array.from({ length: 221 }, (_, i) => String(i + 100));
  const kgArray = Array.from({ length: 151 }, (_, i) => String(i + 30));
  const ftArray = Array.from({ length: 8 }, (_, i) => String(i + 1));
  const inArray = Array.from({ length: 12 }, (_, i) => String(i));
  const lbsArray = Array.from({ length: 301 }, (_, i) => String(i + 66));

  useEffect(() => {
    if (unit === "metric") {
      onDataChange({
        height: parseInt(heightCm),
        weight: parseInt(weightKg),
        unitPreference: "metric",
      });
    } else {
      const heightInCm = parseInt(heightFt) * 30.48 + parseInt(heightIn) * 2.54;
      const weightInKg = parseInt(weightLbs) / 2.20462;
      onDataChange({
        height: Math.round(heightInCm),
        weight: Math.round(weightInKg),
        unitPreference: "imperial",
      });
    }
  }, [heightCm, weightKg, heightFt, heightIn, weightLbs, unit]);

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>Height & weight</Text>
      <Text style={OnboardingStyles.subtitle}>
        This will be used to calibrate your custom plan.
      </Text>

      <View style={styles.unitToggleContainer}>
        <Text
          style={[
            styles.unitLabel,
            unit === "imperial" && styles.activeUnitLabel,
          ]}
        >
          Imperial
        </Text>
        <Switch
          value={unit === "metric"}
          onValueChange={(value) => setUnit(value ? "metric" : "imperial")}
          trackColor={{ false: "#f4f3f4", true: "#f4f3f4" }}
          thumbColor={"#000"}
          ios_backgroundColor="#f4f3f4"
          style={styles.switch}
        />
        <Text
          style={[
            styles.unitLabel,
            unit === "metric" && styles.activeUnitLabel,
          ]}
        >
          Metric
        </Text>
      </View>

      <View style={styles.pickerHeaderContainer}>
        <Text style={styles.pickerHeaderText}>Height</Text>
        <Text style={styles.pickerHeaderText}>Weight</Text>
      </View>

      {unit === "metric" ? (
        <View style={styles.pickerRowContainer}>
          <View style={styles.pickerItem}>
            <Picker
              selectedValue={heightCm}
              onValueChange={(value: string) => setHeightCm(value)}
              style={styles.picker}
              itemStyle={styles.pickerItemText}
            >
              {cmArray.map((cm) => (
                <Picker.Item
                  key={`cm-${cm}`}
                  label={`${cm} cm`}
                  value={cm}
                  color="#333"
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerItem}>
            <Picker
              selectedValue={weightKg}
              onValueChange={(value: string) => setWeightKg(value)}
              style={styles.picker}
              itemStyle={styles.pickerItemText}
            >
              {kgArray.map((kg) => (
                <Picker.Item
                  key={`kg-${kg}`}
                  label={`${kg} kg`}
                  value={kg}
                  color="#333"
                />
              ))}
            </Picker>
          </View>
        </View>
      ) : (
        <View style={styles.pickerRowContainer}>
          {/* Imperial height with narrower pickers */}
          <View style={styles.imperialHeightContainer}>
            <View style={styles.imperialPickerItem}>
              <Picker
                style={styles.imperialPicker}
                itemStyle={styles.imperialPickerItemText}
                selectedValue={heightFt}
                onValueChange={(itemValue) => setHeightFt(itemValue)}
              >
                {Array.from({ length: 8 }, (_, i) => i + 4).map((feet) => (
                  <Picker.Item
                    key={feet}
                    label={`${feet} ft`}
                    value={String(feet)}
                    color="#333"
                  />
                ))}
              </Picker>
            </View>
            <View style={styles.imperialPickerItem}>
              <Picker
                style={styles.imperialPicker}
                itemStyle={styles.imperialPickerItemText}
                selectedValue={heightIn}
                onValueChange={(itemValue) => setHeightIn(itemValue)}
              >
                {Array.from({ length: 12 }, (_, i) => i).map((inch) => (
                  <Picker.Item
                    key={inch}
                    label={`${inch} in`}
                    value={String(inch)}
                    color="#333"
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.pickerItem}>
            <Picker
              selectedValue={weightLbs}
              onValueChange={(value: string) => setWeightLbs(value)}
              style={styles.picker}
              itemStyle={styles.pickerItemText}
            >
              {lbsArray.map((lbs) => (
                <Picker.Item
                  key={`lbs-${lbs}`}
                  label={`${lbs} lb`}
                  value={lbs}
                  color="#333"
                />
              ))}
            </Picker>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  unitToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 60,
  },
  switch: {
    marginHorizontal: 10,
  },
  unitLabel: {
    fontSize: 18,
    color: "#ccc",
    fontWeight: "500",
  },
  activeUnitLabel: {
    color: "#000",
  },
  pickerHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  pickerHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    width: "48%",
  },
  pickerRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    marginHorizontal: 0,
    width: "100%",
  },
  pickerItem: {
    backgroundColor: "transparent",
    borderRadius: 14,
    width: "48%",
    height: 220,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 220,
  },
  pickerItemText: {
    fontSize: 15,
    color: "#333",
  },
  imperialHeightContainer: {
    flexDirection: "row",
    width: "48%",
    justifyContent: "space-between",
    paddingLeft: 0,
    marginLeft: 0,
  },
  imperialPickerItem: {
    backgroundColor: "transparent",
    borderRadius: 14,
    width: "48%",
    height: 220,
    overflow: "hidden",
  },
  imperialPickerItemText: {
    fontSize: 13,
    color: "#333",
  },
  imperialPicker: {
    width: "100%",
    height: 220,
    marginLeft: 0,
    paddingLeft: 0,
  },
});

export default OnboardingStatsContent;
