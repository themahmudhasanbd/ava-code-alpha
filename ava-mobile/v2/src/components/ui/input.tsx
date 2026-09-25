import * as React from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { COLORS } from "@/theme/colors";

export interface InputProps extends TextInputProps {}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ style, placeholderTextColor = COLORS.mutedForeground, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.foreground,
  },
});
