import * as React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export function Separator({
  orientation = "horizontal",
  style,
}: {
  orientation?: "horizontal" | "vertical";
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: "100%",
    backgroundColor: COLORS.border,
  },
  vertical: {
    width: 1,
    height: "100%",
    backgroundColor: COLORS.border,
  },
});
