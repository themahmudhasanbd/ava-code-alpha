import * as React from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface ProgressProps {
  value?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
}

export function Progress({
  value = 0,
  max = 100,
  style,
  indicatorStyle,
}: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <View style={[styles.track, style]}>
      <View
        style={[
          styles.indicator,
          { width: `${percentage}%` },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: "100%",
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: "rgba(66, 64, 225, 0.2)",
  },
  indicator: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
  },
});
