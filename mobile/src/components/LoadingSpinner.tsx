import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  message?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  color = "#000000",
  message,
  overlay = false,
}) => {
  const containerStyle = overlay ? styles.overlayContainer : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
});
