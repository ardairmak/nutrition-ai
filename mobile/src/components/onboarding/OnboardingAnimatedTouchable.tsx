import React, { useRef, useState } from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";

interface AnimatedTouchableProps extends TouchableOpacityProps {
  scaleValue?: number; // How much to scale down when pressed (0.95 = 95% of original size)
  scaleDuration?: number; // Animation duration in ms
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  scaleValue = 0.96,
  scaleDuration = 100,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.timing(scaleAnim, {
      toValue: scaleValue,
      duration: scaleDuration,
      useNativeDriver: true,
    }).start();

    if (onPressIn) {
      onPressIn(e);
    }
  };

  const handlePressOut = (e: any) => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: scaleDuration,
      useNativeDriver: true,
    }).start();

    if (onPressOut) {
      onPressOut(e);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
