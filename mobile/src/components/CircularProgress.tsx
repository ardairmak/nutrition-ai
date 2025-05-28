import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CircularProgressProps {
  percentage: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  textColor?: string;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  color = "#007AFF",
  size = 120,
  strokeWidth = 10,
  textColor = "#1C1C1E",
  showPercentage = true,
  children,
}) => {
  // Ensure percentage is between 0 and 100 for visual progress
  const validPercentage = Math.min(Math.max(percentage, 0), 100);

  // Calculate radius (half of size minus stroke width)
  const radius = (size - strokeWidth) / 2;

  // Calculate circumference
  const circumference = radius * 2 * Math.PI;

  // Calculate stroke dash offset
  const strokeDashoffset =
    circumference - (validPercentage / 100) * circumference;

  // Center position
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E9E9EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          // Start from the top (rotate -90 degrees)
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>

      {showPercentage ? (
        <View style={styles.textContainer}>
          <Text style={[styles.percentageText, { color: textColor }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      ) : children ? (
        <View style={styles.textContainer}>{children}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CircularProgress;
