import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface OnboardingDummyContentProps {
  onDataChange: (data: any) => void;
  contentType?: string;
}

export function OnboardingDummyContent({
  onDataChange,
  contentType = "generic",
}: OnboardingDummyContentProps) {
  // Set some dummy data when the component mounts
  useEffect(() => {
    // Default dummy data for this component
    const dummyData = {
      completed: true,
      contentType,
    };

    // Send the data
    onDataChange(dummyData);
  }, [onDataChange, contentType]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content Coming Soon</Text>
      <Text style={styles.subtitle}>
        This is a placeholder for the {contentType} content.
      </Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          This page is under construction.
        </Text>
        <Text style={styles.emoji}>🚧</Text>
      </View>

      <Text style={styles.helperText}>
        You can continue by clicking the Next button below.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 40,
    textAlign: "center",
  },
  placeholder: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  placeholderText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  emoji: {
    fontSize: 40,
    marginVertical: 10,
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
