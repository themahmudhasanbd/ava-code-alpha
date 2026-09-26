import * as React from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { COLORS } from "@/theme/colors";

export interface TextareaProps extends TextInputProps {}

export const Textarea = React.forwardRef<TextInput, TextareaProps>(
  ({ style, placeholderTextColor = COLORS.mutedForeground, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        multiline
        style={[styles.textarea, style]}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

const styles = StyleSheet.create({
  textarea: {
    minHeight: 80,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
    textAlignVertical: "top",
  },
});
