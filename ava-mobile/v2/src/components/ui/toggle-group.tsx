import React, { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Toggle } from "./toggle";

interface ToggleGroupContextValue {
  type: "single" | "multiple";
  value: string | string[];
  onValueChange: (val: any) => void;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

export function ToggleGroup({
  type = "single",
  value,
  onValueChange,
  size = "default",
  variant = "default",
  children,
  style,
}: {
  type?: "single" | "multiple";
  value: string | string[];
  onValueChange: (val: any) => void;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ToggleGroupContext.Provider
      value={{ type, value, onValueChange, size, variant }}
    >
      <View style={[styles.group, style]}>{children}</View>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({
  value,
  children,
  style,
}: {
  value: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(ToggleGroupContext);
  if (!ctx) return null;

  const isPressed = Array.isArray(ctx.value)
    ? ctx.value.includes(value)
    : ctx.value === value;

  const handlePress = (nextPressed: boolean) => {
    if (ctx.type === "single") {
      ctx.onValueChange(nextPressed ? value : "");
    } else {
      const arr = Array.isArray(ctx.value) ? [...ctx.value] : [];
      if (nextPressed) {
        ctx.onValueChange([...arr, value]);
      } else {
        ctx.onValueChange(arr.filter((v) => v !== value));
      }
    }
  };

  return (
    <Toggle
      pressed={isPressed}
      onPressedChange={handlePress}
      size={ctx.size}
      variant={ctx.variant}
      style={style}
    >
      {children}
    </Toggle>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
