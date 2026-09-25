import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionContextType {
  value?: string | string[];
  onValueChange: (itemValue: string) => void;
  type?: "single" | "multiple";
  collapsible?: boolean;
}

const AccordionContext = React.createContext<AccordionContextType>({
  value: undefined,
  onValueChange: () => {},
  type: "single",
  collapsible: true,
});

interface AccordionItemContextType {
  value: string;
  isOpen: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextType>({
  value: "",
  isOpen: false,
});

export interface AccordionProps {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: any) => void;
  collapsible?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Accordion({
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = true,
  style,
  children,
}: AccordionProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[]>(
    defaultValue ?? (type === "multiple" ? [] : "")
  );

  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (itemValue: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === "single") {
      const next = activeValue === itemValue ? (collapsible ? "" : itemValue) : itemValue;
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    } else {
      const currentList = Array.isArray(activeValue) ? activeValue : [];
      const exists = currentList.includes(itemValue);
      const next = exists
        ? currentList.filter((v) => v !== itemValue)
        : [...currentList, itemValue];
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    }
  };

  return (
    <AccordionContext.Provider
      value={{
        value: activeValue,
        onValueChange: handleValueChange,
        type,
        collapsible,
      }}
    >
      <View style={[styles.accordion, style]}>{children}</View>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  value: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionItem({ value, style, children }: AccordionItemProps) {
  const { value: activeValue, type } = React.useContext(AccordionContext);
  const isOpen =
    type === "multiple" && Array.isArray(activeValue)
      ? activeValue.includes(value)
      : activeValue === value;

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <View style={[styles.item, style]}>{children}</View>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AccordionTrigger({ style, textStyle, children }: AccordionTriggerProps) {
  const { onValueChange } = React.useContext(AccordionContext);
  const { value, isOpen } = React.useContext(AccordionItemContext);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.trigger, style]}
      onPress={() => onValueChange(value)}
    >
      {typeof children === "string" ? (
        <Text style={[styles.triggerText, textStyle]}>{children}</Text>
      ) : (
        <View style={styles.triggerChild}>{children}</View>
      )}
      <View
        style={{
          transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
        }}
      >
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export interface AccordionContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionContent({ style, children }: AccordionContentProps) {
  const { isOpen } = React.useContext(AccordionItemContext);

  if (!isOpen) return null;

  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  accordion: {
    width: "100%",
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  triggerChild: {
    flex: 1,
  },
  content: {
    paddingBottom: 16,
    paddingTop: 0,
  },
});
