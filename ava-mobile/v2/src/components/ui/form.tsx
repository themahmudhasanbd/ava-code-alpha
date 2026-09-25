import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";
import { Label } from "@/components/ui/label";

interface FormItemContextValue {
  id: string;
  error?: string;
}

const FormItemContext = React.createContext<FormItemContextValue>({
  id: "",
});

export interface FormItemProps {
  error?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function FormItem({ error, style, children }: FormItemProps) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id, error }}>
      <View style={[styles.item, style]}>{children}</View>
    </FormItemContext.Provider>
  );
}

export interface FormLabelProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function FormLabel({ style, children }: FormLabelProps) {
  const { error } = React.useContext(FormItemContext);
  return (
    <Label style={[styles.label, !!error && styles.labelError, style]}>
      {children}
    </Label>
  );
}

export interface FormControlProps {
  children: React.ReactNode;
}

export function FormControl({ children }: FormControlProps) {
  return <>{children}</>;
}

export interface FormDescriptionProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function FormDescription({ style, children }: FormDescriptionProps) {
  return (
    <Text style={[styles.description, style]}>
      {children}
    </Text>
  );
}

export interface FormMessageProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function FormMessage({ style, children }: FormMessageProps) {
  const { error } = React.useContext(FormItemContext);
  const body = error ? String(error) : children;

  if (!body) return null;

  return (
    <Text style={[styles.message, style]}>
      {body}
    </Text>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  labelError: {
    color: COLORS.destructive,
  },
  description: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  message: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.destructive,
  },
});
