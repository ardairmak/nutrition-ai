import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { OnboardingStyles } from "./OnboardingConstants";
import { AnimatedTouchable } from "./OnboardingAnimatedTouchable";

export type Gender = "male" | "female" | "other";

interface OnboardingGenderContentProps {
  onDataChange: (data: { gender: Gender }) => void;
  initialData?: { gender?: Gender };
}

interface GenderOption {
  id: Gender;
  title: string;
}

export function OnboardingGenderContent({
  onDataChange,
  initialData = {},
}: OnboardingGenderContentProps) {
  // Initialize state with any previously selected value
  const [selectedGender, setSelectedGender] = useState<Gender | null>(
    initialData?.gender || null
  );

  const genderOptions: GenderOption[] = [
    { id: "male", title: "Male" },
    { id: "female", title: "Female" },
    { id: "other", title: "Other" },
  ];

  // Send data to parent when selection changes
  useEffect(() => {
    if (selectedGender) {
      onDataChange({ gender: selectedGender });
    }
  }, [selectedGender, onDataChange]);

  const handleGenderSelect = (gender: Gender) => {
    setSelectedGender(gender);
  };

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>What's your gender?</Text>
      <Text style={OnboardingStyles.subtitle}>
        This helps us personalize your nutrition plan
      </Text>

      <View style={styles.optionsContainer}>
        {genderOptions.map((option) => (
          <AnimatedTouchable
            key={option.id}
            style={[
              styles.optionCard,
              selectedGender === option.id && styles.selectedCard,
            ]}
            onPress={() => handleGenderSelect(option.id)}
            scaleValue={0.95}
            scaleDuration={80}
          >
            <Text
              style={[
                styles.optionTitle,
                selectedGender === option.id && styles.selectedTitle,
              ]}
            >
              {option.title}
            </Text>
          </AnimatedTouchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    marginTop: 30,
    gap: 16,
  },
  optionCard: {
    padding: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCard: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
  },
  selectedTitle: {
    color: "#FFFFFF",
  },
});
