import * as React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { Check, ChevronRight } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface ContextMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ContextMenuContext = React.createContext<ContextMenuContextType>({
  open: false,
  setOpen: () => {},
});

export interface ContextMenuProps {
  children: React.ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <ContextMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function ContextMenuTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOpen } = React.useContext(ContextMenuContext);

  const handleLongPress = () => {
    setOpen(true);
  };

  if (React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onLongPress: handleLongPress,
    });
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onLongPress={handleLongPress}>
      {children}
    </TouchableOpacity>
  );
}

export function ContextMenuContent({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(ContextMenuContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.content, style]}>{children}</View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function ContextMenuItem({
  onSelect,
  inset,
  disabled = false,
  style,
  textStyle,
  children,
}: {
  onSelect?: () => void;
  inset?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const { setOpen } = React.useContext(ContextMenuContext);

  const handlePress = () => {
    if (disabled) return;
    setOpen(false);
    onSelect?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.item,
        inset && styles.itemInset,
        disabled && styles.disabled,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.itemText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function ContextMenuSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.separator, style]} />;
}

export function ContextMenuLabel({
  inset,
  style,
  children,
}: {
  inset?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return (
    <Text style={[styles.label, inset && styles.labelInset, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    minWidth: 200,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  itemInset: {
    paddingLeft: 28,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelInset: {
    paddingLeft: 28,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});
