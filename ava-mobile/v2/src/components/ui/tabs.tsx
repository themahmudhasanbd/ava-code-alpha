import * as React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/theme/colors";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  style,
}: {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View style={[styles.tabs, style]}>{children}</View>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.tabsList, style]}>{children}</View>;
}

export function TabsTrigger({
  value,
  children,
  style,
  textStyle,
}: {
  value: string;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;

  const isActive = ctx.value === value;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    ctx.onValueChange(value);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        styles.trigger,
        isActive && styles.triggerActive,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text
          style={[
            styles.triggerText,
            isActive && styles.triggerTextActive,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function TabsContent({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;

  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  tabs: {
    width: "100%",
  },
  tabsList: {
    flexDirection: "row",
    height: 40,
    backgroundColor: COLORS.muted,
    borderRadius: 12,
    padding: 3,
    alignItems: "center",
  },
  trigger: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  triggerActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  triggerTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  content: {
    marginTop: 8,
  },
});
