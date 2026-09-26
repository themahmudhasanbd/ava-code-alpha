import * as React from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { COLORS } from "@/theme/colors";

export interface LabelProps extends TextProps {}

export const Label = React.forwardRef<Text, LabelProps>(
  ({ style, children, ...props }, ref) => {
    return (
      <Text ref={ref} style={[styles.label, style]} {...props}>
        {children}
      </Text>
    );
  }
);

Label.displayName = "Label";

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
});
