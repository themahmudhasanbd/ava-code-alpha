import * as React from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  style,
}: SwitchProps) {
  const animatedValue = React.useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: checked ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [checked, animatedValue]);

  const toggle = () => {
    if (disabled) return;

    onCheckedChange(!checked);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggle}
      disabled={disabled}
      style={[
        styles.track,
        checked ? styles.trackChecked : styles.trackUnchecked,
        disabled && styles.trackDisabled,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  trackChecked: {
    backgroundColor: COLORS.primary,
  },
  trackUnchecked: {
    backgroundColor: COLORS.input,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
