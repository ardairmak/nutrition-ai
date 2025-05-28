import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { OnboardingStyles } from "./OnboardingConstants";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MaterialIcons as MaterialIconsType } from "@expo/vector-icons/build/Icons";
import { MaterialCommunityIcons as MaterialCommunityIconsType } from "@expo/vector-icons/build/Icons";
import { AnimatedTouchable } from "./OnboardingAnimatedTouchable";

export type DietType = "standard" | "vegetarian" | "vegan" | "pescatarian";

interface OnboardingDietContentProps {
  onDataChange: (data: { dietPreferences: DietType[] }) => void;
  initialData?: { dietPreferences?: DietType[] };
}

interface DietOption {
  id: DietType;
  title: string;
  description: string;
  iconType: "material" | "materialCommunity";
  iconName: string;
}

export function OnboardingDietContent({
  onDataChange,
  initialData = {},
}: OnboardingDietContentProps) {
  // Initialize with previously selected diet if available
  const [selectedDiet, setSelectedDiet] = useState<DietType | null>(
    initialData?.dietPreferences && initialData.dietPreferences.length > 0
      ? initialData.dietPreferences[0]
      : null
  );

  const diets: DietOption[] = [
    {
      id: "standard",
      title: "Classic",
      description: "Regular balanced diet with all food groups",
      iconType: "material",
      iconName: "restaurant",
    },
    {
      id: "vegetarian",
      title: "Vegetarian",
      description: "Plant-based diet that excludes meat",
      iconType: "materialCommunity",
      iconName: "food-apple",
    },
    {
      id: "vegan",
      title: "Vegan",
      description: "Plant-based diet with no animal products",
      iconType: "materialCommunity",
      iconName: "leaf",
    },
    {
      id: "pescatarian",
      title: "Pescatarian",
      description: "Plant-based with fish and seafood included",
      iconType: "materialCommunity",
      iconName: "fish",
    },
  ];

  useEffect(() => {
    if (selectedDiet) {
      onDataChange({ dietPreferences: [selectedDiet] });
    }
  }, [selectedDiet, onDataChange]);

  const handleSelectDiet = (diet: DietType) => {
    setSelectedDiet(diet);
  };

  const renderIcon = (diet: DietOption) => {
    if (diet.iconType === "material") {
      return (
        <MaterialIcons
          name={diet.iconName as keyof typeof MaterialIconsType.glyphMap}
          size={24}
          color={selectedDiet === diet.id ? "#FFFFFF" : "#000000"}
        />
      );
    } else {
      return (
        <MaterialCommunityIcons
          name={
            diet.iconName as keyof typeof MaterialCommunityIconsType.glyphMap
          }
          size={24}
          color={selectedDiet === diet.id ? "#FFFFFF" : "#000000"}
        />
      );
    }
  };

  return (
    <View style={[OnboardingStyles.container, { paddingHorizontal: 5 }]}>
      <Text style={OnboardingStyles.title}>What's your diet preference?</Text>
      <Text style={OnboardingStyles.subtitle}>
        We'll customize your meal recommendations accordingly
      </Text>

      <View style={styles.optionsContainer}>
        {diets.map((diet) => (
          <AnimatedTouchable
            key={diet.id}
            style={[
              styles.optionCard,
              selectedDiet === diet.id && styles.selectedCard,
            ]}
            onPress={() => handleSelectDiet(diet.id)}
            scaleValue={0.95}
            scaleDuration={80}
          >
            <View style={styles.iconContainer}>{renderIcon(diet)}</View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.optionTitle,
                  selectedDiet === diet.id && styles.selectedText,
                ]}
              >
                {diet.title}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedDiet === diet.id && styles.selectedText,
                ]}
              >
                {diet.description}
              </Text>
            </View>
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
  iconContainer: {
    marginRight: 16,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
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
});
