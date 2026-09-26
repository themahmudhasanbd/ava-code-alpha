import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { Check, ChevronRight, Circle } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface MenubarContextType {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
}

const MenubarContext = React.createContext<MenubarContextType>({
  activeMenu: null,
  setActiveMenu: () => {},
});

export interface MenubarProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Menubar({ style, children }: MenubarProps) {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <View style={[styles.menubar, style]}>{children}</View>
    </MenubarContext.Provider>
  );
}

export function MenubarMenu({
  value,
  children,
}: {
  value?: string;
  children: React.ReactNode;
}) {
  const generatedId = React.useId();
  const id = value || generatedId;

  return (
    <MenubarItemContext.Provider value={{ id }}>
      {children}
    </MenubarItemContext.Provider>
  );
}

const MenubarItemContext = React.createContext<{ id: string }>({ id: "" });

export function MenubarTrigger({
  style,
  textStyle,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const { id } = React.useContext(MenubarItemContext);
  const { activeMenu, setActiveMenu } = React.useContext(MenubarContext);
  const isActive = activeMenu === id;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setActiveMenu(isActive ? null : id)}
      style={[
        styles.trigger,
        isActive && styles.activeTrigger,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.triggerText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function MenubarContent({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { id } = React.useContext(MenubarItemContext);
  const { activeMenu, setActiveMenu } = React.useContext(MenubarContext);
  const isOpen = activeMenu === id;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setActiveMenu(null)}
    >
      <TouchableWithoutFeedback onPress={() => setActiveMenu(null)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.content, style]}>{children}</View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function MenubarItem({
  onSelect,
  disabled = false,
  style,
  textStyle,
  children,
}: {
  onSelect?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const { setActiveMenu } = React.useContext(MenubarContext);

  const handlePress = () => {
    if (disabled) return;
    setActiveMenu(null);
    onSelect?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      style={[styles.item, disabled && styles.disabled, style]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.itemText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function MenubarSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.separator, style]} />;
}

export function MenubarGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MenubarPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MenubarRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MenubarSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MenubarShortcut({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.shortcut, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  menubar: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    padding: 3,
    gap: 2,
  },
  trigger: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeTrigger: {
    backgroundColor: COLORS.secondary,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    minWidth: 180,
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
  itemText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  shortcut: {
    marginLeft: "auto",
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  disabled: {
    opacity: 0.5,
  },
});
