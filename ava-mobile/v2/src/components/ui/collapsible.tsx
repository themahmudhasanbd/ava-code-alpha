import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
  type TouchableOpacityProps,
  type ViewProps,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export interface CollapsibleProps extends ViewProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  style,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: setOpen }}>
      <View style={[styles.container, style]} {...props}>
        {children}
      </View>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleTriggerProps extends TouchableOpacityProps {
  children: ReactNode;
}

export function CollapsibleTrigger({
  children,
  onPress,
  style,
  ...props
}: CollapsibleTriggerProps) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) return null;

  const handlePress = (e: any) => {
    ctx.onOpenChange(!ctx.open);
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.trigger, style]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

export interface CollapsibleContentProps extends ViewProps {
  children: ReactNode;
}

export function CollapsibleContent({
  children,
  style,
  ...props
}: CollapsibleContentProps) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx || !ctx.open) return null;

  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  trigger: {
    width: "100%",
  },
  content: {
    width: "100%",
    overflow: "hidden",
  },
});
